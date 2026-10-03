import { createRemoteJWKSet, jwtVerify } from 'jose';

import { ApiError, unauthorized } from '../errors.js';

export interface VerifiedIdentity {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

function requireConfigured(provider: string, audiences: string[]) {
  if (audiences.length === 0) {
    throw new ApiError(503, 'provider_not_configured', `${provider} sign-in is not configured on the server yet`);
  }
}

export async function verifyAppleIdToken(idToken: string, audiences: string[]): Promise<VerifiedIdentity> {
  requireConfigured('Apple', audiences);
  try {
    const { payload } = await jwtVerify(idToken, appleJwks, {
      issuer: 'https://appleid.apple.com',
      audience: audiences,
    });
    if (!payload.sub) throw new Error('missing sub');
    const email = typeof payload.email === 'string' ? payload.email : null;
    // Apple sends booleans as either true or "true".
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    return { subject: payload.sub, email, emailVerified, name: null };
  } catch {
    throw unauthorized('Apple identity token could not be verified');
  }
}

export async function verifyGoogleIdToken(idToken: string, audiences: string[]): Promise<VerifiedIdentity> {
  requireConfigured('Google', audiences);
  try {
    const { payload } = await jwtVerify(idToken, googleJwks, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: audiences,
    });
    if (!payload.sub) throw new Error('missing sub');
    return {
      subject: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      emailVerified: payload.email_verified === true,
      name: typeof payload.name === 'string' ? payload.name : null,
    };
  } catch {
    throw unauthorized('Google identity token could not be verified');
  }
}
