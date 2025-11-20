/**
 * OAuthService Property-Based Tests
 * 
 * Tests OAuth service functionality using property-based testing
 * to verify correctness across many random inputs.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { OAuthService } from './oauthService';
import { STORAGE_KEYS } from './oauthConfig';

describe('OAuthService', () => {
  let service: OAuthService;

  beforeEach(() => {
    service = new OAuthService();
    localStorage.clear();
  });

  describe('Token Storage', () => {
    // **Feature: github-oauth-panel, Property 3: Token storage round-trip**
    it('should store and retrieve tokens correctly (round-trip)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (token) => {
            // Store token
            service.storeToken(token);
            
            // Retrieve token
            const retrieved = service.getToken();
            
            // Should match exactly
            expect(retrieved).toBe(token);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null when no token is stored', () => {
      const token = service.getToken();
      expect(token).toBeNull();
    });

    it('should overwrite existing token', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          (token1, token2) => {
            service.storeToken(token1);
            service.storeToken(token2);
            
            const retrieved = service.getToken();
            expect(retrieved).toBe(token2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters in tokens', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }), // Exclude empty strings
          (token) => {
            service.storeToken(token);
            const retrieved = service.getToken();
            expect(retrieved).toBe(token);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Token Revocation', () => {
    it('should remove token from storage', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (token) => {
            service.storeToken(token);
            service.revokeToken();
            
            const retrieved = service.getToken();
            expect(retrieved).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear all OAuth-related storage', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          (token, state) => {
            service.storeToken(token);
            service.storeState(state);
            
            service.revokeToken();
            
            expect(service.getToken()).toBeNull();
            expect(localStorage.getItem(STORAGE_KEYS.STATE)).toBeNull();
            expect(localStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Authentication Status', () => {
    it('should return false when not authenticated', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return true when token exists', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (token) => {
            service.storeToken(token);
            expect(service.isAuthenticated()).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false after token revocation', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (token) => {
            service.storeToken(token);
            service.revokeToken();
            expect(service.isAuthenticated()).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('State Parameter', () => {
    it('should generate unique state parameters', () => {
      const states = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const state = service.generateState();
        expect(states.has(state)).toBe(false);
        states.add(state);
      }
    });

    it('should generate state of correct length', () => {
      for (let i = 0; i < 100; i++) {
        const state = service.generateState();
        expect(state.length).toBe(64); // 32 bytes * 2 hex chars
      }
    });

    it('should validate matching state', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 64, maxLength: 64 }),
          (state) => {
            service.storeState(state);
            expect(service.validateState(state)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject non-matching state', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 64, maxLength: 64 }),
          fc.string({ minLength: 64, maxLength: 64 }),
          (state1, state2) => {
            fc.pre(state1 !== state2); // Ensure they're different
            service.storeState(state1);
            expect(service.validateState(state2)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear state after validation', () => {
      const state = service.generateState();
      service.storeState(state);
      service.validateState(state);
      
      // Second validation should fail (state cleared)
      expect(service.validateState(state)).toBe(false);
    });
  });

  describe('User Storage', () => {
    it('should store and retrieve user data', () => {
      fc.assert(
        fc.property(
          fc.record({
            login: fc.string({ minLength: 1 }),
            name: fc.string({ minLength: 1 }),
            avatar_url: fc.webUrl(),
            email: fc.emailAddress()
          }),
          (user) => {
            service.storeUser(user);
            const retrieved = service.getUser();
            
            expect(retrieved).toEqual(user);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null when no user is stored', () => {
      expect(service.getUser()).toBeNull();
    });
  });

  describe('OAuth URL Generation', () => {
    // **Feature: github-oauth-panel, Property 4: OAuth URL generation**
    it('should generate valid OAuth URL with all required parameters', () => {
      const authUrl = service.generateAuthUrl();
      const url = new URL(authUrl);
      
      // Should use GitHub's authorization endpoint
      expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
      
      // Should have required parameters
      expect(url.searchParams.has('client_id')).toBe(true);
      expect(url.searchParams.has('redirect_uri')).toBe(true);
      expect(url.searchParams.has('scope')).toBe(true);
      expect(url.searchParams.has('state')).toBe(true);
      expect(url.searchParams.has('allow_signup')).toBe(true);
    });

    it('should include correct scope parameter', () => {
      const authUrl = service.generateAuthUrl();
      const url = new URL(authUrl);
      const scope = url.searchParams.get('scope');
      
      expect(scope).toContain('repo');
      expect(scope).toContain('read:user');
    });

    it('should generate unique state for each URL', () => {
      const urls = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const authUrl = service.generateAuthUrl();
        const url = new URL(authUrl);
        const state = url.searchParams.get('state');
        
        expect(state).toBeTruthy();
        expect(urls.has(state!)).toBe(false);
        urls.add(state!);
      }
    });

    it('should store state parameter when generating URL', () => {
      const authUrl = service.generateAuthUrl();
      const url = new URL(authUrl);
      const state = url.searchParams.get('state');
      
      // State should be stored and valid
      expect(service.validateState(state!)).toBe(true);
    });
  });

  describe('OAuth Callback Error Handling', () => {
    // **Feature: github-oauth-panel, Property 18: Callback failure logging**
    it('should reject callback with invalid state', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          async (code, state1, state2) => {
            fc.pre(state1 !== state2); // Ensure states are different
            
            service.storeState(state1);
            
            // Callback with wrong state should throw
            await expect(service.handleCallback(code, state2)).rejects.toThrow('Invalid state parameter');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should clear state after failed validation', async () => {
      const state1 = 'valid_state';
      const state2 = 'invalid_state';
      const code = 'test_code';
      
      service.storeState(state1);
      
      try {
        await service.handleCallback(code, state2);
      } catch (error) {
        // Expected to fail
      }
      
      // State should be cleared even after failure
      expect(localStorage.getItem(STORAGE_KEYS.STATE)).toBeNull();
    });

    it('should handle callback with valid state', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          async (code, state) => {
            service.storeState(state);
            
            // Should not throw with valid state
            const token = await service.handleCallback(code, state);
            expect(token).toBeTruthy();
            expect(service.isAuthenticated()).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
