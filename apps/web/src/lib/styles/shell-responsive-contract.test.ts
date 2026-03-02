import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const globalsCss = readFileSync(path.resolve(process.cwd(), 'app/globals.css'), 'utf8');

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

    const mediaMatch = globalsCss.match(/@media \(max-width: 960px\)\s*\{([\s\S]*)\}\s*$/);
    const mediaBlock = mediaMatch?.[1] ?? '';

    expect(mediaBlock).toContain('.appHeaderMenuButton');
    expect(mediaBlock).toContain('.appHeaderMenuPanel');
    expect(mediaBlock).toContain('.appNavPrimary');
    expect(mediaBlock).toContain('.appNavSecondary');
    expect(mediaBlock).toContain('.appFooterNav');
  });

  it('retains app shell wrappers used by header/footer integration', () => {
    expect(globalsCss).toContain('.appShell');
    expect(globalsCss).toContain('.appContent');
    expect(globalsCss).toContain('.appFooter');
    expect(globalsCss).toContain('.appFooterInner');
  });
});
