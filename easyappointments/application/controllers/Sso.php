<?php defined('BASEPATH') or exit('No direct script access allowed');

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * Sso controller — bridges a bcgov-api / Supabase bearer token into an
 * EA session cookie so the unified-container demo only needs one login.
 *
 * Trust model: the token must be HS256-signed with JWT_SECRET_KEY (same
 * secret FastAPI signs its tokens with). The whole exchange happens
 * server-side on 127.0.0.1, so cross-origin concerns don't apply here.
 */
class Sso extends EA_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->library('accounts');
        $this->load->model('users_model');
        $this->load->model('roles_model');
    }

    /**
     * Verify the bcgov JWT, ensure an EA user exists for that email,
     * and start a logged-in EA session for it.
     */
    public function ea_login(): void
    {
        try {
            $token = $this->_extract_token();
            if (!$token) {
                throw new InvalidArgumentException('No token provided');
            }

            $secret = getenv('JWT_SECRET_KEY') ?: '';
            if (!$secret) {
                throw new RuntimeException('JWT_SECRET_KEY not configured');
            }

            $payload = JWT::decode($token, new Key($secret, 'HS256'));
            $email = $payload->sub ?? null;
            if (!$email) {
                throw new RuntimeException('Token has no subject');
            }

            $admin_role = $this->db->get_where('roles', ['slug' => 'admin'])->row_array();
            if (empty($admin_role)) {
                throw new RuntimeException('No admin role in EA — cannot provision SSO user');
            }

            $user = $this->db->get_where('users', ['email' => $email])->row_array();
            $now = date('Y-m-d H:i:s');
            if (empty($user)) {
                $this->db->insert('users', [
                    'first_name' => 'SSO',
                    'last_name' => $email,
                    'email' => $email,
                    'id_roles' => $admin_role['id'],
                    'create_datetime' => $now,
                    'update_datetime' => $now,
                ]);
                // insert_id() is unreliable on the Postgres driver — re-
                // fetch by email so we get the actually-persisted row.
                $user = $this->db->get_where('users', ['email' => $email])->row_array();
                if (empty($user)) {
                    throw new RuntimeException('User provision failed — row not visible after insert');
                }
            } elseif ((int) $user['id_roles'] !== (int) $admin_role['id']) {
                // Existing rows may have a non-admin role (e.g. customer
                // rows seeded by the booking flow). Authoritative source
                // for SSO users is the Supabase login, so normalize them
                // to admin on every sign-in.
                $this->db->update('users', [
                    'id_roles' => $admin_role['id'],
                    'update_datetime' => $now,
                ], ['id' => $user['id']]);
                $user['id_roles'] = $admin_role['id'];
            }

            $role = $admin_role;

            $this->session->sess_regenerate();
            $payload = [
                'user_id' => (int) $user['id'],
                'user_email' => $user['email'],
                'username' => $user['email'],
                'timezone' => !empty($user['timezone']) ? $user['timezone'] : 'UTC',
                'language' => !empty($user['language']) ? $user['language'] : Config::LANGUAGE,
                'role_slug' => $role['slug'] ?? 'admin',
            ];
            session($payload);

            json_response([
                'success' => true,
                'user_id' => (int) $user['id'],
                'session' => [
                    'user_id' => session('user_id'),
                    'role_slug' => session('role_slug'),
                    'username' => session('username'),
                ],
                'role_resolved' => $role,
                'redirect' => site_url('calendar'),
            ]);
        } catch (Throwable $e) {
            json_exception($e);
        }
    }

    private function _extract_token(): ?string
    {
        $token = $this->input->post('token') ?: $this->input->get('token');
        if ($token) {
            return $token;
        }
        $auth = $this->input->get_request_header('Authorization');
        if ($auth && stripos($auth, 'Bearer ') === 0) {
            return substr($auth, 7);
        }
        return null;
    }
}
