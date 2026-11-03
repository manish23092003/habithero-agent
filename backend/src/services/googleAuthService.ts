import { OAuth2Client } from 'google-auth-library';

export interface VerifiedGoogleUser {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}

export class GoogleAuthService {
  private static oauthClient: OAuth2Client | null = null;
  private static mockVerifier: ((idToken: string) => Promise<VerifiedGoogleUser>) | null = null;

  /**
   * Sets a mock verifier for unit and integration testing without
   * making outbound HTTP calls to Google servers.
   */
  static setMockVerifier(verifier: ((idToken: string) => Promise<VerifiedGoogleUser>) | null): void {
    this.mockVerifier = verifier;
  }

  private static getClient(): OAuth2Client {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!this.oauthClient) {
      this.oauthClient = new OAuth2Client(clientId);
    }
    return this.oauthClient;
  }

  /**
   * Verifies a Google ID token from Google Identity Services.
   * Checks cryptographic signature, expiration, audience (GOOGLE_CLIENT_ID),
   * and ensures the email is verified by Google.
   */
  static async verifyIdToken(idToken: string): Promise<VerifiedGoogleUser> {
    if (!idToken || typeof idToken !== 'string' || idToken.trim().length < 10) {
      throw new Error('Invalid Google ID token supplied.');
    }

    // Use test mock verifier if configured
    if (this.mockVerifier) {
      return this.mockVerifier(idToken);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
      throw new Error('Google Sign-In is not configured on the server. Missing GOOGLE_CLIENT_ID.');
    }

    const client = this.getClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Google authentication failed: Empty token payload.');
    }

    if (!payload.email) {
      throw new Error('Google account does not provide an email address.');
    }

    if (!payload.email_verified) {
      throw new Error('Google email address is not verified by Google.');
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture,
      emailVerified: payload.email_verified,
    };
  }
}

