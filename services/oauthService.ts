/**
 * OAuth Service
 * 
 * Handles GitHub OAuth 2.0 authentication flow including:
 * - Token storage and retrieval
 * - OAuth URL generation
 * - Callback handling
 * - Token revocation
 */

import { GITHUB_OAUTH_CONFIG, STORAGE_KEYS } from './oauthConfig';
import type { GitHubUser } from '../types';

/**
 * OAuthService Class
 * Manages OAuth authentication state and operations
 */
export class OAuthService {
  /**
   * Store access token securely in localStorage
   * @param token - GitHub access token
   */
  storeToken(token: string): void {
    try {
      // Simple storage for now - can be enhanced with encryption
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    } catch (error) {
      console.error('Failed to store token:', error);
      throw new Error('Unable to save authentication. Please check browser settings.');
    }
  }

  /**
   * Retrieve stored access token
   * @returns Access token or null if not found
   */
  getToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      return null;
    }
  }

  /**
   * Remove access token from storage
   */
  revokeToken(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.STATE);
    } catch (error) {
      console.error('Failed to revoke token:', error);
    }
  }

  /**
   * Check if user is authenticated
   * @returns True if valid token exists
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    return token !== null && token.length > 0;
  }

  /**
   * Store user information
   * @param user - GitHub user data
   */
  storeUser(user: GitHubUser): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user:', error);
    }
  }

  /**
   * Retrieve stored user information
   * @returns GitHub user or null
   */
  getUser(): GitHubUser | null {
    try {
      const userJson = localStorage.getItem(STORAGE_KEYS.USER);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Failed to retrieve user:', error);
      return null;
    }
  }

  /**
   * Generate a cryptographically secure random state parameter
   * Used for CSRF protection
   * @returns Random state string
   */
  generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Store OAuth state parameter
   * @param state - State parameter to store
   */
  storeState(state: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STATE, state);
    } catch (error) {
      console.error('Failed to store state:', error);
    }
  }

  /**
   * Retrieve and validate OAuth state parameter
   * @param state - State parameter from callback
   * @returns True if state is valid
   */
  validateState(state: string): boolean {
    try {
      const storedState = localStorage.getItem(STORAGE_KEYS.STATE);
      // Clear state after validation
      localStorage.removeItem(STORAGE_KEYS.STATE);
      return storedState === state;
    } catch (error) {
      console.error('Failed to validate state:', error);
      return false;
    }
  }

  /**
   * Generate GitHub OAuth authorization URL
   * @returns Authorization URL with all required parameters
   */
  generateAuthUrl(): string {
    const state = this.generateState();
    this.storeState(state);

    const params = new URLSearchParams({
      client_id: GITHUB_OAUTH_CONFIG.clientId,
      redirect_uri: GITHUB_OAUTH_CONFIG.redirectUri,
      scope: GITHUB_OAUTH_CONFIG.scope.join(' '),
      state: state,
      allow_signup: 'true'
    });

    return `${GITHUB_OAUTH_CONFIG.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Initiate OAuth flow by redirecting to GitHub
   */
  async initiateOAuth(): Promise<void> {
    if (!GITHUB_OAUTH_CONFIG.clientId) {
      throw new Error('OAuth is not configured. Please set VITE_GITHUB_CLIENT_ID in environment variables.');
    }

    const authUrl = this.generateAuthUrl();
    window.location.href = authUrl;
  }

  /**
   * Handle OAuth callback and exchange code for token
   * @param code - Authorization code from GitHub
   * @param state - State parameter for validation
   * @returns Access token
   */
  async handleCallback(code: string, state: string): Promise<string> {
    // Validate state parameter
    if (!this.validateState(state)) {
      throw new Error('Invalid state parameter. Possible CSRF attack.');
    }

    // Exchange code for token
    // Note: This requires a backend proxy to keep client secret secure
    try {
      const token = await this.exchangeCodeForToken(code);
      this.storeToken(token);

      // Fetch user information
      await this.fetchAndStoreUser(token);

      return token;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   * This calls a backend proxy to keep client secret secure
   * @param code - Authorization code
   * @returns Access token
   */
  private async exchangeCodeForToken(code: string): Promise<string> {
    const proxyUrl = import.meta.env.VITE_OAUTH_PROXY_URL || '/api/oauth';

    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          client_id: GITHUB_OAUTH_CONFIG.clientId,
          redirect_uri: GITHUB_OAUTH_CONFIG.redirectUri,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to exchange authorization code');
      }

      const data = await response.json();

      if (!data.access_token) {
        throw new Error('No access token received from server');
      }

      return data.access_token;
    } catch (error: any) {
      console.error('Token exchange error:', error);

      // Fallback: If proxy not configured, warn user
      if (error.message?.includes('fetch')) {
        throw new Error('OAuth proxy is not configured. Please deploy the backend function.');
      }

      throw error;
    }
  }

  /**
   * Fetch user information from GitHub API
   * @param token - Access token
   */
  private async fetchAndStoreUser(token: string): Promise<void> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user information');
      }

      const user: GitHubUser = await response.json();
      this.storeUser(user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // Don't throw - user info is optional
    }
  }
}

// Export singleton instance
export const oauthService = new OAuthService();
