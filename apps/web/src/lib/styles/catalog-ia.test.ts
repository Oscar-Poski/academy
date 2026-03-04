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

describe('catalog IA styles', () => {
  it('declares required catalog selectors', () => {
    expect(globalsCss).toContain('.playerCard');
    expect(globalsCss).toContain('.pageCard');
    expect(globalsCss).toContain('.catalogHero');
    expect(globalsCss).toContain('.catalogHeroMeta');
    expect(globalsCss).toContain('.pathPage');
    expect(globalsCss).toContain('.pathPageStack');
    expect(globalsCss).toContain('.pathSection');
    expect(globalsCss).toContain('.pathHero');
    expect(globalsCss).toContain('.pathHeroSummary');
    expect(globalsCss).toContain('.pathHeroMeta');
    expect(globalsCss).toContain('.pathModulesStack');
    expect(globalsCss).not.toContain('.catalogStack');
    expect(globalsCss).toContain('.catalogModuleCard');
    expect(globalsCss).toContain('.catalogModuleHeader');
    expect(globalsCss).toContain('.catalogModuleHeaderMain');
    expect(globalsCss).toContain('.catalogModuleMeta');
    expect(globalsCss).toContain('.catalogModuleBody');
    expect(globalsCss).toContain('.catalogPrimaryCta');
    expect(globalsCss).toContain('.catalogSectionList');
    expect(globalsCss).toContain('.catalogSectionRow');
    expect(globalsCss).toContain('.catalogSectionMain');
    expect(globalsCss).toContain('.catalogSectionTitle');
    expect(globalsCss).toContain('.catalogSectionActions');
    expect(globalsCss).toContain('.catalogLockReason');
    expect(globalsCss).toContain('.catalogMutedNotice');
    expect(globalsCss).toContain('.coursesPage');
    expect(globalsCss).not.toContain('.coursesShell');
    expect(globalsCss).toContain('.coursesStack');
    expect(globalsCss).toContain('.coursesSection');
    expect(globalsCss).toContain('.coursesGrid');
    expect(globalsCss).toContain('.coursesCard');
    expect(globalsCss).toContain('.coursesCardMeta');
    expect(globalsCss).toContain('.coursesCardCta');
    expect(globalsCss).toContain('.progressBadge');
  });

  it('includes responsive catalog rules in mobile media block', () => {
    const mediaBlock = getMediaBlock('max-width: 960px');

    expect(mediaBlock).toContain('.catalogModuleHeader');
    expect(mediaBlock).toContain('.catalogPrimaryCta');
    expect(mediaBlock).toContain('.catalogSectionRow');
    expect(mediaBlock).toContain('.catalogSectionActions');
    expect(mediaBlock).toContain('.coursesGrid');
    expect(mediaBlock).toContain('.coursesCardCta');
  });

  it('keeps compact catalog spacing rules in 640px media block', () => {
    const compactBlock = getMediaBlock('max-width: 640px');
    expect(compactBlock).toContain('.catalogSectionRow');
    expect(compactBlock).toContain('.catalogModuleCard');
  });
});
