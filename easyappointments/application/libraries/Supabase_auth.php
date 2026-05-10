<?php defined('BASEPATH') or exit('No direct script access allowed');

/* ----------------------------------------------------------------------------
 * Supabase JWT auth bridge for Easy!Appointments
 *
 * Lets a user signed into Supabase Auth (the unified identity layer in
 * supabase/ + integration/auth-bridge/) hit any EA admin endpoint without
 * needing an EA password. Verifies an HS256 JWT signed with the same
 * SUPABASE_JWT_SECRET as the FastAPI side, looks up the linked EA user
 * via app.profiles.ea_user_id, and writes the EA session.
 *
 * Drop-in usage from a controller:
 *
 *     $this->load->library('supabase_auth');
 *     if ($user = $this->supabase_auth->authenticate_request()) {
 *         // session is now set; proceed
 *     }
 *
 * Required env (read via core/utils.php → env() or $_SERVER):
 *
 *     SUPABASE_JWT_SECRET    HS256 signing key shared with FastAPI + auth-bridge
 *     SUPABASE_AUDIENCE      defaults to "authenticated"
 * ---------------------------------------------------------------------------- */

class Supabase_auth
{
    /** @var CI_Controller */
    protected $CI;
    protected string $secret;
    protected string $audience;

    public function __construct()
    {
        $this->CI = &get_instance();
        $this->CI->load->helper('string');
        $this->CI->load->model('users_model');
        $this->CI->load->library('session');

        $this->secret   = (string) (getenv('SUPABASE_JWT_SECRET') ?: '');
        $this->audience = (string) (getenv('SUPABASE_AUDIENCE')  ?: 'authenticated');
    }

    /**
     * Verify the incoming Authorization: Bearer <jwt> header and (if valid)
     * resolve the EA user + set the session. Returns the EA user record on
     * success, or NULL on failure (caller decides whether to fall through to
     * EA's native session login).
     */
    public function authenticate_request(): ?array
    {
        if ($this->secret === '') {
            return null; // Not configured — fall through to native EA auth
        }

        $headers = array_change_key_case(getallheaders() ?: [], CASE_LOWER);
        $auth = $headers['authorization'] ?? '';
        if (!preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
            return null;
        }

        $payload = $this->verify_jwt($m[1]);
        if ($payload === null) {
            return null;
        }

        // TODO: replace this lookup with a join to app.profiles in Supabase
        // (cross-DB) once integration/ea-sync is materializing the link.
        // For now: look up the EA user by email matching the JWT email claim.
        $email = $payload['email'] ?? null;
        if (!$email) {
            return null;
        }

        $user = $this->CI->users_model->query_by_email($email);
        if (!$user) {
            return null;
        }

        // Set the EA session (mirrors EA's Login::validate flow)
        $this->CI->session->set_userdata([
            'user_id'   => $user['id'],
            'user_email'=> $user['email'],
            'role_slug' => $user['role_slug'] ?? 'admin',
            'username'  => $user['settings']['username'] ?? $email,
            'timezone'  => $user['timezone']  ?? date_default_timezone_get(),
            'language'  => $user['language']  ?? 'english',
        ]);

        return $user;
    }

    /**
     * Verify an HS256 JWT against SUPABASE_JWT_SECRET. Returns the decoded
     * payload array if signature + expiry + audience all check out, else NULL.
     *
     * Implementation note: we keep this dependency-free (no firebase/php-jwt)
     * so the EA composer.json doesn't drift from upstream. The JWT spec is
     * small enough that doing it by hand is fine.
     */
    public function verify_jwt(string $jwt): ?array
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) return null;

        [$h64, $p64, $s64] = $parts;
        $header  = json_decode($this->b64url_decode($h64), true);
        $payload = json_decode($this->b64url_decode($p64), true);
        $sig     = $this->b64url_decode($s64);

        if (($header['alg'] ?? '') !== 'HS256') return null;

        $expected = hash_hmac('sha256', "{$h64}.{$p64}", $this->secret, true);
        if (!hash_equals($expected, $sig)) return null;

        $now = time();
        if (isset($payload['exp']) && $payload['exp'] < $now) return null;
        if (isset($payload['nbf']) && $payload['nbf'] > $now) return null;
        if (isset($payload['aud']) && $payload['aud'] !== $this->audience) return null;

        return $payload;
    }

    private function b64url_decode(string $s): string
    {
        $pad = strlen($s) % 4;
        if ($pad) $s .= str_repeat('=', 4 - $pad);
        return base64_decode(strtr($s, '-_', '+/'));
    }
}
