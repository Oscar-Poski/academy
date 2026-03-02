import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const globalsCss = readFileSync(path.resolve(process.cwd(), 'app/globals.css'), 'utf8');

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
    const mediaMatch = globalsCss.match(/@media \(max-width: 960px\)\s*\{([\s\S]*)\}\s*$/);
    const mediaBlock = mediaMatch?.[1] ?? '';

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
