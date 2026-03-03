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

describe('shell responsive contract styles', () => {
  it('declares mobile menu state selectors and auth action classes', () => {
    expect(globalsCss).toContain('.appHeaderMenuPanel');
    expect(globalsCss).toContain('.appHeaderMenuPanel.isOpen');
    expect(globalsCss).toContain('.appHeaderMenuButton');
    expect(globalsCss).toContain('.appAuthAction');
    expect(globalsCss).toContain('.appFooterAction');
  });

  it('keeps desktop and mobile nav contracts at the 960px breakpoint', () => {
    expect(globalsCss).toContain('@media (max-width: 960px)');

    const mediaBlock = getMediaBlock('max-width: 960px');

    expect(mediaBlock).toContain('.appHeaderMenuButton');
    expect(mediaBlock).toContain('.appHeaderMenuPanel');
    expect(mediaBlock).toContain('.appNavPrimary');
    expect(mediaBlock).toContain('.appNavSecondary');
    expect(mediaBlock).toContain('.appFooterNav');
  });

  it('includes compact shell refinements at the 640px breakpoint', () => {
    expect(globalsCss).toContain('@media (max-width: 640px)');
    const compactBlock = getMediaBlock('max-width: 640px');

    expect(compactBlock).toContain('.appHeaderInner');
    expect(compactBlock).toContain('.appFooterInner');
    expect(compactBlock).toContain('.pageShell');
    expect(compactBlock).toContain('.homeLanding');
  });

  it('retains app shell wrappers used by header/footer integration', () => {
    expect(globalsCss).toContain('.appShell');
    expect(globalsCss).toContain('.appContent');
    expect(globalsCss).toContain('.appFooter');
    expect(globalsCss).toContain('.appFooterInner');
  });
});
