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

describe('app shell styles', () => {
  it('declares required shell selectors', () => {
    expect(globalsCss).toContain('.skipLink');
    expect(globalsCss).toContain('.appHeaderMainNav');
    expect(globalsCss).toContain('.appHeaderMenuButton');
    expect(globalsCss).toContain('.appHeaderMenuPanel');
    expect(globalsCss).toContain('.appNavPrimary');
    expect(globalsCss).toContain('.appNavSecondary');
    expect(globalsCss).toContain('.appNavLink');
    expect(globalsCss).toContain('.appNavLink--active');
    expect(globalsCss).toContain('.appFooter');
    expect(globalsCss).toContain('.appFooterInner');
    expect(globalsCss).toContain('.appFooterMeta');
    expect(globalsCss).toContain('.appFooterNav');
  });

  it('includes responsive mobile menu styles under the 960px media query', () => {
    const mediaBlock = getMediaBlock('max-width: 960px');

    expect(mediaBlock).toContain('.appHeaderMenuButton');
    expect(mediaBlock).toContain('.appHeaderMenuPanel');
    expect(mediaBlock).toContain('.appHeaderMenuPanel.isOpen');
    expect(mediaBlock).toContain('.appNavPrimary');
    expect(mediaBlock).toContain('.appNavSecondary');
  });

  it('defines menu panel/button classes to avoid unresolved shell contracts', () => {
    const menuButtonUsages = (globalsCss.match(/\.appHeaderMenuButton/g) ?? []).length;
    const menuPanelUsages = (globalsCss.match(/\.appHeaderMenuPanel/g) ?? []).length;

    expect(menuButtonUsages).toBeGreaterThan(0);
    expect(menuPanelUsages).toBeGreaterThan(0);
  });
});
