<?php defined('BASEPATH') or exit('No direct script access allowed');

/* ----------------------------------------------------------------------------
 * Easy!Appointments - Online Appointment Scheduler
 *
 * @package     EasyAppointments
 * @author      A.Tselegidis <alextselegidis@gmail.com>
 * @copyright   Copyright (c) Alex Tselegidis
 * @license     https://opensource.org/licenses/GPL-3.0 - GPLv3
 * @link        https://easyappointments.org
 * @since       v1.5.0
 * ---------------------------------------------------------------------------- */

class Migration_Revert_rename_id_service_categories_column_of_services_table extends EA_Migration
{
    /**
     * Upgrade method.
     */
    public function up(): void
    {
        if ($this->db->field_exists('id_categories', 'services')) {
            $this->drop_foreign_key('services', 'services_categories');

            $fields = [
                'id_categories' => [
                    'name' => 'id_service_categories',
                    'type' => 'INT',
                    'constraint' => '11',
                ],
            ];

            $this->dbforge->modify_column('services', $fields);

            $this->add_foreign_key('services', 'services_service_categories', 'id_service_categories', 'service_categories', 'id', 'SET NULL', 'CASCADE');
        }
    }

    /**
     * Downgrade method.
     */
    public function down(): void
    {
        if ($this->db->field_exists('id_service_categories', 'services')) {
            $this->drop_foreign_key('services', 'services_service_categories');

            $fields = [
                'id_service_categories' => [
                    'name' => 'id_categories',
                    'type' => 'INT',
                    'constraint' => '11',
                ],
            ];

            $this->dbforge->modify_column('services', $fields);

            $this->add_foreign_key('services', 'services_categories', 'id_categories', 'service_categories', 'id', 'SET NULL', 'CASCADE');
        }
    }
}
