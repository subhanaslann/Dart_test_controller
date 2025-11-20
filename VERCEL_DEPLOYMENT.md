# Vercel Deployment Guide

## Prerequisites

1. GitHub repository connected to Vercel
2. Vercel account with project created

## Environment Variables Setup

### Required Environment Variables in Vercel Dashboard:

Go to: **Project Settings → Environment Variables**

Add the following variables:

#### Frontend Variables (Production, Preview, Development)
```
VITE_GITHUB_CLIENT_ID=your_github_oauth_client_id_here
VITE_GITHUB_REDIRECT_URI=https://your-domain.vercel.app/oauth/callback
```

#### Backend Variables (Production only)
```
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret_here
```

## Step-by-Step Deployment

### 1. Create GitHub OAuth App

1. Go to: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Flutter Test Coverage Sentinel
   - **Homepage URL**: `https://your-domain.vercel.app`
   - **Authorization callback URL**: `https://your-domain.vercel.app/oauth/callback`
4. Click "Register application"
5. Copy the **Client ID** and generate **Client Secret**

### 2. Configure Vercel Project

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Settings → Environment Variables**
4. Add the variables listed above
5. Make sure to select correct environments (Production, Preview, Development)

### 3. Deploy

#### Option A: Automatic (GitHub Integration)
```bash
git add .
git commit -m "Configure Vercel deployment"
git push origin main
```

Vercel will automatically deploy on push.

#### Option B: Manual (Vercel CLI)
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 4. Verify Deployment

After deployment, test:

1. **Frontend:** Visit your Vercel URL
2. **OAuth Button:** Should appear (not manual token input)
3. **OAuth Flow:** Click "Connect GitHub" → Should redirect to GitHub
4. **API Endpoint:** Test `POST https://your-domain.vercel.app/api/oauth`

### 5. Update GitHub OAuth App

If your Vercel domain changes:
1. Go back to GitHub OAuth App settings
2. Update **Homepage URL** and **Authorization callback URL**
3. Update `VITE_GITHUB_REDIRECT_URI` in Vercel

## Troubleshooting

### Build Fails

**Error:** TypeScript compilation errors

**Solution:**
```bash
# Test build locally first
npm run build

# Check for errors
npm run test
```

### API Routes Don't Work

**Error:** 404 on `/api/oauth`

**Solution:**
- Check `vercel.json` is committed
- Verify `api/oauth.ts` is in the repository
- Check Vercel build logs for function deployment

### OAuth Fails

**Error:** "OAuth proxy is not configured"

**Solution:**
1. Verify `GITHUB_CLIENT_SECRET` is set in Vercel
2. Check it's set for "Production" environment
3. Redeploy after adding environment variables

### CORS Errors

**Error:** CORS policy blocking requests

**Solution:**
- Check `vercel.json` headers configuration
- Verify API route allows your domain
- Update CORS settings in `api/oauth.ts`

## Vercel Configuration Files

### Files Committed:
- ✅ `vercel.json` - Vercel configuration
- ✅ `api/oauth.ts` - Serverless function
- ✅ `api/tsconfig.json` - TypeScript config for API
- ✅ `.vercelignore` - Files to ignore

### Files NOT Committed:
- ❌ `.env` - Local environment variables
- ❌ `.env.local` - Local overrides
- ❌ `node_modules/` - Dependencies
- ❌ `dist/` - Build output

## Post-Deployment Checklist

- [ ] Frontend loads correctly
- [ ] OAuth button appears
- [ ] Click "Connect GitHub" redirects to GitHub
- [ ] After authorization, redirects back successfully
- [ ] Token is stored and persists
- [ ] Can load repositories
- [ ] Disconnect works properly
- [ ] No console errors

## Production Environment Variables

```env
# Frontend (set in Vercel Dashboard)
VITE_GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxx
VITE_GITHUB_REDIRECT_URI=https://your-domain.vercel.app/oauth/callback

# Backend (set in Vercel Dashboard - Production only)
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Support

If deployment fails:
1. Check Vercel build logs
2. Review this guide
3. Check `README.md` troubleshooting section
4. Verify all environment variables are set

---

**Last Updated:** 2025-11-21  
**Status:** Deployment Ready ✅
