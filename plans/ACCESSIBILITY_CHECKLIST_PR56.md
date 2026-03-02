# PR-56 Accessibility Checklist (Critical Pass)

Use this checklist before merge and record outcomes. Scope is critical-only blocker prevention, not full WCAG AA closure.

## Run Context
- Date:
- Environment:
- Tester:
- Branch/commit:

## Keyboard-Only Navigation
- [ ] `/` can be navigated using keyboard only.
- [ ] `/paths/:pathId` can be navigated using keyboard only.
- [ ] `/modules/:moduleId` can be navigated using keyboard only.
- [ ] `/learn/:sectionId` can be navigated using keyboard only.
- [ ] `/login` and `/signup` can be completed using keyboard only.

## Focus Visibility
- [ ] Focus ring is clearly visible on links, buttons, and form inputs.
- [ ] Focus ring remains visible in dark surfaces (header, cards, player controls).
- [ ] No keyboard trap is observed in mobile menu or player actions.

## Header Menu Behavior
- [ ] Opening menu moves focus to first actionable item.
- [ ] Pressing `Escape` closes menu.
- [ ] On `Escape` close, focus returns to menu toggle button.
- [ ] Menu actions close the menu reliably.

## Auth Form Semantics
- [ ] Invalid field states set `aria-invalid=true`.
- [ ] Error text remains associated with input via `aria-describedby`.
- [ ] Login/signup error messaging is announced/readable and non-blocking.

## Loading/Error/Notice Semantics
- [ ] Loading skeleton exposes a readable loading status message.
- [ ] Decorative skeleton blocks are hidden from assistive tech.
- [ ] Global error page presents primary heading and retry action.
- [ ] Inline non-fatal notices are readable and not raw/unstructured text.

## Reduced Motion
- [ ] With reduced-motion preference, skeleton pulse animation is disabled.

## Findings
- Passes:
- Failures:
- Follow-up tickets:
