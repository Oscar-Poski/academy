import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const globalsCss = readFileSync(path.resolve(process.cwd(), 'app/globals.css'), 'utf8');

describe('state system styles', () => {
  it('declares required state selectors', () => {
    expect(globalsCss).toContain('.stateCard');
    expect(globalsCss).toContain('.stateCard--error');
    expect(globalsCss).toContain('.stateCard--empty');
    expect(globalsCss).toContain('.stateCard--loading');
    expect(globalsCss).toContain('.stateInlineNotice');
    expect(globalsCss).toContain('.stateInlineNotice--warning');
    expect(globalsCss).toContain('.stateInlineNotice--info');
    expect(globalsCss).toContain('.stateSkeleton');
    expect(globalsCss).toContain('.stateSkeletonLine');
    expect(globalsCss).toContain('.stateSkeletonPulse');
    expect(globalsCss).toContain('.stateActions');
    expect(globalsCss).toContain('.authSkeleton');
    expect(globalsCss).toContain('.catalogSkeleton');
    expect(globalsCss).toContain('.learnSkeleton');
  });

  it('includes responsive state action behavior in mobile media block', () => {
    const mediaMatch = globalsCss.match(/@media \(max-width: 960px\)\s*\{([\s\S]*)\}\s*$/);
    const mediaBlock = mediaMatch?.[1] ?? '';

    expect(mediaBlock).toContain('.stateActions');
    expect(mediaBlock).toContain('.stateActions .uiButton');
  });
});
