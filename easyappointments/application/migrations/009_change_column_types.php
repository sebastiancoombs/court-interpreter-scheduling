<?php defined('BASEPATH') or exit('No direct script access allowed');

/* ----------------------------------------------------------------------------
 * Easy!Appointments - Online Appointment Scheduler
 *
 * @package     EasyAppointments
 * @author      A.Tselegidis <alextselegidis@gmail.com>
 * @copyright   Copyright (c) Alex Tselegidis
 * @license     https://opensource.org/licenses/GPL-3.0 - GPLv3
 * @link        https://easyappointments.org
 * @since       v1.3.0
 * ---------------------------------------------------------------------------- */

class Migration_Change_column_types extends EA_Migration
{
    /**
     * Upgrade method.
     */
    public function up(): void
    {
        // Drop table constraints.
        $prefix = $this->db->dbprefix('');

        $this->drop_foreign_key('appointments',          $prefix . 'appointments_ibfk_2');
        $this->drop_foreign_key('appointments',          $prefix . 'appointments_ibfk_3');
        $this->drop_foreign_key('appointments',          $prefix . 'appointments_ibfk_4');
        $this->drop_foreign_key('secretaries_providers', 'fk_' . $prefix . 'secretaries_providers_1');
        $this->drop_foreign_key('secretaries_providers', 'fk_' . $prefix . 'secretaries_providers_2');
        $this->drop_foreign_key('services_providers',    $prefix . 'services_providers_ibfk_1');
        $this->drop_foreign_key('services_providers',    $prefix . 'services_providers_ibfk_2');
        $this->drop_foreign_key('services',              $prefix . 'services_ibfk_1');
        $this->drop_foreign_key('users',                 $prefix . 'users_ibfk_1');
        $this->drop_foreign_key('user_settings',         $prefix . 'user_settings_ibfk_1');

        // Appointments
        $fields = [
            'id' => [
                'name' => 'id',
                'type' => 'int',
                'constraint' => '11',
                'auto_increment' => true,
            ],
            'id_users_provider' => [
                'name' => 'id_users_provider',
                'type' => 'int',
                'constraint' => '11',
            ],
            'id_users_customer' => [
                'name' => 'id_users_customer',
                'type' => 'int',
                'constraint' => '11',
            ],
            'id_services' => [
                'name' => 'id_services',
                'type' => 'int',
                'constraint' => '11',
            ],
        ];

        $this->dbforge->modify_column('appointments', $fields);

        // Roles
        $fields = [
            'id' => [
                'name' => 'id',
                'type' => 'int',
                'constraint' => '11',
                'auto_increment' => true,
            ],
            'appointments' => [
                'name' => 'appointments',
                'type' => 'int',
                'constraint' => '11',
            ],
            'customers' => [
                'name' => 'customers',
                'type' => 'int',
                'constraint' => '11',
            ],
            'services' => [
                'name' => 'services',
                'type' => 'int',
                'constraint' => '11',
            ],
            'users' => [
                'name' => 'users',
                'type' => 'int',
                'constraint' => '11',
            ],
            'system_settings' => [
                'name' => 'system_settings',
                'type' => 'int',
                'constraint' => '11',
            ],
            'user_settings' => [
                'name' => 'user_settings',
                'type' => 'int',
                'constraint' => '11',
            ],
        ];

        $this->dbforge->modify_column('roles', $fields);

        // Secretary Provider
        $fields = [
            'id_users_secretary' => [
                'name' => 'id_users_secretary',
                'type' => 'int',
                'constraint' => '11',
            ],
            'id_users_provider' => [
                'name' => 'id_users_provider',
                'type' => 'int',
                'constraint' => '11',
            ],
        ];

        $this->dbforge->modify_column('secretaries_providers', $fields);

        // Services
        $fields = [
            'id' => [
                'name' => 'id',
                'type' => 'int',
                'constraint' => '11',
                'auto_increment' => true,
            ],
            'id_service_categories' => [
                'name' => 'id_service_categories',
                'type' => 'int',
                'constraint' => '11',
            ],
        ];

        $this->dbforge->modify_column('services', $fields);

        // Service Providers
        $fields = [
            'id_users' => [
                'name' => 'id_users',
                'type' => 'int',
                'constraint' => '11',
            ],
            'id_services' => [
                'name' => 'id_services',
                'type' => 'int',
                'constraint' => '11',
            ],
        ];

        $this->dbforge->modify_column('services_providers', $fields);

        // Service Categories
        $fields = [
            'id' => [
                'name' => 'id',
                'type' => 'int',
                'constraint' => '11',
                'auto_increment' => true,
            ],
        ];

        $this->dbforge->modify_column('service_categories', $fields);

        // Settings
        $fields = [
            'id' => [
                'name' => 'id',
                'type' => 'int',
                'constraint' => '11',
                'auto_increment' => true,
            ],
        ];

        $this->dbforge->modify_column('settings', $fields);

        // Users
        $fields = [
            'id' => [
                'name' => 'id',
                'type' => 'int',
                'constraint' => '11',
                'auto_increment' => true,
            ],
            'id_roles' => [
                'name' => 'id_roles',
                'type' => 'int',
                'constraint' => '11',
            ],
        ];

        $this->dbforge->modify_column('users', $fields);

        // Users Settings
        $fields = [
            'id_users' => [
                'name' => 'id_users',
                'type' => 'int',
                'constraint' => '11',
            ],
        ];

        $this->dbforge->modify_column('user_settings', $fields);

        // Add table constraints again.
        $prefix = $this->db->dbprefix('');

        $this->add_foreign_key('appointments',          $prefix . 'appointments_ibfk_2',          'id_users_customer',     'users',              'id');
        $this->add_foreign_key('appointments',          $prefix . 'appointments_ibfk_3',          'id_services',           'services',           'id');
        $this->add_foreign_key('appointments',          $prefix . 'appointments_ibfk_4',          'id_users_provider',     'users',              'id');
        $this->add_foreign_key('secretaries_providers', 'fk_' . $prefix . 'secretaries_providers_1', 'id_users_secretary',  'users',              'id');
        $this->add_foreign_key('secretaries_providers', 'fk_' . $prefix . 'secretaries_providers_2', 'id_users_provider',   'users',              'id');
        $this->add_foreign_key('services',              $prefix . 'services_ibfk_1',              'id_service_categories', 'service_categories', 'id', 'SET NULL', 'CASCADE');
        $this->add_foreign_key('services_providers',    $prefix . 'services_providers_ibfk_1',    'id_users',              'users',              'id');
        $this->add_foreign_key('services_providers',    $prefix . 'services_providers_ibfk_2',    'id_services',           'services',           'id');
        $this->add_foreign_key('users',                 $prefix . 'users_ibfk_1',                 'id_roles',              'roles',              'id');
        $this->add_foreign_key('user_settings',         $prefix . 'user_settings_ibfk_1',         'id_users',              'users',              'id');

        // Change charset of secretaries_providers for databases created with EA! 1.2.1 (MySQL only —
        // Postgres encoding is fixed at database creation time and there is no per-table override).
        if (strtolower((string) ($this->db->dbdriver ?? '')) !== 'postgre') {
            $this->db->query(
                'ALTER TABLE ' . $this->db->dbprefix('secretaries_providers') . ' CONVERT TO CHARACTER SET utf8'
            );
        }
    }

