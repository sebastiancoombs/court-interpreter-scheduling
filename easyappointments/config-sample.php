<?php
/* ----------------------------------------------------------------------------
 * Easy!Appointments - Online Appointment Scheduler
 *
 * @package     EasyAppointments
 * @author      A.Tselegidis <alextselegidis@gmail.com>
 * @copyright   Copyright (c) Alex Tselegidis
 * @license     https://opensource.org/licenses/GPL-3.0 - GPLv3
 * @link        https://easyappointments.org
 * @since       v1.0.0
 * ---------------------------------------------------------------------------- */

/**
 * Easy!Appointments Configuration File
 *
 * Set your installation BASE_URL * without the trailing slash * and the database
 * credentials in order to connect to the database. You can enable the DEBUG_MODE
 * while developing the application.
 *
 * Set the default language by changing the LANGUAGE constant. For a full list of
 * available languages look at the /application/config/config.php file.
 *
 * Every value is overridable by an environment variable. The class still
 * exposes the same Config::DB_HOST etc. constants so existing call sites are
 * unchanged — they just resolve to env-driven globals at autoload time.
 */

// Helper — read an env override and fall back to the hardcoded default.
// Class constants can reference globally defined constants but cannot call
// functions, so we resolve the env first via `define()` and then reference
// those globals from the class consts below.
if (!function_exists('ea_env')) {
    function ea_env(string $key, $default)
    {
        $v = getenv($key);
        return $v === false || $v === '' ? $default : $v;
    }
}

define('EA_BASE_URL',    ea_env('BASE_URL',    'http://localhost:8085'));
define('EA_LANGUAGE',    ea_env('LANGUAGE',    'english'));
define('EA_DEBUG_MODE',  filter_var(ea_env('DEBUG_MODE', '0'), FILTER_VALIDATE_BOOLEAN));
define('EA_DB_DRIVER',   ea_env('DB_DRIVER',   'postgre'));
define('EA_DB_HOST',     ea_env('DB_HOST',     'postgres'));
define('EA_DB_PORT',     (int) ea_env('DB_PORT', EA_DB_DRIVER === 'postgre' ? '5432' : '3306'));
define('EA_DB_NAME',     ea_env('DB_NAME',     'easyappointments'));
define('EA_DB_USERNAME', ea_env('DB_USERNAME', 'easyappointments'));
define('EA_DB_PASSWORD', ea_env('DB_PASSWORD', 'easyappointments'));
define('EA_GOOGLE_SYNC_FEATURE', filter_var(ea_env('GOOGLE_SYNC_FEATURE', '0'), FILTER_VALIDATE_BOOLEAN));
define('EA_GOOGLE_CLIENT_ID',     ea_env('GOOGLE_CLIENT_ID',     ''));
define('EA_GOOGLE_CLIENT_SECRET', ea_env('GOOGLE_CLIENT_SECRET', ''));

class Config
{
    // ------------------------------------------------------------------------
    // GENERAL SETTINGS
    // ------------------------------------------------------------------------

    const BASE_URL   = EA_BASE_URL;
    const LANGUAGE   = EA_LANGUAGE;
    const DEBUG_MODE = EA_DEBUG_MODE;

    // ------------------------------------------------------------------------
    // DATABASE SETTINGS
    // ------------------------------------------------------------------------
    //
    // DB_DRIVER values: 'postgre' (default — Supabase / any Postgres) or
    // 'mysqli' (legacy MySQL/MariaDB). Defaults to postgre because the JCC
    // fork ships unified on Supabase Postgres.

    const DB_DRIVER   = EA_DB_DRIVER;
    const DB_HOST     = EA_DB_HOST;
    const DB_PORT     = EA_DB_PORT;
    const DB_NAME     = EA_DB_NAME;
    const DB_USERNAME = EA_DB_USERNAME;
    const DB_PASSWORD = EA_DB_PASSWORD;

    // ------------------------------------------------------------------------
    // GOOGLE CALENDAR SYNC
    // ------------------------------------------------------------------------

    const GOOGLE_SYNC_FEATURE = EA_GOOGLE_SYNC_FEATURE;
    const GOOGLE_CLIENT_ID     = EA_GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = EA_GOOGLE_CLIENT_SECRET;
}
