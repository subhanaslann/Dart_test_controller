<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Flutter Test Coverage Sentinel

A powerful static analysis tool for Flutter developers to analyze production code against test files and identify missing unit tests.

**No AI required** - Uses pure static analysis for fast, reliable coverage detection.

## Features

- 🔍 **Static Code Analysis** - Parse Dart files and detect test coverage without AI
- 📊 **Coverage Visualization** - Interactive charts and detailed reports
- 🧪 **Template-based Test Generation** - Generate test scaffolds for untested functions
- 🏗️ **Architecture Detection** - Automatically detects Bloc, Cubit, Repository, Widget patterns
- 📦 **Monorepo Support** - Handles multiple Flutter packages
- ⚡ **Lightning Fast** - No API calls, instant results

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
3. Open http://localhost:3000

## GitHub OAuth Setup (Optional)

For a better authentication experience, you can set up GitHub OAuth:

### 1. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: Flutter Test Coverage Sentinel
   - **Homepage URL**: `http://localhost:5173` (for development)
   - **Authorization callback URL**: `http://localhost:5173/oauth/callback`
4. Click "Register application"
5. Copy the **Client ID**

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Add your GitHub OAuth Client ID to `.env`:
   ```
   VITE_GITHUB_CLIENT_ID=your_client_id_here
   VITE_GITHUB_REDIRECT_URI=http://localhost:5173/oauth/callback
   ```

### 3. Restart the Development Server

```bash
npm run dev
```

Now you'll see a "Connect GitHub" button that uses OAuth for secure authentication!

**Note:** If OAuth is not configured, the app will fall back to manual token input.

### 4. Deploy Backend (Vercel/Netlify)

For token exchange to work, deploy the backend proxy:

**Vercel:**
```bash
npm install -g vercel
vercel
```

Set the `GITHUB_CLIENT_SECRET` environment variable in Vercel dashboard:
- Go to Project Settings → Environment Variables
- Add: `GITHUB_CLIENT_SECRET` = your_client_secret

**Local Development:**
```bash
vercel dev
```

---

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_GITHUB_CLIENT_ID` | Yes (for OAuth) | GitHub OAuth App Client ID | `Iv1.a1b2c3d4e5f6g7h8` |
| `VITE_GITHUB_REDIRECT_URI` | No | OAuth callback URL | `http://localhost:5173/oauth/callback` |
| `VITE_OAUTH_PROXY_URL` | No | Backend proxy URL | `/api/oauth` or `https://yourapp.vercel.app/api/oauth` |
| `GITHUB_CLIENT_SECRET` | Yes (backend) | GitHub OAuth App Secret (server-side only) | `abc123...` |

**Security Note:** Never commit `.env` file or expose `GITHUB_CLIENT_SECRET` in frontend code.

---

## Troubleshooting

### OAuth Button Not Showing

**Problem:** Manual token input appears instead of OAuth button.

**Solution:** 
1. Ensure `VITE_GITHUB_CLIENT_ID` is set in `.env`
2. Restart dev server: `npm run dev`
3. Check browser console for configuration errors

### "OAuth proxy is not configured" Error

**Problem:** Token exchange fails after GitHub authorization.

**Solution:**
1. Deploy backend function to Vercel/Netlify
2. Set `GITHUB_CLIENT_SECRET` in deployment environment
3. Update `VITE_OAUTH_PROXY_URL` if using custom domain
4. Test endpoint: `curl -X POST https://yourapp.vercel.app/api/oauth`

### Authorization Redirect Fails

**Problem:** After clicking "Authorize", nothing happens or error appears.

**Solutions:**
1. **Check redirect URI:** Must match exactly in GitHub OAuth App settings
   - Dev: `http://localhost:5173/oauth/callback`
   - Prod: `https://yourdomain.com/oauth/callback`
2. **Verify client ID:** Double-check it matches your GitHub OAuth App
3. **Clear browser storage:** `localStorage.clear()` in console
4. **Check state parameter:** May need to clear `sentinel_oauth_state`

### "Invalid state parameter" Error

**Problem:** CSRF validation fails during callback.

**Solution:**
1. Clear all OAuth-related storage:
   ```javascript
   localStorage.removeItem('sentinel_oauth_state');
   localStorage.removeItem('sentinel_oauth_token');
   ```
2. Try the flow again
3. Check if multiple tabs are interfering

### Token Not Persisting

**Problem:** Token disappears after page reload.

**Solution:**
1. Check browser console for localStorage errors
2. Ensure cookies/storage are not blocked
3. Try in incognito mode to rule out extensions
4. Verify `oauthService.storeToken()` is called after successful auth

### Network Errors During Token Exchange

**Problem:** "Failed to fetch" or timeout errors.

**Solutions:**
1. **Check CORS:** Ensure backend allows requests from your domain
2. **Verify endpoint:** Test `POST /api/oauth` manually
3. **Check logs:** Review Vercel/Netlify function logs
4. **Firewall:** Ensure no firewall blocks GitHub API

### API Rate Limiting

**Problem:** "API rate limit exceeded" errors.

**Solution:**
1. Authenticated requests have higher limits (5000/hour vs 60/hour)
2. Use OAuth instead of manual token
3. Add retry logic with exponential backoff
4. Check remaining rate limit in response headers

---

## Security Best Practices

1. **Never commit secrets:** Use `.env` files (add to `.gitignore`)
2. **Use backend proxy:** Never expose client secret in frontend
3. **Validate state parameter:** Prevents CSRF attacks
4. **HTTPS only in production:** OAuth requires secure callback URLs
5. **Minimal scopes:** Only request necessary permissions (`repo`, `read:user`)
6. **Token storage:** Consider encryption for localStorage tokens
7. **Revoke access:** Users should be able to disconnect/revoke
8. **Monitor logs:** Watch for suspicious OAuth activity

---

## FAQ

### Q: Can I use this without OAuth?
**A:** Yes! The app falls back to manual token input if OAuth is not configured.

### Q: How do I get a personal access token?
**A:** Go to GitHub Settings → Developer settings → Personal access tokens → Generate new token

### Q: Does this work with GitHub Enterprise?
**A:** Partially. You'll need to update API endpoints and OAuth URLs in `oauthConfig.ts`

### Q: Can I customize OAuth scopes?
**A:** Yes! Edit `GITHUB_OAUTH_CONFIG.scope` in `services/oauthConfig.ts`

### Q: Is my token secure?
**A:** Token is stored in localStorage. For production, consider additional encryption or secure cookies.

### Q: How long does the token last?
**A:** GitHub tokens don't expire by default. Users should revoke access when done.

---
