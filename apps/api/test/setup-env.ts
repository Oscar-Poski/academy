if (!process.env.DATABASE_URL_TEST) {
  throw new Error('DATABASE_URL_TEST is required for e2e tests. Set it in apps/api/.env.test or your shell.');
}

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.JWT_SECRET = process.env.JWT_SECRET?.trim() || 'academy-test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET?.trim() || 'academy-test-refresh-jwt-secret';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN?.trim() || '604800';