    /**
     * Downgrade method.
     */
    public function down(): void
    {
        // Drop table constraints.
        $prefix = $this->db->dbprefix('');

        $this->drop_foreign_key('appointments',          $prefix . 'appointments_ibfk_2');
        $this->drop_foreign_key('appointments',          $prefix . 'appointments_ibfk_3');
        $this->drop_foreign_key('appointments',          $prefix . 'appointments_ibfk_4');
        $this->drop_foreign_key('secretaries_providers', 'fk_' . $prefix . 'secretaries_providers_1');
        $this->drop_foreign_key('secretaries_providers', 'fk_' . $prefix . 'secretaries_providers_2');
        $this->drop_foreign_key('services_providers',    $prefix . 'services_providers_ibfk_1');
        $this->drop_foreign_key('services_providers',    $prefix . 'services_providers_ibfk_2');
        $this->drop_foreign_key('services',              $prefix . 'services_ibfk_1');
        $this->drop_foreign_key('users',                 $prefix . 'users_ibfk_1');
        $this->drop_foreign_key('user_settings',         $prefix . 'user_settings_ibfk_1');

        // Appointments
        $fields = [
            'id' => [
                'name' => 'id',
                'type' => 'bigint',
                'constraint' => '20',
                'auto_increment' => true,
            ],
            'id_users_provider' => [
                'name' => 'id_users_provider',
                'type' => 'bigint',
                'constraint' => '20',
            ],
            'id_users_customer' => [
                'name' => 'id_users_customer',
                'type' => 'bigint',
                'constraint' => '20',
            ],
            'id_services' => [
                'name' => 'id_services',
                'type' => 'bigint',
                'constraint' => '20',
            ],
        ];

        $this->dbforge->modify_column('appointments', $fields);

        // Roles
        $fields = [
            'id' => [
                'name' => 'id',
                'type' => 'bigint',
                'constraint' => '20',
                'auto_increment' => true,
            ],
            'appointments' => [
                'name' => 'appointments',
                'type' => 'bigint',
                'constraint' => '20',
            ],
            'customers' => [
                'name' => 'customers',
                'type' => 'bigint',
                'constraint' => '20',
            ],
            'services' => [
                'name' => 'services',
                'type' => 'bigint',
                'constraint' => '20',
            ],
            'users' => [
                'name' => 'users',
                'type' => 'bigint',
                'constraint' => '20',
            ],
            'system_settings' => [
                'name' => 'system_settings',
                'type' => 'bigint',
                'constraint' => '20',
            ],
            'user_settings' => [
                'name' => 'user_settings',
                'type' => 'bigint',
                'constraint' => '20',
            ],
        ];

        $this->dbforge->modify_column('roles', $fields);

        // Secretary Provider
        $fields = [
            'id_users_secretary' => [
                'name' => 'id_users_secretary',
                'type' => 'bigint',
                'constraint' => '20',
            ],
            'id_users_provider' => [
                'name' => 'id_users_provider',
                'type' => 'bigint',
                'constraint' => '20',
            ],
        ];

        $this->dbforge->modify_column('secretaries_providers', $fields);

        // Services
        $fields = [
            'id' => [
                'name' => 'id',
                'type' => 'bigint',
                'constraint' => '20',
                'auto_increment' => true,
            ],
            'id_service_categories' => [
                'name' => 'id_service_categories',
                'type' => 'bigint',
                'constraint' => '20',
            ],
        ];

        $this->dbforge->modify_column('services', $fields);

        // Service Providers
        $fields = [
            'id_users' => [
                'name' => 'id_users',
                'type' => 'bigint',
                'constraint' => '20',
            ],
            'id_services' => [
                'name' => 'id_services',
                'type' => 'bigint',
                'constraint' => '20',
            ],
        ];

        $this->dbforge->modify_column('services_providers', $fields);

        // Service Categories
        $fields = [
            'id' => [
                'name' => 'id',
                'type' => 'bigint',
                'constraint' => '20',
                'auto_increment' => true,
            ],
        ];

        $this->dbforge->modify_column('service_categories', $fields);

        // Settings
        $fields = [
            'id' => [
                'name' => 'id',
                'type' => 'bigint',
                'constraint' => '20',
                'auto_increment' => true,
            ],
        ];

        $this->dbforge->modify_column('settings', $fields);

        // Users
        $fields = [
            'id' => [
                'name' => 'id',
                'type' => 'bigint',
                'constraint' => '20',
                'auto_increment' => true,
            ],
            'id_roles' => [
                'name' => 'id_roles',
                'type' => 'bigint',
                'constraint' => '20',
            ],
        ];

        $this->dbforge->modify_column('users', $fields);

        // Users Settings
        $fields = [
            'id_users' => [
                'name' => 'id_users',
                'type' => 'bigint',
                'constraint' => '20',
            ],
        ];

        $this->dbforge->modify_column('user_settings', $fields);

        // Add database constraints.
        $prefix = $this->db->dbprefix('');

        $this->add_foreign_key('appointments',          $prefix . 'appointments_ibfk_2',          'id_users_customer',     'users',              'id');
        $this->add_foreign_key('appointments',          $prefix . 'appointments_ibfk_3',          'id_services',           'services',           'id');
        $this->add_foreign_key('appointments',          $prefix . 'appointments_ibfk_4',          'id_users_provider',     'users',              'id');
        $this->add_foreign_key('secretaries_providers', 'fk_' . $prefix . 'secretaries_providers_1', 'id_users_secretary',  'users',              'id');
        $this->add_foreign_key('secretaries_providers', 'fk_' . $prefix . 'secretaries_providers_2', 'id_users_provider',   'users',              'id');
        $this->add_foreign_key('services',              $prefix . 'services_ibfk_1',              'id_service_categories', 'service_categories', 'id', 'SET NULL', 'CASCADE');
        $this->add_foreign_key('services_providers',    $prefix . 'services_providers_ibfk_1',    'id_users',              'users',              'id');
        $this->add_foreign_key('services_providers',    $prefix . 'services_providers_ibfk_2',    'id_services',           'services',           'id');
        $this->add_foreign_key('users',                 $prefix . 'users_ibfk_1',                 'id_roles',              'roles',              'id');
        $this->add_foreign_key('user_settings',         $prefix . 'user_settings_ibfk_1',         'id_users',              'users',              'id');
    }
}
