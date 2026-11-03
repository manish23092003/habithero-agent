/**
 * Production environment security validator.
 * Fails safely at startup if required production security settings are absent or insecure.
 */
export function validateProductionConfig(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    return;
  }

  const errors: string[] = [];

  // 1. Require secure JWT_SECRET (must not be missing or equal to known development secrets)
  const jwtSecret = process.env.JWT_SECRET;
  const insecureSecrets = [
    'habithero_development_jwt_secret_token_2026',
    'your_jwt_secret_key_change_in_production',
    'default_secret',
    'secret',
  ];

  if (!jwtSecret || jwtSecret.trim() === '') {
    errors.push('JWT_SECRET must be defined in production.');
  } else if (insecureSecrets.includes(jwtSecret.trim()) || jwtSecret.trim().length < 16) {
    errors.push('JWT_SECRET cannot use default development fallback and must be at least 16 characters in production.');
  }

  // 2. Require persistent MONGODB_URI in production
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri || mongoUri.trim() === '') {
    errors.push('MONGODB_URI must be explicitly defined in production. In-memory MongoDB is strictly prohibited in production.');
  }

  // 3. Require explicitly configured FRONTEND_URL for CORS and password reset links
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl || frontendUrl.trim() === '') {
    errors.push('FRONTEND_URL must be explicitly configured in production to enforce strict CORS boundaries.');
  }

  // 4. Validate Resend API configuration if provided
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey || resendApiKey.trim() === '') {
    console.warn('[CONFIG WARNING] RESEND_API_KEY is not set. Transactional password reset emails require a valid Resend API key.');
  } else if (!resendApiKey.trim().startsWith('re_')) {
    errors.push('RESEND_API_KEY must be a valid Resend key starting with "re_".');
  }

  if (errors.length > 0) {
    const message = `[FATAL CONFIGURATION ERROR] Refusing to start in production mode:\n${errors.map(e => `  - ${e}`).join('\n')}`;
    console.error(message);
    throw new Error(message);
  }
}
