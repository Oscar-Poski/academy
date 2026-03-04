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

describe('player readability styles', () => {
  it('keeps player navigation motion selectors normalized', () => {
    expect(globalsCss).toContain('.playerTreeModuleLink');
    expect(globalsCss).toContain('.playerTreeSectionLink');
    expect(globalsCss).toContain('.playerBreadcrumb a');
  });

  it('declares required player readability selectors', () => {
    expect(globalsCss).toContain('.playerCard');
    expect(globalsCss).toContain('.block');
    expect(globalsCss).toContain('.playerSidebarCard');
    expect(globalsCss).toContain('.playerMainColumn');
    expect(globalsCss).toContain('.playerRailColumn');
    expect(globalsCss).toContain('.playerActionRailCard');
    expect(globalsCss).toContain('.playerReadFrame');
    expect(globalsCss).toContain('.playerReadingColumn');
    expect(globalsCss).toContain('.playerSectionMetaList');
    expect(globalsCss).toContain('.playerActionRail');
    expect(globalsCss).toContain('.playerActionRailInner');
    expect(globalsCss).toContain('.playerActionRailLockReason');
    expect(globalsCss).toContain('.playerBlockStack');
    expect(globalsCss).toContain('.playerBlockProse');
    expect(globalsCss).toContain('.playerSidebarActiveModule');
    expect(globalsCss).toContain('.playerSidebarActiveSection');
  });

  it('includes mobile fallback rules for action rail', () => {
    const mediaBlock = getMediaBlock('max-width: 960px');

    expect(mediaBlock).toContain('.playerActionRail');
    expect(mediaBlock).toContain('.playerActionRailInner');
    expect(mediaBlock).toContain('.playerNavBtn');
  });

  it('preserves existing button contract selectors', () => {
    expect(globalsCss).toContain('.playerNavBtn');
    expect(globalsCss).toContain('.playerCompleteBtn');
  });
});
