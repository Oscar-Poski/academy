export function getTempUserId(): string {
  const userId = process.env.NEXT_PUBLIC_TEMP_USER_ID?.trim();

  if (!userId) {
    throw new Error('NEXT_PUBLIC_TEMP_USER_ID is required for progress endpoints in PR-4');
  }

  // TODO(auth): Replace temporary NEXT_PUBLIC_TEMP_USER_ID with JWT/session-derived user identity.
  return userId;
}
