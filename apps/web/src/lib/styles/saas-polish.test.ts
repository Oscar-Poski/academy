import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const globalsCss = readFileSync(path.resolve(process.cwd(), 'app/globals.css'), 'utf8');

function getRuleBlock(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`);
  const match = globalsCss.match(regex);
  return match?.[1] ?? '';
}

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

describe('saas polish styles', () => {
  it('declares landing and catalog polish selectors', () => {
    expect(globalsCss).toContain('.uiCard--interactive');
    expect(globalsCss).toContain('.homeSection');
    expect(globalsCss).toContain('.homeSectionHeader');
    expect(globalsCss).toContain('.homeSectionTitle');
    expect(globalsCss).toContain('.homeSectionDescription');
    expect(globalsCss).toContain('.homeCard');
    expect(globalsCss).toContain('.homePersonalizedStrip');
    expect(globalsCss).toContain('.homeHero');
    expect(globalsCss).toContain('.homeHeroTitleAccent');
    expect(globalsCss).toContain('.homeHeroSupportList');
    expect(globalsCss).toContain('.homeHeroSupportItem');
    expect(globalsCss).toContain('.homeHeroActions');
    expect(globalsCss).toContain('.homeFeaturedCard');
    expect(globalsCss).toContain('.coursesPage');
    expect(globalsCss).toContain('.coursesCard');
    expect(globalsCss).toContain('.catalogModuleCard');
    expect(globalsCss).toContain('.authPage');
    expect(globalsCss).toContain('.authPageStack');
    expect(globalsCss).toContain('.authShell');
    expect(globalsCss).toContain('.authShellHeader');
    expect(globalsCss).toContain('.authShellEyebrow');
    expect(globalsCss).toContain('.authForm');
    expect(globalsCss).toContain('.authFormHeader');
    expect(globalsCss).toContain('.authFormFields');
    expect(globalsCss).toContain('.authFormFooter');
    expect(globalsCss).toContain('.authFormLinkRow');
  });

  it('includes subtle motion hooks on cards and actions', () => {
    const interactiveCard = getRuleBlock('.uiCard--interactive');
    expect(interactiveCard).toContain('transition:');
    expect(globalsCss).toContain('.uiCard--interactive:hover');

    const featuredCard = getRuleBlock('.homeFeaturedCard');
    expect(featuredCard).toContain('transition:');
    expect(globalsCss).toContain('.homeFeaturedCard:hover');

    const coursesCard = getRuleBlock('.coursesCard');
    expect(coursesCard).toContain('transition:');
    expect(globalsCss).toContain('.coursesCard:hover');

    const catalogModuleCard = getRuleBlock('.catalogModuleCard');
    expect(catalogModuleCard).toContain('transition:');
    expect(globalsCss).toContain('.catalogModuleCard:hover');

    const authAction = getRuleBlock('.appAuthAction:hover');
    expect(authAction).toContain('transform:');

    const pageActionLink = getRuleBlock('.pageActionLink');
    expect(pageActionLink).toContain('transition:');

    const catalogAuthPromptLink = getRuleBlock('.catalogAuthPromptLink');
    expect(catalogAuthPromptLink).toContain('transition:');
  });

  it('keeps reduced-motion and compact-breakpoint contracts', () => {
    const reducedMotion = getMediaBlock('prefers-reduced-motion: reduce');
    expect(reducedMotion).toContain('.uiCard--interactive');
    expect(reducedMotion).toContain('.homeFeaturedCard');
    expect(reducedMotion).toContain('.coursesCard');
    expect(reducedMotion).toContain('.catalogModuleCard');
    expect(reducedMotion).toContain('.pageActionLink');
    expect(reducedMotion).toContain('.catalogAuthPromptLink');
    expect(reducedMotion).toContain('.playerTreeModuleLink');
    expect(reducedMotion).toContain('.playerTreeSectionLink');
    expect(reducedMotion).toContain('.playerBreadcrumb a');
    expect(reducedMotion).toContain('.playerCompleteBtn');
    expect(reducedMotion).toContain('.quizSubmitBtn');
    expect(reducedMotion).toContain('.quizRetryBtn');
    expect(reducedMotion).toContain('transition: none;');

    const compactBlock = getMediaBlock('max-width: 640px');
    expect(compactBlock).not.toContain('.pageShell');
    expect(compactBlock).toContain('.homeLanding');
    expect(compactBlock).toContain('.homeHeroTitle');
    expect(compactBlock).toContain('.catalogSectionRow');
    expect(compactBlock).toContain('.homeHeroProof');
  });
});
