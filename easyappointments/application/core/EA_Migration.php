<?php defined('BASEPATH') or exit('No direct script access allowed');

/* ----------------------------------------------------------------------------
 * Easy!Appointments - Online Appointment Scheduler
 *
 * @package     EasyAppointments
 * @author      A.Tselegidis <alextselegidis@gmail.com>
 * @copyright   Copyright (c) Alex Tselegidis
 * @license     https://opensource.org/licenses/GPL-3.0 - GPLv3
 * @link        https://easyappointments.org
 * @since       v1.4.0
 * ---------------------------------------------------------------------------- */

require_once BASEPATH . 'libraries/Migration.php';

/**
 * Easy!Appointments migration.
 *
 * @property EA_Benchmark $benchmark
 * @property EA_Cache $cache
 * @property EA_Calendar $calendar
 * @property EA_Config $config
 * @property EA_DB_forge $dbforge
 * @property EA_DB_query_builder $db
 * @property EA_DB_utility $dbutil
 * @property EA_Email $email
 * @property EA_Encrypt $encrypt
 * @property EA_Encryption $encryption
 * @property EA_Exceptions $exceptions
 * @property EA_Hooks $hooks
 * @property EA_Input $input
 * @property EA_Lang $lang
 * @property EA_Loader $load
 * @property EA_Log $log
 * @property EA_Migration $migration
 * @property EA_Output $output
 * @property EA_Profiler $profiler
 * @property EA_Router $router
 * @property EA_Security $security
 * @property EA_Session $session
 * @property EA_Upload $upload
 * @property EA_URI $uri
 */
class EA_Migration extends CI_Migration
{
    /**
     * Get the current migration version.
     *
     * @return int
     */
    public function current_version(): int
    {
        return $this->_get_version();
    }

    /**
     * Add a foreign key constraint. Dialect-aware so the same migration
     * runs on MySQL/MariaDB and PostgreSQL — it emits backtick-quoted
     * identifiers for MySQL and double-quoted identifiers for Postgres.
     *
     * The $table and $ref_table arguments get the EA dbprefix applied.
     * $name is taken verbatim so callers can match upstream EA's mixed
     * naming convention (`<table>_ibfk_N` vs `fk_<table>_N` vs ad-hoc).
     */
    public function add_foreign_key(
        string $table,
        string $name,
        string $column,
        string $ref_table,
        string $ref_column,
        string $on_delete = 'CASCADE',
        string $on_update = 'CASCADE'
    ): void {
        $tbl  = $this->_qid($this->db->dbprefix($table));
        $ref  = $this->_qid($this->db->dbprefix($ref_table));
        $cn   = $this->_qid($name);
        $col  = $this->_qid($column);
        $rcol = $this->_qid($ref_column);

        $this->db->query(
            "ALTER TABLE {$tbl} ADD CONSTRAINT {$cn} FOREIGN KEY ({$col}) " .
            "REFERENCES {$ref} ({$rcol}) ON DELETE {$on_delete} ON UPDATE {$on_update}"
        );
    }

    /**
     * Drop a foreign key constraint by name. MySQL uses
     * `DROP FOREIGN KEY <name>`; Postgres uses `DROP CONSTRAINT <name>`.
     */
    public function drop_foreign_key(string $table, string $name): void
    {
        $tbl = $this->_qid($this->db->dbprefix($table));
        $cn  = $this->_qid($name);

        $clause = $this->_is_postgres() ? 'DROP CONSTRAINT' : 'DROP FOREIGN KEY';
        $this->db->query("ALTER TABLE {$tbl} {$clause} {$cn}");
    }

    /**
     * Quote an identifier using the dialect-appropriate character.
     */
    private function _qid(string $id): string
    {
        $q = $this->_is_postgres() ? '"' : '`';
        return $q . str_replace($q, $q . $q, $id) . $q;
    }

    /**
     * True when the active connection is PostgreSQL.
     */
    private function _is_postgres(): bool
    {
        return strtolower((string) ($this->db->dbdriver ?? '')) === 'postgre';
    }
}
