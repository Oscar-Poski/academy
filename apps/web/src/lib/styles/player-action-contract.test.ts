import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const globalsCss = readFileSync(path.resolve(process.cwd(), 'app/globals.css'), 'utf8');

describe('player action contract styles', () => {
  it('preserves action rail and lock reason selectors', () => {
    expect(globalsCss).toContain('.playerActionRail');
    expect(globalsCss).toContain('.playerActionRailInner');
    expect(globalsCss).toContain('.playerActionRailLockReason');
    expect(globalsCss).toContain('.playerNavLockReason');
  });

  it('preserves completion blocked and error surfaces', () => {
    expect(globalsCss).toContain('.completionBlockedCard');
    expect(globalsCss).toContain('.completionBlockedTitle');
    expect(globalsCss).toContain('.completionBlockedReasons');
    expect(globalsCss).toContain('.completionBlockedActions');
    expect(globalsCss).toContain('.playerFooterError');
  });

  it('keeps core player control selectors to prevent interaction regressions', () => {
    expect(globalsCss).toContain('.playerNavBtn');
    expect(globalsCss).toContain('.playerCompleteBtn');
    expect(globalsCss).toContain('.quizSubmitBtn');
    expect(globalsCss).toContain('.quizRetryBtn');
  });
});
