# EnviroMaster Frontend - Deployment Guide

This guide provides step-by-step instructions for deploying the EnviroMaster frontend to Render as a static site.

## Prerequisites

Before deploying, ensure you have:

- ✅ Backend deployed and running on Render (complete backend deployment first!)
- ✅ Backend URL ready (e.g., `https://enviromaster-backend.onrender.com`)
- ✅ GitHub repository with your frontend code
- ✅ Node.js and npm installed locally (for testing build)

## Important: Deploy Backend First!

**⚠️ CRITICAL: You must deploy the backend BEFORE deploying the frontend!**

The frontend needs the backend URL during build time (it gets baked into the production build). If you deploy the frontend without setting the correct backend URL, the app won't work.

## Deployment Steps

### 1. Test Production Build Locally

Before deploying to Render, test that your production build works:

```bash
# Navigate to frontend directory
cd /path/to/enviromaster

# Install dependencies
npm install

# Create production .env file
cp .env.example .env

# Edit .env and set your backend URL
# VITE_API_BASE_URL=https://your-backend.onrender.com
nano .env

# Build for production
npm run build

# Test the production build locally
npm run preview
```

The preview server will open at `http://localhost:4173`. Test that:
- ✅ Pages load correctly
- ✅ API calls work (try login, create proposal)
- ✅ No console errors

### 2. Push Code to GitHub

```bash
# Make sure you're in the frontend directory
cd /path/to/enviromaster

# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit changes
git commit -m "Prepare frontend for production deployment"

# Add remote repository
git remote add origin https://github.com/your-username/enviromaster-frontend.git

# Push to GitHub
git push -u origin main
```

### 3. Deploy to Render

#### Option A: Using Render Dashboard (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com/)

2. Click **New +** → **Static Site**

3. **Connect Repository**:
   - Click "Connect account" if not already connected
   - Select your GitHub repository

4. **Configure Service**:
   - **Name**: `enviromaster-frontend`
   - **Branch**: `main` (or your preferred branch)
   - **Root Directory**: `.` (leave blank if repo root is frontend)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

5. **Advanced Settings** (click "Advanced"):
   - **Auto-Deploy**: Yes (recommended)

6. Click **Create Static Site**

#### Option B: Using Blueprint (render.yaml)

If you have `render.yaml` in your repository:

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Blueprint**
3. Connect your GitHub repository
4. Render will detect `render.yaml` and configure automatically
5. Click **Apply** to start deployment

### 4. Configure Environment Variables

**⚠️ CRITICAL STEP - Don't Skip!**

1. In Render Dashboard, select your frontend service

2. Go to **Environment** tab

3. Add environment variable:
   ```
   Key: VITE_API_BASE_URL
   Value: https://your-backend.onrender.com
   ```
   **Important**:
   - NO trailing slash!
   - Must be your actual deployed backend URL
   - Example: `https://enviromaster-backend.onrender.com`

4. Click **Save Changes**

5. **Trigger Manual Redeploy**:
   - Go to **Manual Deploy** → **Clear build cache & deploy**
   - This ensures the new environment variable is included in the build

### 5. Update Backend CORS Settings

Your frontend needs to be allowed to make requests to the backend:

1. Go to your **backend service** in Render Dashboard

2. Go to **Environment** tab

3. Update `ALLOWED_ORIGINS` environment variable:
   ```
   ALLOWED_ORIGINS=https://enviromaster-frontend.onrender.com
   ```

   If you have multiple frontend URLs (e.g., staging + production):
   ```
   ALLOWED_ORIGINS=https://enviromaster-frontend.onrender.com,https://staging-frontend.onrender.com
   ```

4. **Save changes** and **redeploy backend** if needed

### 6. Verify Deployment

1. **Check Build Logs**:
   - In Render Dashboard, go to your frontend service
   - Click **Logs** tab
   - Look for "Build succeeded" message
   - Check for any errors or warnings

2. **Test Frontend URL**:
   - Visit: `https://enviromaster-frontend.onrender.com`
   - Should load the homepage

3. **Check Browser Console**:
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for any errors, especially CORS or network errors

4. **Test API Connectivity**:
   - Try logging in (if you have admin panel)
   - Create a test proposal
   - Check that API calls are going to correct backend URL

5. **Verify Environment Variables**:
   - Open browser console and type:
     ```javascript
     console.log(import.meta.env.VITE_API_BASE_URL)
     ```
   - Should show your backend URL

## Troubleshooting

### Issue: "Failed to fetch" errors

**Symptoms**: API calls fail with "Failed to fetch" or network errors

**Solutions**:
1. Check `VITE_API_BASE_URL` is set correctly in Render environment variables
2. Verify backend CORS settings include your frontend URL
3. Make sure backend is actually running (check backend logs)
4. Verify backend URL is accessible (try visiting `/health` endpoint)

**How to fix**:
```bash
# Check backend health
curl https://your-backend.onrender.com/health
# Should return: {"ok":true}

# Check CORS headers
curl -H "Origin: https://your-frontend.onrender.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://your-backend.onrender.com/api/pdf/list
# Should include Access-Control-Allow-Origin header
```

### Issue: CORS Policy Errors

**Symptoms**: Browser console shows "blocked by CORS policy"

**Solutions**:
1. Add your frontend URL to backend's `ALLOWED_ORIGINS`
2. Make sure ALLOWED_ORIGINS doesn't have trailing slashes
3. Check backend CORS configuration is correct

