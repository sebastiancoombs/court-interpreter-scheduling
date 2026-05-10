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

/*
 * Notice: This first migration got altered to include the creation of the initial database structure so that external
 * SQL are not required.
 */

class Migration_Specific_calendar_sync extends EA_Migration
{
    /**
     * Upgrade method.
     */
    public function up(): void
    {
        $this->dbforge->add_field([
            'id' => [
                'type' => 'BIGINT',
                'constraint' => '20',
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'book_datetime' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'start_datetime' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'end_datetime' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'notes' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'hash' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'is_unavailability' => [
                'type' => 'TINYINT',
                'constraint' => '4',
                'default' => '0',
            ],
            'id_users_provider' => [
                'type' => 'BIGINT',
                'constraint' => '20',
                'unsigned' => true,
                'null' => true,
            ],
            'id_users_customer' => [
                'type' => 'BIGINT',
                'constraint' => '20',
                'unsigned' => true,
                'null' => true,
            ],
            'id_services' => [
                'type' => 'BIGINT',
                'constraint' => '20',
                'unsigned' => true,
                'null' => true,
            ],
            'id_google_calendar' => [
                'type' => 'TEXT',
                'null' => true,
            ],
        ]);
        $this->dbforge->add_key('id', true);
        $this->dbforge->add_key('id_users_provider');
        $this->dbforge->add_key('id_users_customer');
        $this->dbforge->add_key('id_services');
        $this->dbforge->create_table('appointments', true, ['engine' => 'InnoDB']);

        $this->dbforge->add_field([
            'id' => [
                'type' => 'BIGINT',
                'constraint' => '20',
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'name' => [
                'type' => 'VARCHAR',
                'constraint' => '256',
                'null' => true,
            ],
            'slug' => [
                'type' => 'VARCHAR',
                'constraint' => '256',
                'null' => true,
            ],
            'is_admin' => [
                'type' => 'TINYINT',
                'constraint' => '4',
                'null' => true,
            ],
            'appointments' => [
                'type' => 'INT',
                'constraint' => '4',
                'null' => true,
            ],
            'customers' => [
                'type' => 'INT',
                'constraint' => '4',
                'null' => true,
            ],
            'services' => [
                'type' => 'INT',
                'constraint' => '4',
                'null' => true,
            ],
            'users' => [
                'type' => 'INT',
                'constraint' => '4',
                'null' => true,
            ],
            'system_settings' => [
                'type' => 'INT',
                'constraint' => '4',
                'null' => true,
            ],
            'user_settings' => [
                'type' => 'INT',
                'constraint' => '4',
                'null' => true,
            ],
        ]);
        $this->dbforge->add_key('id', true);
        $this->dbforge->create_table('roles', true, ['engine' => 'InnoDB']);

        $this->dbforge->add_field([
            'id_users_secretary' => [
                'type' => 'BIGINT',
                'constraint' => '20',
                'unsigned' => true,
            ],
            'id_users_provider' => [
                'type' => 'BIGINT',
                'constraint' => '20',
                'unsigned' => true,
            ],
        ]);
        $this->dbforge->add_key('id_users_secretary', true);
        $this->dbforge->add_key('id_users_provider', true);
        $this->dbforge->create_table('secretaries_providers', true, ['engine' => 'InnoDB']);

        $this->dbforge->add_field([
            'id' => [
                'type' => 'BIGINT',
                'constraint' => '20',
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'name' => [
                'type' => 'VARCHAR',
                'constraint' => '256',
                'null' => true,
            ],
            'duration' => [
                'type' => 'INT',
                'constraint' => '11',
                'null' => true,
            ],
            'price' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => true,
            ],
            'currency' => [
                'type' => 'VARCHAR',
                'constraint' => '32',
                'null' => true,
            ],
            'description' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'id_service_categories' => [
                'type' => 'BIGINT',
                'constraint' => '20',
                'unsigned' => true,
                'null' => true,
            ],
        ]);
        $this->dbforge->add_key('id', true);
        $this->dbforge->add_key('id_service_categories');
        $this->dbforge->create_table('services', true, ['engine' => 'InnoDB']);

        $this->dbforge->add_field([
            'id_users' => [
                'type' => 'BIGINT',
                'constraint' => '20',
                'unsigned' => true,
            ],
            'id_services' => [
                'type' => 'BIGINT',
                'constraint' => '20',
                'unsigned' => true,
            ],
        ]);
        $this->dbforge->add_key('id_users', true);
        $this->dbforge->add_key('id_services', true);
        $this->dbforge->create_table('services_providers', true, ['engine' => 'InnoDB']);

        $this->dbforge->add_field([
            'id' => [
                'type' => 'BIGINT',
                'constraint' => '20',
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'name' => [
                'type' => 'VARCHAR',
                'constraint' => '256',
                'null' => true,
            ],
            'description' => [
                'type' => 'TEXT',
                'null' => true,
            ],
        ]);
        $this->dbforge->add_key('id', true);
        $this->dbforge->add_key('id_service_categories');
        $this->dbforge->create_table('service_categories', true, ['engine' => 'InnoDB']);

        $this->dbforge->add_field([
            'id' => [
                'type' => 'BIGINT',
                'constraint' => '20',
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'name' => [
                'type' => 'VARCHAR',
                'constraint' => '512',
                'null' => true,
            ],
            'value' => [
                'type' => 'LONGTEXT',
                'null' => true,
            ],
        ]);
        $this->dbforge->add_key('id', true);
        $this->dbforge->create_table('settings', true, ['engine' => 'InnoDB']);

        $this->dbforge->add_field([
            'id' => [
                'type' => 'BIGINT',
                'constraint' => '20',
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'first_name' => [
                'type' => 'VARCHAR',
                'constraint' => '256',
                'null' => true,
            ],
            'last_name' => [
                'type' => 'VARCHAR',
                'constraint' => '512',
                'null' => true,
            ],
            'email' => [
                'type' => 'VARCHAR',
                'constraint' => '512',
                'null' => true,
            ],
            'mobile_number' => [
                'type' => 'VARCHAR',
                'constraint' => '128',
                'null' => true,
            ],
            'phone_number' => [
                'type' => 'VARCHAR',
                'constraint' => '128',
                'null' => true,
            ],
            'address' => [
                'type' => 'VARCHAR',
                'constraint' => '256',
                'null' => true,
            ],
            'city' => [
                'type' => 'VARCHAR',
                'constraint' => '256',
                'null' => true,
            ],
            'state' => [
                'type' => 'VARCHAR',
                'constraint' => '128',
                'null' => true,
            ],
            'zip_code' => [
                'type' => 'VARCHAR',
                'constraint' => '64',
                'null' => true,
            ],
            'notes' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'id_roles' => [
                'type' => 'BIGINT',
                'constraint' => '20',
                'unsigned' => true,
            ],
        ]);
        $this->dbforge->add_key('id', true);
        $this->dbforge->add_key('id_roles');
        $this->dbforge->create_table('users', true, ['engine' => 'InnoDB']);

        $this->dbforge->add_field([
            'id_users' => [
                'type' => 'BIGINT',
                'constraint' => '20',
                'unsigned' => true,
            ],
            'username' => [
                'type' => 'VARCHAR',
                'constraint' => '256',
                'null' => true,
            ],
            'password' => [
                'type' => 'VARCHAR',
                'constraint' => '512',
                'null' => true,
            ],
            'salt' => [
                'type' => 'VARCHAR',
                'constraint' => '512',
                'null' => true,
            ],
            'working_plan' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'notifications' => [
                'type' => 'TINYINT',
                'constraint' => '4',
                'null' => true,
            ],
            'google_sync' => [
                'type' => 'TINYINT',
                'constraint' => '4',
                'null' => true,
            ],
            'google_token' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'google_calendar' => [
                'type' => 'VARCHAR',
                'constraint' => '128',
                'null' => true,
            ],
            'sync_past_days' => [
                'type' => 'INT',
                'constraint' => '11',
                'null' => true,
                'default' => '5',
            ],
            'sync_future_days' => [
                'type' => 'INT',
                'constraint' => '11',
                'null' => true,
                'default' => '5',
            ],
        ]);
        $this->dbforge->add_key('id_users', true);
        $this->dbforge->create_table('user_settings', true, ['engine' => 'InnoDB']);

        $prefix = $this->db->dbprefix('');

        $this->add_foreign_key('appointments',          $prefix . 'appointments_ibfk_2',          'id_users_customer',    'users',              'id');
        $this->add_foreign_key('appointments',          $prefix . 'appointments_ibfk_3',          'id_services',          'services',           'id');
        $this->add_foreign_key('appointments',          $prefix . 'appointments_ibfk_4',          'id_users_provider',    'users',              'id');
        $this->add_foreign_key('secretaries_providers', 'fk_' . $prefix . 'secretaries_providers_1', 'id_users_secretary', 'users',              'id');
        $this->add_foreign_key('secretaries_providers', 'fk_' . $prefix . 'secretaries_providers_2', 'id_users_provider',  'users',              'id');
        $this->add_foreign_key('services',              $prefix . 'services_ibfk_1',              'id_service_categories','service_categories', 'id', 'SET NULL', 'CASCADE');
        $this->add_foreign_key('services_providers',    $prefix . 'services_providers_ibfk_1',    'id_users',             'users',              'id');
        $this->add_foreign_key('services_providers',    $prefix . 'services_providers_ibfk_2',    'id_services',          'services',           'id');
        $this->add_foreign_key('users',                 $prefix . 'users_ibfk_1',                 'id_roles',             'roles',              'id');
        $this->add_foreign_key('user_settings',         $prefix . 'user_settings_ibfk_1',         'id_users',             'users',              'id');

        $this->db->insert('roles', [
            'name' => 'Administrator',
            'slug' => 'admin',
            'is_admin' => true,
            'appointments' => 15,
            'customers' => 15,
            'services' => 15,
            'users' => 15,
            'system_settings' => 15,
            'user_settings' => 15,
        ]);

        $this->db->insert('roles', [
            'name' => 'Provider',
            'slug' => 'provider',
            'is_admin' => false,
            'appointments' => 15,
            'customers' => 15,
            'services' => 0,
            'users' => 0,
            'system_settings' => 0,
            'user_settings' => 15,
        ]);

        $this->db->insert('roles', [
            'name' => 'Customer',
            'slug' => 'customer',
            'is_admin' => false,
            'appointments' => 0,
            'customers' => 0,
            'services' => 0,
            'users' => 0,
            'system_settings' => 0,
            'user_settings' => 0,
        ]);

        $this->db->insert('roles', [
            'name' => 'Secretary',
            'slug' => 'secretary',
            'is_admin' => false,
            'appointments' => 15,
            'customers' => 15,
            'services' => 0,
            'users' => 0,
            'system_settings' => 0,
            'user_settings' => 15,
        ]);

        $this->db->insert('settings', [
            'name' => 'company_working_plan',
            'value' =>
                '{"monday":{"start":"09:00","end":"18:00","breaks":[{"start":"14:30","end":"15:00"}]},"tuesday":{"start":"09:00","end":"18:00","breaks":[{"start":"14:30","end":"15:00"}]},"wednesday":{"start":"09:00","end":"18:00","breaks":[{"start":"14:30","end":"15:00"}]},"thursday":{"start":"09:00","end":"18:00","breaks":[{"start":"14:30","end":"15:00"}]},"friday":{"start":"09:00","end":"18:00","breaks":[{"start":"14:30","end":"15:00"}]},"saturday":{"start":"09:00","end":"18:00","breaks":[{"start":"14:30","end":"15:00"}]},"sunday":{"start":"09:00","end":"18:00","breaks":[{"start":"14:30","end":"15:00"}]}}',
        ]);

        $this->db->insert('settings', [
            'name' => 'book_advance_timeout',
            'value' => '30',
        ]);
    }

    /**
     * Downgrade method.
     */
    public function down(): void
    {
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

        $this->dbforge->drop_table('appointments');
        $this->dbforge->drop_table('roles');
        $this->dbforge->drop_table('secretaries_providers');
        $this->dbforge->drop_table('services');
        $this->dbforge->drop_table('service_categories');
        $this->dbforge->drop_table('services_providers');
        $this->dbforge->drop_table('settings');
        $this->dbforge->drop_table('user_settings');
        $this->dbforge->drop_table('users');
    }
}
