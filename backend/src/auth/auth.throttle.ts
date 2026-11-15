/**
 * Limits for the credential endpoints.
 *
 * Login and registration are the only routes an anonymous caller can drive, so
 * they are the only ones worth throttling: without this, guessing passwords or
 * creating accounts costs the attacker nothing but bandwidth.
 *
 * Positive integers only, validated at boot like the JWT settings, so a typo in
 * the environment fails the start instead of silently disabling the limit.
 */
export type AuthThrottleOptions = { ttl: number; limit: number };

export function authThrottleOptions(): AuthThrottleOptions {
  const limit = Number((process.env.AUTH_THROTTLE_LIMIT ?? '5').trim());
  const ttlSeconds = Number((process.env.AUTH_THROTTLE_TTL_SECONDS ?? '60').trim());

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error('AUTH_THROTTLE_LIMIT debe ser un entero positivo');
  }

  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error('AUTH_THROTTLE_TTL_SECONDS debe ser un entero positivo');
  }

  return { ttl: ttlSeconds * 1000, limit };
}
