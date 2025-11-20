/**
 * OAuth Token Exchange Serverless Function
 * 
 * This function securely exchanges an authorization code for an access token.
 * It keeps the client secret secure on the server side.
 * 
 * Deployed on Vercel as a serverless function.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface GitHubTokenResponse {
    access_token?: string;
    token_type?: string;
    scope?: string;
    error?: string;
    error_description?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { code, client_id, redirect_uri } = req.body;

        // Validate required parameters
        if (!code || !client_id || !redirect_uri) {
            return res.status(400).json({
                error: 'Missing required parameters',
                message: 'code, client_id, and redirect_uri are required'
            });
        }

        // Get client secret from environment variables
        const client_secret = process.env.GITHUB_CLIENT_SECRET;

        if (!client_secret) {
            console.error('GITHUB_CLIENT_SECRET not configured');
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'OAuth is not properly configured on the server'
            });
        }

        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                client_id,
                client_secret,
                code,
                redirect_uri,
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('GitHub token exchange failed:', errorText);
            return res.status(tokenResponse.status).json({
                error: 'Token exchange failed',
                message: 'Failed to exchange authorization code for access token'
            });
        }

        const tokenData = await tokenResponse.json() as GitHubTokenResponse;

        // Check for errors in GitHub response
        if (tokenData.error) {
            console.error('GitHub returned error:', tokenData.error_description);
            return res.status(400).json({
                error: tokenData.error,
                message: tokenData.error_description || 'Authorization failed'
            });
        }

        // Return the access token (don't expose other sensitive data)
        return res.status(200).json({
            access_token: tokenData.access_token,
            token_type: tokenData.token_type,
            scope: tokenData.scope,
        });

    } catch (error: any) {
        console.error('OAuth proxy error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'An unexpected error occurred'
        });
    }
}
