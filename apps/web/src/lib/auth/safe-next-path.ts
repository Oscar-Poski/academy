export function safeNextPath(nextValue: unknown, fallback = '/'): string {
  if (typeof nextValue !== 'string') {
    return fallback;
  }

  const trimmed = nextValue.trim();
  if (trimmed.length === 0) {
    return fallback;
  }

  if (!trimmed.startsWith('/')) {
    return fallback;
  }

  if (trimmed.startsWith('//')) {
    return fallback;
  }

  return trimmed;
}
