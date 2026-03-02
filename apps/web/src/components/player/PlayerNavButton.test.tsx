import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerNavButton } from './PlayerNavButton';

const routerPush = vi.fn();
const updateSectionPosition = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPush
  })
}));

vi.mock('@/src/lib/api-clients/progress.browser', () => ({
  updateSectionPosition: (...args: unknown[]) => updateSectionPosition(...args)
}));

describe('PlayerNavButton', () => {
  beforeEach(() => {
    routerPush.mockReset();
    updateSectionPosition.mockReset();
  });

  it('renders disabled state when target is missing', () => {
    render(
      <PlayerNavButton
        direction="next"
        label="Next Section"
        targetSectionId={null}
        currentSectionId="section-1"
        lastBlockOrderToPersist={2}
      />
    );

    expect(screen.getByText('Next Section')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('button', { name: 'Next Section' })).not.toBeInTheDocument();
  });

  it('renders disabled state when target is locked', () => {
    render(
      <PlayerNavButton
        direction="prev"
        label="Previous Section"
        targetSectionId="section-0"
        currentSectionId="section-1"
        lastBlockOrderToPersist={2}
        isLocked
      />
    );

    expect(screen.getByText('Previous Section')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('button', { name: 'Previous Section' })).not.toBeInTheDocument();
  });

  it('attempts best-effort checkpoint then navigates when unlocked', async () => {
    updateSectionPosition.mockResolvedValue({});

    render(
      <PlayerNavButton
        direction="next"
        label="Next Section"
        targetSectionId="section-2"
        currentSectionId="section-1"
        lastBlockOrderToPersist={5}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next Section' }));

    await waitFor(() => {
      expect(updateSectionPosition).toHaveBeenCalledWith('section-1', {
        last_block_order: 5,
        time_spent_delta: 0
      });
      expect(routerPush).toHaveBeenCalledWith('/learn/section-2');
    });
  });

  it('still navigates when checkpoint save fails', async () => {
    updateSectionPosition.mockRejectedValue(new Error('network'));

    render(
      <PlayerNavButton
        direction="next"
        label="Next Section"
        targetSectionId="section-2"
        currentSectionId="section-1"
        lastBlockOrderToPersist={5}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next Section' }));

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith('/learn/section-2');
    });
  });
});
