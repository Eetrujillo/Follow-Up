import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * NestJS 12 publishes ESM-only packages (`"type": "module"`), so a CommonJS test
 * runner cannot even import `@nestjs/testing`. Vitest resolves ESM natively.
 *
 * The SWC plugin is what makes the Nest dependency injection work in tests:
 * `emitDecoratorMetadata` is the piece esbuild does not implement, and without it
 * the constructor parameter types disappear and every provider fails to resolve.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts', 'test/**/*.unit.spec.ts'],
    setupFiles: ['test/setup-env.ts'],
    globalSetup: ['test/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Every suite truncates the user table between tests, so two files running at
    // the same time would delete each other's fixtures.
    fileParallelism: false,
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
});