**How to fix**:
```bash
# Backend .env should have:
ALLOWED_ORIGINS=https://enviromaster-frontend.onrender.com

# Multiple origins:
ALLOWED_ORIGINS=https://enviromaster-frontend.onrender.com,https://www.yourdomain.com
```

### Issue: 404 Errors on Page Refresh

**Symptoms**: Refreshing any page besides homepage shows 404

**Solutions**:
1. Check `render.yaml` has the routes configuration
2. Or in Render Dashboard: **Settings** → **Rewrite Rules**
   - **Source**: `/*`
   - **Destination**: `/index.html`

### Issue: Environment Variable Not Working

**Symptoms**: API calls go to wrong URL or `undefined`

**Solutions**:
1. Make sure variable name has `VITE_` prefix (required by Vite)
2. Redeploy after adding environment variables (variables are baked into build)
3. Clear build cache before redeploying

**How to fix**:
1. Go to Render Dashboard → Frontend Service
2. Click **Manual Deploy** → **Clear build cache & deploy**

### Issue: Build Fails

**Symptoms**: Deployment fails during build step

**Common causes**:
1. TypeScript errors in code
2. Missing dependencies
3. Out of memory (free tier has limited resources)

**How to fix**:
```bash
# Test build locally first
npm run build

# If it works locally but fails on Render, check:
# 1. Node version compatibility
# 2. package.json scripts are correct
# 3. All dependencies are in package.json (not just devDependencies)
```

### Issue: Static Assets Not Loading

**Symptoms**: CSS/JS files return 404, site appears broken

**Solutions**:
1. Check `Publish Directory` is set to `dist` (not `build` or `public`)
2. Verify build command creates files in `dist` folder
3. Check build logs to see where files are being output

## Performance Optimization

### Enable Compression

Render automatically compresses static assets. No action needed!

### Optimize Images

If your app has many images:

1. **Use WebP format** where possible
2. **Lazy load** images below the fold
3. **Use responsive images** with `srcset`
4. **Consider a CDN** for large media files

### Monitor Performance

1. **Lighthouse**:
   - Open Chrome DevTools
   - Go to "Lighthouse" tab
   - Run audit
   - Aim for score > 90

2. **Render Metrics**:
   - Dashboard → Frontend Service → Metrics
   - Monitor bandwidth usage

## Updating Deployment

### Push New Changes

```bash
# Make your changes
git add .
git commit -m "Your commit message"
git push origin main
```

Render will automatically detect the push and redeploy (if Auto-Deploy is enabled).

### Manual Redeploy

1. Go to Render Dashboard
2. Select your frontend service
3. Click **Manual Deploy** → **Deploy latest commit**

### Rolling Back

1. Go to Render Dashboard
2. Select your frontend service
3. Click **Events** tab
4. Find the previous successful deployment
5. Click **Redeploy** on that specific commit

## Custom Domain Setup

To use your own domain (e.g., `app.yourdomain.com`):

1. **In Render Dashboard**:
   - Go to your frontend service
   - Click **Settings** → **Custom Domains**
   - Click **Add Custom Domain**
   - Enter your domain (e.g., `app.yourdomain.com`)
   - Render will show DNS records to add

2. **In Your DNS Provider**:
   - Add CNAME record:
     - **Name**: `app` (or whatever subdomain)
     - **Value**: `your-app.onrender.com`
   - Wait for DNS propagation (can take up to 48 hours)

3. **Update Backend CORS**:
   - Add your custom domain to backend's `ALLOWED_ORIGINS`
   - Example: `ALLOWED_ORIGINS=https://app.yourdomain.com`

4. **SSL Certificate**:
   - Render automatically provisions SSL (HTTPS)
   - No action needed!

## Scaling

### Upgrade Plan

Free tier is great for testing, but for production:

1. Go to Render Dashboard
2. Select your frontend service
3. Click **Settings** → **Plan**
4. Consider **Starter** plan ($7/month) for:
   - Custom domains
   - No cold starts
   - Better performance

### Use CDN (Optional)

For global users, consider:
- Cloudflare (free plan available)
- AWS CloudFront
- Vercel (alternative to Render for static sites)

## Security Checklist

- ✅ HTTPS enabled (automatic on Render)
- ✅ Environment variables not hardcoded in code
- ✅ .env file in .gitignore (never committed)
- ✅ CORS properly configured on backend
- ✅ Security headers configured (see render.yaml)
- ✅ No sensitive data in frontend code
- ✅ API calls use HTTPS backend URL

## Monitoring

### Check Logs

1. Render Dashboard → Frontend Service → Logs
2. Look for:
   - Build logs (during deployment)
   - Access logs (HTTP requests)
   - Any errors or warnings

### Analytics (Optional)

Consider adding:
- Google Analytics
- Plausible Analytics (privacy-focused)
- Mixpanel (for user behavior)

## Support

For issues:
1. Check this guide's troubleshooting section
2. Review Render's [static site documentation](https://render.com/docs/static-sites)
3. Check frontend logs in browser console
4. Verify backend is working (check backend logs)

## Additional Resources

- [Render Documentation](https://render.com/docs/static-sites)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [React Router Deployment](https://reactrouter.com/en/main/guides/deploying)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

**Deployment Checklist:**

Before going live:
- [ ] Backend deployed and healthy
- [ ] Backend URL added to frontend environment variables
- [ ] Frontend URL added to backend CORS settings
- [ ] Production build tested locally
- [ ] Environment variables verified
- [ ] API connectivity tested
- [ ] All features working in production
- [ ] Browser console shows no errors
- [ ] Performance tested (Lighthouse score > 90)
