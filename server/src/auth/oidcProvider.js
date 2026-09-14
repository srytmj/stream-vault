import { config } from '../config.js';
import { findOrCreateOidcUser } from './userStore.js';
import { signToken } from './tokenService.js';

/**
 * OpenID Connect (OIDC) / SSO Service Infrastructure
 * Designed for plug-and-play integration with any standard OIDC Provider
 * (Keycloak, Authentik, Authelia, Zitadel, Okta, Google, or custom OAuth2/OIDC servers)
 */
export class OidcProvider {
  constructor() {
    this.config = config.OIDC;
    this.discoveryCache = null;
    this.discoveryExpiresAt = 0;
  }

  /**
   * Check if OIDC is configured and enabled
   */
  isEnabled() {
    return !!(this.config.enabled && this.config.issuerUrl && this.config.clientId);
  }

  /**
   * Fetch OIDC discovery document (/.well-known/openid-configuration)
   */
  async getDiscovery() {
    if (!this.isEnabled()) {
      return null;
    }

    if (this.discoveryCache && Date.now() < this.discoveryExpiresAt) {
      return this.discoveryCache;
    }

    try {
      const wellKnownUrl = this.config.issuerUrl.replace(/\/$/, '') + '/.well-known/openid-configuration';
      const res = await fetch(wellKnownUrl, { headers: { Accept: 'application/json' } });
      if (!res.ok) {
        throw new Error(`Failed to fetch OIDC discovery: HTTP ${res.status}`);
      }
      this.discoveryCache = await res.json();
      this.discoveryExpiresAt = Date.now() + 60 * 60 * 1000; // Cache 1 hour
      return this.discoveryCache;
    } catch (err) {
      console.warn(`[OIDC] Discovery fetch failed for ${this.config.issuerUrl}:`, err.message);
      // Fallback endpoints if well-known fails or custom paths
      return {
        authorization_endpoint: `${this.config.issuerUrl.replace(/\/$/, '')}/protocol/openid-connect/auth`,
        token_endpoint: `${this.config.issuerUrl.replace(/\/$/, '')}/protocol/openid-connect/token`,
        userinfo_endpoint: `${this.config.issuerUrl.replace(/\/$/, '')}/protocol/openid-connect/userinfo`,
      };
    }
  }

  /**
   * Generate authorization URL to redirect the user to the SSO/OIDC provider
   */
  async getAuthorizationUrl(state = 'sv_oidc_state') {
    if (!this.isEnabled()) {
      throw new Error('OIDC is not enabled or configured in StreamVault');
    }

    const discovery = await this.getDiscovery();
    const authEndpoint = discovery?.authorization_endpoint || `${this.config.issuerUrl}/authorize`;

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes || 'openid profile email',
      state,
    });

    return `${authEndpoint}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens and authenticate the user
   */
  async handleCallback(code) {
    if (!this.isEnabled()) {
      throw new Error('OIDC is not enabled');
    }

    const discovery = await this.getDiscovery();
    const tokenEndpoint = discovery?.token_endpoint || `${this.config.issuerUrl}/token`;

    // 1. Exchange code for access_token & id_token
    const bodyParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      code,
    });

    const tokenRes = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: bodyParams.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`OIDC token exchange failed (${tokenRes.status}): ${errText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const idToken = tokenData.id_token;

    // 2. Fetch UserInfo
    const userinfoEndpoint = discovery?.userinfo_endpoint || `${this.config.issuerUrl}/userinfo`;
    let userProfile = null;

    try {
      const userinfoRes = await fetch(userinfoEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });
      if (userinfoRes.ok) {
        userProfile = await userinfoRes.json();
      }
    } catch (err) {
      console.warn('[OIDC] UserInfo endpoint failed, falling back to id_token claims:', err.message);
    }

    // Fallback: parse id_token if userinfo request failed
    if (!userProfile && idToken) {
      try {
        const payloadPart = idToken.split('.')[1];
        userProfile = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
      } catch (err) {
        throw new Error('Unable to parse user claims from OIDC ID token');
      }
    }

    if (!userProfile || (!userProfile.sub && !userProfile.id)) {
      throw new Error('Invalid user profile received from OIDC provider');
    }

    // 3. Find or auto-provision local user account
    const localUser = findOrCreateOidcUser({
      sub: userProfile.sub || userProfile.id,
      email: userProfile.email,
      name: userProfile.name || userProfile.preferred_username,
      preferred_username: userProfile.preferred_username,
    });

    // 4. Issue StreamVault session token
    const svToken = signToken(localUser);

    return {
      user: {
        id: localUser.id,
        username: localUser.username,
        displayName: localUser.displayName,
        role: localUser.role,
        authProvider: 'oidc',
      },
      token: svToken,
    };
  }
}

export const oidcProvider = new OidcProvider();
