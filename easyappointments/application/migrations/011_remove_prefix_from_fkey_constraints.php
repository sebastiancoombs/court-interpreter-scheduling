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

class Migration_Remove_prefix_from_fkey_constraints extends EA_Migration
{
    /**
     * Upgrade method.
     */
    public function up(): void
    {
        $prefix = $this->db->dbprefix('');

        // Drop the old prefixed constraints.
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

        // Add table constraints again without the "ea" prefix.
        $this->add_foreign_key('appointments',          'appointments_users_customer',      'id_users_customer', 'users',             'id');
        $this->add_foreign_key('appointments',          'appointments_services',            'id_services',       'services',          'id');
        $this->add_foreign_key('appointments',          'appointments_users_provider',      'id_users_provider', 'users',             'id');
        $this->add_foreign_key('secretaries_providers', 'secretaries_users_secretary',      'id_users_secretary','users',             'id');
        $this->add_foreign_key('secretaries_providers', 'secretaries_users_provider',       'id_users_provider', 'users',             'id');
        $this->add_foreign_key('services',              'services_service_categories',      'id_service_categories', 'service_categories', 'id', 'SET NULL', 'CASCADE');
        $this->add_foreign_key('services_providers',    'services_providers_users_provider','id_users',          'users',             'id');
        $this->add_foreign_key('services_providers',    'services_providers_services',      'id_services',       'services',          'id');
        $this->add_foreign_key('users',                 'users_roles',                      'id_roles',          'roles',             'id');
        $this->add_foreign_key('user_settings',         'user_settings_users',              'id_users',          'users',             'id');
    }

    /**
     * Downgrade method.
     */
    public function down(): void
    {
        $prefix = $this->db->dbprefix('');

        // Drop the unprefixed constraints.
        $this->drop_foreign_key('appointments',          'appointments_services');
        $this->drop_foreign_key('appointments',          'appointments_users_customer');
        $this->drop_foreign_key('appointments',          'appointments_users_provider');
        $this->drop_foreign_key('secretaries_providers', 'secretaries_users_secretary');
        $this->drop_foreign_key('secretaries_providers', 'secretaries_users_provider');
        $this->drop_foreign_key('services_providers',    'services_providers_users_provider');
        $this->drop_foreign_key('services_providers',    'services_providers_services');
        $this->drop_foreign_key('services',              'services_service_categories');
        $this->drop_foreign_key('users',                 'users_roles');
        $this->drop_foreign_key('user_settings',         'user_settings_users');

        // Restore the originally-prefixed constraints.
        $this->add_foreign_key('appointments',          $prefix . 'appointments_ibfk_2',          'id_users_customer', 'users',    'id');
        $this->add_foreign_key('appointments',          $prefix . 'appointments_ibfk_3',          'id_services',       'services', 'id');
        $this->add_foreign_key('appointments',          $prefix . 'appointments_ibfk_4',          'id_users_provider', 'users',    'id');
        $this->add_foreign_key('secretaries_providers', 'fk_' . $prefix . 'secretaries_providers_1', 'id_users_secretary', 'users', 'id');
        $this->add_foreign_key('secretaries_providers', 'fk_' . $prefix . 'secretaries_providers_2', 'id_users_provider',  'users', 'id');
        $this->add_foreign_key('services',              $prefix . 'services_ibfk_1',              'id_service_categories', 'service_categories', 'id', 'SET NULL', 'CASCADE');
        $this->add_foreign_key('services_providers',    $prefix . 'services_providers_ibfk_1',    'id_users',     'users',    'id');
        $this->add_foreign_key('services_providers',    $prefix . 'services_providers_ibfk_2',    'id_services',  'services', 'id');
        $this->add_foreign_key('users',                 $prefix . 'users_ibfk_1',                 'id_roles',     'roles',    'id');
        $this->add_foreign_key('user_settings',         $prefix . 'user_settings_ibfk_1',         'id_users',     'users',    'id');
    }
}
