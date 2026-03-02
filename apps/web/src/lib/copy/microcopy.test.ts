import { describe, expect, it } from 'vitest';
import { microcopy } from './microcopy';

describe('microcopy', () => {
  it('defines consistent auth action labels', () => {
    expect(microcopy.auth.actions.logIn).toBe('Log in');
    expect(microcopy.auth.actions.signUp).toBe('Sign up');
    expect(microcopy.auth.actions.logOut).toBe('Log out');
  });

  it('defines deterministic known auth and player error copy', () => {
    expect(microcopy.auth.errors.invalidCredentials).toBe('Invalid email or password.');
    expect(microcopy.auth.errors.rateLimited).toBe('Too many auth attempts. Try again later.');
    expect(microcopy.player.complete.completeFailed).toBe('Unable to mark section complete. Try again.');
    expect(microcopy.quiz.submitFailed).toBe('Unable to submit quiz right now. Try again.');
  });

  it('provides global state copy used by error and skeleton surfaces', () => {
    expect(microcopy.state.loadingPage).toBe('Loading page content');
    expect(microcopy.state.globalError.title).toBe('Something went wrong');
    expect(microcopy.state.globalError.tryAgain).toBe('Try again');
  });
});
