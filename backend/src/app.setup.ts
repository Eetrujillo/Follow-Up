import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Express } from 'express';

/**
 * How many reverse-proxy hops sit in front of the application. One hop is the
 * host nginx publishing the loopback port, so req.ip becomes the real client
 * address and the credential throttler can budget per client instead of per
 * deployment. Zero disables it: req.ip is then the socket address, which is
 * only correct when nothing is in front — trusting forwarded headers while
 * being directly reachable would let an attacker rotate fake IPs and evade
 * the throttle entirely. Validated at boot like the other environment knobs.
 */
export function trustProxyHops(): number {
  const raw = (process.env.TRUST_PROXY_HOPS ?? '1').trim();
  const hops = Number(raw);

  // Number('') is 0, so an empty value would silently disable proxy trust and
  // reactivate the shared-bucket throttle this setting exists to prevent.
  if (raw === '' || !Number.isInteger(hops) || hops < 0) {
    throw new Error('TRUST_PROXY_HOPS debe ser un entero mayor o igual a 0');
  }

  return hops;
}

/**
 * Single place where the HTTP surface is configured, so the e2e suite boots an
 * application with exactly the production shape: same global prefix, same pipes,
 * same CORS origin.
 *
 * Duplicating this in the tests is how a suite goes green while the deployment
 * answers 404 on every call, which is the failure this project already paid for
 * once with the /api prefix.
 */
export function configureApp(app: INestApplication): INestApplication {
  const hops = trustProxyHops();
  if (hops > 0) {
    (app.getHttpAdapter().getInstance() as Express).set('trust proxy', hops);
  }
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Every route is mounted under /api. The prefix is not cosmetic: the SPA owns
  // the /calendar route, so an unprefixed GET /calendar would be served by the
  // frontend history fallback and never reach the backend.
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:4200' });
  return app;
}
