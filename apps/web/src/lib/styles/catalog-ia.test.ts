import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const globalsCss = readFileSync(path.resolve(process.cwd(), 'app/globals.css'), 'utf8');

describe('catalog IA styles', () => {
  it('declares required catalog selectors', () => {
    expect(globalsCss).toContain('.catalogHero');
    expect(globalsCss).toContain('.catalogHeroMeta');
    expect(globalsCss).toContain('.catalogStack');
    expect(globalsCss).toContain('.catalogModuleCard');
    expect(globalsCss).toContain('.catalogModuleHeader');
    expect(globalsCss).toContain('.catalogModuleBody');
    expect(globalsCss).toContain('.catalogPrimaryCta');
    expect(globalsCss).toContain('.catalogSectionList');
    expect(globalsCss).toContain('.catalogSectionRow');
    expect(globalsCss).toContain('.catalogSectionMain');
    expect(globalsCss).toContain('.catalogSectionActions');
    expect(globalsCss).toContain('.catalogLockReason');
    expect(globalsCss).toContain('.catalogMutedNotice');
  });

  it('includes responsive catalog rules in mobile media block', () => {
    const mediaMatch = globalsCss.match(/@media \(max-width: 960px\)\s*\{([\s\S]*)\}\s*$/);
    const mediaBlock = mediaMatch?.[1] ?? '';

    expect(mediaBlock).toContain('.catalogModuleHeader');
    expect(mediaBlock).toContain('.catalogPrimaryCta');
    expect(mediaBlock).toContain('.catalogSectionRow');
    expect(mediaBlock).toContain('.catalogSectionActions');
  });
});
