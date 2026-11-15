import { INestApplication, ValidationPipe } from '@nestjs/common';

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
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Every route is mounted under /api. The prefix is not cosmetic: the SPA owns
  // the /calendar route, so an unprefixed GET /calendar would be served by the
  // frontend history fallback and never reach the backend.
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:4200' });
  return app;
}
