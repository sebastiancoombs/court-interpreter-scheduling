<?php defined('BASEPATH') or exit('No direct script access allowed');

/* ----------------------------------------------------------------------------
 * SMS messages — Twilio-ready outbound layer for Easy!Appointments.
 *
 * Mirrors the shape of application/libraries/Email_messages.php so the
 * Notifications dispatcher can call SMS the same way it calls email.
 *
 * SMS sending is GATED by env. Until TWILIO_ENABLED=true and TWILIO_*
 * creds are present, every "send" is logged via error_log() and not
 * actually transmitted. This keeps the bid demo cohesive end-to-end
 * without burning credentials, and flips to real sending with one env.
 *
 * Required env (all optional until you flip the toggle):
 *
 *   TWILIO_ENABLED        "true" | "false"  — master toggle (default: false)
 *   TWILIO_ACCOUNT_SID    starts with "AC..."
 *   TWILIO_AUTH_TOKEN     32-char auth token
 *   TWILIO_FROM_NUMBER    E.164 ("+14155552671")
 *   TWILIO_API_BASE_URL   override for tests/mocks (default: api.twilio.com)
 *
 * Wire from Notifications: see Notifications::notify_appointment_*().
 * ---------------------------------------------------------------------------- */

class Sms_messages
{
    /** @var EA_Controller|CI_Controller */
    protected $CI;

    public function __construct()
    {
        $this->CI = &get_instance();
        $this->CI->load->helper('string');
    }

    public function is_enabled(): bool
    {
        return strtolower((string) getenv('TWILIO_ENABLED')) === 'true';
    }

    /**
     * Outbound — appointment created/updated.
     */
    public function send_appointment_saved(
        array $appointment,
        array $provider,
        array $service,
        array $customer,
        string $to_number,
        string $variant = 'customer'
    ): void {
        $body = $this->render_saved($appointment, $provider, $service, $customer, $variant);
        $this->dispatch($to_number, $body, [
            'event'          => 'appointment_saved',
            'appointment_id' => $appointment['id'] ?? null,
            'variant'        => $variant,
        ]);
    }

    /**
     * Outbound — appointment cancelled.
     */
    public function send_appointment_deleted(
        array $appointment,
        array $provider,
        array $service,
        array $customer,
        string $to_number,
        string $cancellation_reason = '',
        string $variant = 'customer'
    ): void {
        $body = $this->render_deleted($appointment, $provider, $service, $customer, $cancellation_reason, $variant);
        $this->dispatch($to_number, $body, [
            'event'          => 'appointment_deleted',
            'appointment_id' => $appointment['id'] ?? null,
            'variant'        => $variant,
        ]);
    }

    /**
     * Outbound — pre-appearance reminder. Used by a future cron/edge function
     * (see supabase/functions/cert-expirations/ pattern).
     */
    public function send_appointment_reminder(
        array $appointment,
        array $provider,
        array $service,
        array $customer,
        string $to_number,
        int $hours_until = 24
    ): void {
        $when = date('D M j, g:i a', strtotime((string) ($appointment['start_datetime'] ?? 'now')));
        $body = sprintf(
            'Court interpreter reminder: %s · %s in %dh (%s). Reply YES to confirm or NO to release the assignment.',
            $service['name']  ?? 'Hearing',
            $when,
            $hours_until,
            $appointment['hash'] ?? ''
        );
        $this->dispatch($to_number, $body, [
            'event'          => 'appointment_reminder',
            'appointment_id' => $appointment['id'] ?? null,
            'hours_until'    => $hours_until,
        ]);
    }

    // -----------------------------------------------------------------
    //  Internals
    // -----------------------------------------------------------------

    private function render_saved(array $a, array $p, array $s, array $c, string $variant): string
    {
        $when = date('D M j, g:i a', strtotime((string) ($a['start_datetime'] ?? 'now')));
        if ($variant === 'provider') {
            return sprintf(
                'New assignment %s · %s · for %s. Reply YES to accept or NO to decline.',
                $when,
                $s['name'] ?? 'Hearing',
                trim(($c['first_name'] ?? '') . ' ' . ($c['last_name'] ?? ''))
            );
        }
        return sprintf(
            'Court interpreter booked %s · %s · interpreter %s. Reply STOP to opt out.',
            $when,
            $s['name'] ?? 'Hearing',
            trim(($p['first_name'] ?? '') . ' ' . ($p['last_name'] ?? ''))
        );
    }

    private function render_deleted(array $a, array $p, array $s, array $c, string $reason, string $variant): string
    {
        $when = date('D M j, g:i a', strtotime((string) ($a['start_datetime'] ?? 'now')));
        $tail = $reason ? " — Reason: {$reason}" : '';
        if ($variant === 'provider') {
            return "Assignment cancelled {$when} · {$s['name']}{$tail}";
        }
        return "Court interpreter assignment cancelled {$when} · {$s['name']}{$tail}";
    }

    /**
     * Centralized exit point: posts to Twilio if enabled, else logs.
     * Either way, an entry should land in app.audit_log via the EA → Supabase
     * forwarder so we keep the §3 communication audit promise.
     */
    private function dispatch(string $to_number, string $body, array $meta): void
    {
        $payload = [
            'to'   => $to_number,
            'body' => $body,
            'meta' => $meta,
        ];

        if (!$this->is_enabled()) {
            error_log('[sms.disabled] would send: ' . json_encode($payload));
            return;
        }

        $sid     = (string) getenv('TWILIO_ACCOUNT_SID');
        $token   = (string) getenv('TWILIO_AUTH_TOKEN');
        $from    = (string) getenv('TWILIO_FROM_NUMBER');
        $apiBase = (string) (getenv('TWILIO_API_BASE_URL') ?: 'https://api.twilio.com');

        if ($sid === '' || $token === '' || $from === '') {
            error_log('[sms.misconfigured] TWILIO_* env not fully set; skipping send.');
            return;
        }

        $url = "{$apiBase}/2010-04-01/Accounts/{$sid}/Messages.json";
        $form = http_build_query([
            'To'   => $to_number,
            'From' => $from,
            'Body' => $body,
        ]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $form,
            CURLOPT_USERPWD        => "{$sid}:{$token}",
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
        ]);
        $resp   = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err    = curl_error($ch);
        curl_close($ch);

        if ($status >= 400 || $resp === false) {
            error_log("[sms.error] {$status} {$err} resp=" . substr((string) $resp, 0, 300));
        } else {
            error_log("[sms.sent] {$status} to={$to_number} sid=" . ($meta['appointment_id'] ?? '-'));
        }
    }
}
