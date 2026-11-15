import { afterEach, describe, expect, it } from 'vitest';
import { trustProxyHops } from '../src/app.setup';

/**
 * trustProxyHops decides whether the throttler budgets the real client or the
 * socket address, so a bad value must fail the boot instead of silently
 * disabling proxy trust — including the empty string, which Number() coerces
 * to 0 and would silently reactivate the shared-bucket behavior.
 */
describe('trustProxyHops boot validation', () => {
  const original = process.env.TRUST_PROXY_HOPS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.TRUST_PROXY_HOPS;
    } else {
      process.env.TRUST_PROXY_HOPS = original;
    }
  });

  it('defaults to one hop (the host nginx) when the variable is absent', () => {
    delete process.env.TRUST_PROXY_HOPS;
    expect(trustProxyHops()).toBe(1);
  });

  it('accepts any non-negative integer, including 0 (direct exposure)', () => {
    process.env.TRUST_PROXY_HOPS = '0';
    expect(trustProxyHops()).toBe(0);
    process.env.TRUST_PROXY_HOPS = '3';
    expect(trustProxyHops()).toBe(3);
  });

  it('rejects negative, fractional, and non-numeric values', () => {
    for (const bad of ['-1', '1.5', 'abc']) {
      process.env.TRUST_PROXY_HOPS = bad;
      expect(() => trustProxyHops()).toThrow(/TRUST_PROXY_HOPS/);
    }
  });

  it('rejects the empty string instead of silently coercing it to 0', () => {
    process.env.TRUST_PROXY_HOPS = '';
    expect(() => trustProxyHops()).toThrow(/TRUST_PROXY_HOPS/);
    process.env.TRUST_PROXY_HOPS = '   ';
    expect(() => trustProxyHops()).toThrow(/TRUST_PROXY_HOPS/);
  });
});
