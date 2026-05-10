import {
  jwtVerify,
  SignJWT,
  createRemoteJWKSet,
  type JWTPayload,
  type KeyLike,
} from 'jose';
import { env } from './env.ts';

// Supabase projects sign JWTs in one of two modes:
//   1. **Asymmetric** (RS256/ES256, default for projects created in 2024+) —
//      verification uses the project's JWKS endpoint, which exposes the
//      public key. We never need a shared secret.
//   2. **Legacy symmetric** (HS256) — a single shared `JWT_SECRET` signs
//      and verifies. Older projects + locally-run Supabase still use this
//      mode, and our cohesion test mints self-signed test tokens this way.
//
// The verifier auto-selects: JWKS if `SUPABASE_JWKS_URL` is set, otherwise
// HS256 if `SUPABASE_JWT_SECRET` is set.
let asymmetricKey: ReturnType<typeof createRemoteJWKSet> | null = null;
let symmetricKey: Uint8Array | null = null;

function resolveKey(): ReturnType<typeof createRemoteJWKSet> | Uint8Array {
  if (env.supabase.jwksUrl) {
    asymmetricKey ??= createRemoteJWKSet(new URL(env.supabase.jwksUrl));
    return asymmetricKey;
  }
  if (env.supabase.jwtSecret) {
    symmetricKey ??= new TextEncoder().encode(env.supabase.jwtSecret);
    return symmetricKey;
  }
  throw new Error(
    'Supabase JWT verifier needs either SUPABASE_JWKS_URL (asymmetric, recommended) ' +
    'or SUPABASE_JWT_SECRET (legacy HS256).'
  );
}

export interface SupabaseJwtPayload extends JWTPayload {
  sub: string;
  email?: string;
  user_metadata?: any;
  app_metadata?: any;
}

export async function verifySupabaseJwt(token: string): Promise<SupabaseJwtPayload> {
  const key = resolveKey();
  // No `algorithms` filter — we accept whatever the project signs with.
  // `jose` still validates the signature; passing a JWKS resolver picks
  // the right key/alg via the JWT's `kid` header.
  const { payload } = await jwtVerify(token, key as KeyLike);
  return payload as SupabaseJwtPayload;
}

export async function signMetabaseJwt(claims: Record<string, any>): Promise<string> {
  const secret = new TextEncoder().encode(env.metabase.embeddingSecret);
  return new SignJWT({ ...claims, exp: Math.floor(Date.now() / 1000) + 600 })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);
}
