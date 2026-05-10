<?php defined('BASEPATH') or exit('No direct script access allowed'); ?>
<?php
/* Unified topbar — renders the same markup as web/src/components/UnifiedTopbar.vue.
 * The shared CSS is loaded from the auth-bridge so both subsystems pull from one
 * source. CIS_LINKS env vars override the per-tab destinations.
 *
 * Vars consumed (via the layout that includes this partial):
 *   $active_key   — string, one of 'bookings' | 'calendar' | 'add_booking' |
 *                   'interpreters' | 'languages' | 'rates' | 'reports' |
 *                   'audit' | 'admin'
 */

$cis_links = [
    'bookings'     => (getenv('CIS_BCGOV_URL')   ?: 'http://localhost:8080') . '/bookings',
    'calendar'     => (getenv('CIS_EA_URL')      ?: 'http://localhost:8085') . '/index.php/calendar',
    'add_booking'  => (getenv('CIS_EA_URL')      ?: 'http://localhost:8085') . '/',
    'interpreters' => (getenv('CIS_BCGOV_URL')   ?: 'http://localhost:8080') . '/directory',
    'languages'    => (getenv('CIS_BCGOV_URL')   ?: 'http://localhost:8080') . '/language',
    'rates'        => (getenv('CIS_BCGOV_URL')   ?: 'http://localhost:8080') . '/rates',
    'reports'      => (getenv('CIS_METABASE_URL')?: 'http://localhost:8088') . '/',
    'audit'        => (getenv('CIS_BCGOV_URL')   ?: 'http://localhost:8080') . '/audit-booking',
    'admin'        => (getenv('CIS_BCGOV_URL')   ?: 'http://localhost:8080') . '/user-role',
];

$active_key = $active_key ?? 'calendar';
$tabs = [
    ['bookings',     'Manage Bookings'],
    ['calendar',     'Calendar'],
    ['add_booking',  'Add Booking'],
    ['interpreters', 'Interpreters'],
    ['languages',    'Languages'],
    ['rates',        'Rates'],
    ['reports',      'Reports'],
    ['audit',        'Audit'],
    ['admin',        'Admin'],
];

// Pull the signed-in user's display name + initials from the EA session.
$user = ($_SESSION ?? []);
$display_name = trim(($user['user_email'] ?? '') ? $user['user_email'] : (vars('user_display_name') ?? 'Administrator'));
$display_short = explode('@', $display_name)[0];
$initials = '';
foreach (preg_split('/\s+|\./', trim((string) $display_short)) as $part) {
    if ($part !== '') $initials .= strtoupper(substr($part, 0, 1));
    if (strlen($initials) >= 2) break;
}
if ($initials === '') $initials = 'KD';
?>
<header class="cis-topbar">
    <div class="cis-topbar__brand-row">
        <a class="cis-brand" href="<?= htmlspecialchars($cis_links['bookings']) ?>">
            <span class="cis-brand__mark">
                <svg viewBox="0 0 40 40" width="32" height="32">
                    <path d="M20 4 L34 11 V21 C34 28 28 34 20 36 C12 34 6 28 6 21 V11 Z"
                          fill="#C19A36" stroke="#fff" stroke-width="1.5"/>
                    <text x="20" y="25" text-anchor="middle" font-family="Inter, system-ui, sans-serif"
                          font-size="13" font-weight="700" fill="#001a3d">CA</text>
                </svg>
            </span>
            <span class="cis-brand__meta">
                <span class="cis-brand__pre">Judicial Council of California</span>
                <span class="cis-brand__name">Court Interpreter Scheduling</span>
            </span>
        </a>
        <div class="cis-topbar__actions">
            <select class="cis-court-select" aria-label="Court location" disabled>
                <option><?= htmlspecialchars(setting('company_name') ?? 'Central Courthouse') ?></option>
            </select>
            <button class="cis-user-pill" type="button"
                    onclick="window.location='<?= site_url('logout') ?>'"
                    title="Sign out">
                <span class="cis-avatar"><?= htmlspecialchars($initials) ?></span>
                <span class="cis-user-pill__name"><?= htmlspecialchars($display_short) ?></span>
            </button>
        </div>
    </div>
    <nav class="cis-subnav" aria-label="Primary">
        <?php foreach ($tabs as [$k, $label]): ?>
            <a class="cis-tab"
               <?= $active_key === $k ? 'data-active' : '' ?>
               href="<?= htmlspecialchars($cis_links[$k]) ?>"><?= htmlspecialchars($label) ?></a>
        <?php endforeach; ?>
        <span class="cis-tab__badge">DEV</span>
    </nav>
</header>
