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
  it('declares required semantic tokens and removes migration aliases', () => {
    expect(globalsCss).toContain('--color-accent-300: #f9d14f;');
    expect(globalsCss).toContain('--color-accent-400: #f5c518;');
    expect(globalsCss).toContain('--color-bg-canvas:');
    expect(globalsCss).toContain('--color-surface-1:');
    expect(globalsCss).toContain('--color-surface-2:');
    expect(globalsCss).toContain('--color-text-primary:');
    expect(globalsCss).toContain('--color-text-muted:');
    expect(globalsCss).toContain('--color-border-default:');
    expect(globalsCss).toContain('--color-action-bg:');
    expect(globalsCss).toContain('--color-focus-ring:');
    expect(globalsCss).toContain('--color-status-success-bg:');
    expect(globalsCss).toContain('--color-status-warning-bg:');
    expect(globalsCss).toContain('--color-status-danger-bg:');
    expect(globalsCss).not.toContain('--bg:');
    expect(globalsCss).not.toContain('--panel:');
    expect(globalsCss).not.toContain('--surface-1: var(');
    expect(globalsCss).not.toContain('--surface-2: var(');
    expect(globalsCss).not.toContain('--text:');
    expect(globalsCss).not.toContain('--muted:');
    expect(globalsCss).not.toContain('--accent:');
    expect(globalsCss).not.toContain('--accent-soft:');
    expect(globalsCss).not.toContain('--ok:');
    expect(globalsCss).not.toContain('--border:');
  });

  it('maps typography tokens to next/font CSS variables', () => {
    expect(globalsCss).toContain("--font-display: var(--font-ui), 'Inter', 'Segoe UI', sans-serif;");
    expect(globalsCss).toContain("--font-body: var(--font-ui), 'Inter', 'Segoe UI', sans-serif;");
    expect(globalsCss).toContain(
      "--font-mono: var(--font-mono-ui), 'JetBrains Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;"
    );
  });

  it('uses CSS vars in core shell selectors', () => {
    const body = getRuleBlock('body');
    expect(body).toContain('var(--color-bg-glow)');
    expect(body).toContain('var(--color-bg-canvas)');
    expect(body).toContain('var(--color-text-primary)');

    const uiButton = getRuleBlock('.uiButton');
    expect(uiButton).toContain('var(--color-action-border)');
    expect(uiButton).toContain('var(--color-action-bg)');
    expect(uiButton).toContain('var(--color-text-primary)');

    const playerCard = getRuleBlock('.playerCard');
    expect(playerCard).toContain('var(--color-border-default)');
    expect(playerCard).toContain('var(--color-surface-1)');

    const progressBadge = getRuleBlock('.progressBadge');
    expect(progressBadge).toContain('var(--color-action-border)');
    expect(progressBadge).toContain('var(--color-status-info-bg)');
    expect(progressBadge).toContain('var(--color-status-info-text)');

    const quizQuestionCard = getRuleBlock('.quizQuestionCard');
    expect(quizQuestionCard).toContain('var(--color-border-default)');
    expect(quizQuestionCard).toContain('var(--color-surface-2)');

    const interactiveCard = getRuleBlock('.uiCard--interactive');
    expect(interactiveCard).toContain('var(--dur-base)');
  });

  it('has no unresolved border token usage', () => {
    const borderVarUsageCount = (globalsCss.match(/var\(--border\)/g) ?? []).length;
    expect(borderVarUsageCount).toBe(0);
  });

  it('defines a shared focus-visible treatment for interactive controls', () => {
    expect(globalsCss).toContain(':where(a, button, input, textarea, select, [tabindex]):focus-visible');
    expect(globalsCss).toContain('outline: 2px solid var(--color-focus-ring)');
  });

  it('limits button variants to primary, secondary, and ghost', () => {
    expect(globalsCss).toContain('.uiButton--primary');
    expect(globalsCss).toContain('.uiButton--secondary');
    expect(globalsCss).toContain('.uiButton--ghost');
    expect(globalsCss).not.toContain('.uiButton--danger');
  });
});
