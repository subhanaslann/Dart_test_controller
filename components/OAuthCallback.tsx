/**
 * OAuthCallback Component
 * 
 * Handles OAuth callback from GitHub after user authorizes.
 * Extracts authorization code and exchanges it for access token.
 */

import { useEffect, useState } from 'react';
import { oauthService } from '../services/oauthService';

export const OAuthCallback = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authorization...');
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL parameters
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        // Check for authorization denial
        if (error === 'access_denied') {
          setStatus('error');
          setMessage('Authorization was cancelled. Redirecting...');
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
          return;
        }

        // Validate parameters
        if (!code || !state) {
          setStatus('error');
          setMessage('Invalid authorization response. Redirecting...');
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
          return;
        }

        // Exchange code for token
        await oauthService.handleCallback(code, state);

        setStatus('success');
        setMessage('Authorization successful! Redirecting...');

        // Redirect back to main app
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);

      } catch (error: any) {
        console.error('OAuth callback error:', error);

        // Check if error is retryable (network errors, timeouts, etc.)
        const isRetryableError =
          error.message?.includes('network') ||
          error.message?.includes('timeout') ||
          error.message?.includes('fetch') ||
          error.name === 'NetworkError';

        if (isRetryableError && retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1);
          setMessage(`Connection failed. Retrying (${retryCount + 1}/${MAX_RETRIES})...`);

          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => {
            handleCallback();
          }, delay);
        } else {
          setStatus('error');
          const errorMessage = retryCount >= MAX_RETRIES
            ? `Failed after ${MAX_RETRIES} attempts. Redirecting...`
            : error.message || 'Authorization failed. Redirecting...';
          setMessage(errorMessage);

          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
        }
      }
    };

    handleCallback();
  }, [retryCount]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0d1117] text-[#c9d1d9]">
      <div className="max-w-md w-full p-8 bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl">
        {/* GitHub Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Status */}
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">
            {status === 'processing' && 'Authorizing...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Authorization Failed'}
          </h2>

          {/* Loading Spinner */}
          {status === 'processing' && (
            <div className="flex justify-center mb-4">
              <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}

          {/* Success Icon */}
          {status === 'success' && (
            <div className="flex justify-center mb-4">
              <svg className="w-12 h-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}

          {/* Error Icon */}
          {status === 'error' && (
            <div className="flex justify-center mb-4">
              <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}

          <p className="text-sm text-[#8b949e]">{message}</p>
        </div>
      </div>
    </div>
  );
};
