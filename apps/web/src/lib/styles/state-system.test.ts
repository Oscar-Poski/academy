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

describe('state system styles', () => {
  it('declares required state selectors', () => {
    expect(globalsCss).toContain('.uiCard');
    expect(globalsCss).toContain('.stateCard');
    expect(globalsCss).toContain('.stateCard--error');
    expect(globalsCss).toContain('.stateCard--empty');
    expect(globalsCss).toContain('.stateCard--loading');
    expect(globalsCss).toContain('.stateInlineNotice');
    expect(globalsCss).toContain('.stateInlineNotice--warning');
    expect(globalsCss).toContain('.stateInlineNotice--info');
    expect(globalsCss).toContain('.uiSkeletonPage');
    expect(globalsCss).toContain('.uiSkeleton');
    expect(globalsCss).toContain('.uiSkeleton--text');
    expect(globalsCss).toContain('.uiSkeleton--card');
    expect(globalsCss).toContain('.uiSkeleton--page');
    expect(globalsCss).toContain('.uiSkeletonLine');
    expect(globalsCss).toContain('.uiSkeletonPulse');
    expect(globalsCss).toContain('.stateSrOnly');
    expect(globalsCss).toContain('.stateActions');
    expect(globalsCss).toContain('.uiSkeletonPage--auth');
    expect(globalsCss).toContain('.uiSkeletonPage--catalog');
    expect(globalsCss).toContain('.uiSkeletonPage--learn');
    expect(globalsCss).not.toContain('.stateSkeleton');
    expect(globalsCss).not.toContain('.stateSkeletonLine');
    expect(globalsCss).not.toContain('.stateSkeletonPulse');
    expect(globalsCss).not.toContain('.authSkeleton');
    expect(globalsCss).not.toContain('.catalogSkeleton');
    expect(globalsCss).not.toContain('.learnSkeleton');
  });

  it('includes responsive state action behavior in mobile media block', () => {
    const mediaBlock = getMediaBlock('max-width: 960px');

    expect(mediaBlock).toContain('.stateActions');
    expect(mediaBlock).toContain('.stateActions .uiButton');
  });

  it('includes reduced-motion fallback for skeleton animation', () => {
    expect(globalsCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(globalsCss).toContain('.uiSkeletonPulse');
    expect(globalsCss).toContain('animation: none;');
  });
});
