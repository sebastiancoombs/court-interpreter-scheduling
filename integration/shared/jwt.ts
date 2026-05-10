import { jwtVerify, SignJWT } from 'jose';
import { env } from './env.ts';

const supabaseSecret = new TextEncoder().encode(env.supabase.jwtSecret);

export async function verifySupabaseJwt(token: string) {
  const { payload } = await jwtVerify(token, supabaseSecret, { algorithms: ['HS256'] });
  return payload as { sub: string; email?: string; user_metadata?: any; app_metadata?: any };
}

export async function signMetabaseJwt(claims: Record<string, any>): Promise<string> {
  const secret = new TextEncoder().encode(env.metabase.embeddingSecret);
  return new SignJWT({ ...claims, exp: Math.floor(Date.now() / 1000) + 600 })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);
}
