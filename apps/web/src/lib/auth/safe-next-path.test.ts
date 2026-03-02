import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next-path';

describe('safeNextPath', () => {
  it('accepts internal app paths', () => {
    expect(safeNextPath('/learn/abc', '/')).toBe('/learn/abc');
    expect(safeNextPath('/', '/fallback')).toBe('/');
  });

  it('rejects external and protocol-relative paths', () => {
    expect(safeNextPath('https://evil.com', '/')).toBe('/');
    expect(safeNextPath('//evil.com', '/')).toBe('/');
  });

  it('falls back for empty/invalid next values', () => {
    expect(safeNextPath('', '/')).toBe('/');
    expect(safeNextPath(undefined, '/')).toBe('/');
    expect(safeNextPath('   ', '/')).toBe('/');
  });
});
