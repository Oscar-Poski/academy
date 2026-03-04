import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const globalsCss = readFileSync(path.resolve(process.cwd(), 'app/globals.css'), 'utf8');

function getMediaBlock(query: string): string {
  const marker = `@media (${query})`;
  const start = globalsCss.indexOf(marker);
  if (start === -1) {
    return '';
  }

  const openBraceIndex = globalsCss.indexOf('{', start);
  if (openBraceIndex === -1) {
    return '';
  }

  let depth = 0;
  for (let index = openBraceIndex; index < globalsCss.length; index += 1) {
    const char = globalsCss[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return globalsCss.slice(openBraceIndex + 1, index);
      }
    }
  }

  return '';
}

describe('layout primitives styles', () => {
  it('declares layout primitive selectors and variants', () => {
    expect(globalsCss).toContain('.uiContainer');
    expect(globalsCss).toContain('.uiContainer--content');
    expect(globalsCss).toContain('.uiContainer--wide');
    expect(globalsCss).toContain('.uiContainer--full');
    expect(globalsCss).toContain('.uiSection');
    expect(globalsCss).toContain('.uiSection--sm');
    expect(globalsCss).toContain('.uiSection--md');
    expect(globalsCss).toContain('.uiSection--lg');
    expect(globalsCss).toContain('.uiSection--none');
    expect(globalsCss).toContain('.uiSection--soft');
    expect(globalsCss).toContain('.uiStack');
    expect(globalsCss).toContain('.uiStack--xs');
    expect(globalsCss).toContain('.uiStack--sm');
    expect(globalsCss).toContain('.uiStack--md');
    expect(globalsCss).toContain('.uiStack--lg');
  });

  it('keeps legacy compatibility selectors for shell and stack', () => {
    expect(globalsCss).toContain('.pageShell');
    expect(globalsCss).toContain('.pageStack');
    expect(globalsCss).toContain('.catalogStack');
    expect(globalsCss).toContain('.coursesShell');
  });

  it('includes compact breakpoint behavior for uiContainer', () => {
    const compactBlock = getMediaBlock('max-width: 640px');

    expect(compactBlock).toContain('.uiContainer');
    expect(compactBlock).toContain('.uiContainer--content');
  });
});
