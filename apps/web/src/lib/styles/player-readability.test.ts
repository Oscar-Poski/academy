import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const globalsCss = readFileSync(path.resolve(process.cwd(), 'app/globals.css'), 'utf8');

describe('player readability styles', () => {
  it('declares required player readability selectors', () => {
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
    const mediaMatch = globalsCss.match(/@media \(max-width: 960px\)\s*\{([\s\S]*)\}\s*$/);
    const mediaBlock = mediaMatch?.[1] ?? '';

    expect(mediaBlock).toContain('.playerActionRail');
    expect(mediaBlock).toContain('.playerActionRailInner');
    expect(mediaBlock).toContain('.playerNavBtn');
  });

  it('preserves existing button contract selectors', () => {
    expect(globalsCss).toContain('.playerNavBtn');
    expect(globalsCss).toContain('.playerCompleteBtn');
  });
});
