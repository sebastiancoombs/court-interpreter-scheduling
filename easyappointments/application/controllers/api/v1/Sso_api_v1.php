<?php defined('BASEPATH') or exit('No direct script access allowed');

/* ----------------------------------------------------------------------------
 * SSO endpoint — accepts a Supabase JWT and establishes an EA session.
 *
 * POST /index.php/api/v1/sso/exchange
 * Header: Authorization: Bearer <supabase-jwt>
 *
 * Returns 204 + Set-Cookie: ci_session=…   on success.
 * Returns 401                              if the JWT is invalid or no EA user
 *                                          is linked.
 *
 * This is the EA half of the integration/auth-bridge `/exchange/ea` flow.
 * ---------------------------------------------------------------------------- */

class Sso_api_v1 extends EA_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->library('supabase_auth');
    }

    public function exchange(): void
    {
        $user = $this->supabase_auth->authenticate_request();
        if (!$user) {
            $this->output
                ->set_status_header(401)
                ->set_content_type('application/json')
                ->set_output(json_encode(['error' => 'invalid_supabase_jwt']));
            return;
        }
        $this->output->set_status_header(204);
    }
}
