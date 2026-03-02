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

describe('design token baseline', () => {
  it('declares required semantic tokens and backward-compat aliases', () => {
    expect(globalsCss).toContain('--color-bg-canvas:');
    expect(globalsCss).toContain('--color-surface-1:');
    expect(globalsCss).toContain('--color-surface-2:');
    expect(globalsCss).toContain('--color-text-primary:');
    expect(globalsCss).toContain('--color-text-muted:');
    expect(globalsCss).toContain('--color-border-default:');
    expect(globalsCss).toContain('--color-action-bg:');
    expect(globalsCss).toContain('--color-status-success-bg:');
    expect(globalsCss).toContain('--color-status-warning-bg:');
    expect(globalsCss).toContain('--color-status-danger-bg:');
    expect(globalsCss).toContain('--border:');
  });

  it('uses CSS vars in core shell selectors', () => {
    const body = getRuleBlock('body');
    expect(body).toContain('var(--color-bg-glow)');
    expect(body).toContain('var(--color-bg-canvas)');
    expect(body).toContain('var(--color-text-primary)');

    const appAuthAction = getRuleBlock('.appAuthAction');
    expect(appAuthAction).toContain('var(--color-action-border)');
    expect(appAuthAction).toContain('var(--color-action-bg)');
    expect(appAuthAction).toContain('var(--color-text-primary)');

    const playerCard = getRuleBlock('.playerCard');
    expect(playerCard).toContain('var(--color-border-default)');
    expect(playerCard).toContain('var(--color-surface-1)');

    const progressBadge = getRuleBlock('.progressBadge');
    expect(progressBadge).toContain('var(--color-action-border)');
    expect(progressBadge).toContain('var(--color-status-info-bg)');
    expect(progressBadge).toContain('var(--color-status-info-text)');

    const quizQuestionCard = getRuleBlock('.quizQuestionCard');
    expect(quizQuestionCard).toContain('var(--border)');
    expect(quizQuestionCard).toContain('var(--color-surface-2)');
  });

  it('has no unresolved border token usage', () => {
    const borderVarUsageCount = (globalsCss.match(/var\(--border\)/g) ?? []).length;
    if (borderVarUsageCount > 0) {
      expect(globalsCss).toContain('--border:');
    }
    expect(borderVarUsageCount).toBeGreaterThan(0);
  });

  it('defines a shared focus-visible treatment for interactive controls', () => {
    expect(globalsCss).toContain(':where(a, button, input, textarea, select, [tabindex]):focus-visible');
    expect(globalsCss).toContain('outline: 2px solid var(--color-accent-300)');
  });
});
