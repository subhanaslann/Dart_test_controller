/**
 * OAuth Configuration for GitHub Authentication
 * 
 * This file contains the configuration and types for GitHub OAuth 2.0 flow.
 * Environment variables should be set in .env file for security.
 */

/**
 * OAuth Configuration Interface
 */
export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string[];
  authorizationUrl: string;
  tokenUrl: string;
}

/**
 * Permission/Scope Interface
 */
export interface Permission {
  name: string;
  description: string;
  isReadOnly: boolean;
  icon?: string;
}

/**
 * Application Metadata Interface
 */
export interface AppMetadata {
  isGitHubOwned: boolean;
  createdDate: string;
  userCount: string;
}

/**
 * Authentication State Interface
 */
export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: GitHubUser | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * GitHub User Interface
 */
export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  email: string;
}

/**
 * GitHub OAuth Configuration
 * 
 * Uses environment variables for sensitive data.
 * Fallback values are provided for development.
 */
export const GITHUB_OAUTH_CONFIG: OAuthConfig = {
  clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
  redirectUri: import.meta.env.VITE_GITHUB_REDIRECT_URI || `${window.location.origin}/oauth/callback`,
  scope: ['repo', 'read:user'],
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token'
};

/**
 * OAuth Proxy URL for token exchange
 * Required to keep client secret secure
 */
export const OAUTH_PROXY_URL = import.meta.env.VITE_OAUTH_PROXY_URL || '';

/**
 * Permission Definitions
 * Describes what each OAuth scope allows
 */
export const GITHUB_PERMISSIONS: Permission[] = [
  {
    name: 'Repository Access',
    description: 'Read and analyze your public and private repositories',
    isReadOnly: true,
    icon: 'repo'
  },
  {
    name: 'User Profile',
    description: 'Read your basic profile information',
    isReadOnly: true,
    icon: 'user'
  }
];

/**
 * Application Metadata
 * Information about the Sentinel application
 */
export const APP_METADATA: AppMetadata = {
  isGitHubOwned: false,
  createdDate: '2024',
  userCount: 'New Application'
};

/**
 * Storage Keys
 */
export const STORAGE_KEYS = {
  TOKEN: 'sentinel_oauth_token',
  STATE: 'sentinel_oauth_state',
  USER: 'sentinel_oauth_user'
} as const;

/**
 * Check if OAuth is configured
 * Returns true if client ID is set
 */
export const isOAuthConfigured = (): boolean => {
  return Boolean(GITHUB_OAUTH_CONFIG.clientId);
};
