# EnviroMaster Frontend - Vercel Quick Start

Deploy your React frontend to Vercel in 5 minutes.

## Prerequisites

- GitHub account
- Vercel account (sign up at [vercel.com](https://vercel.com/signup))
- Backend already deployed and accessible

---

## Step 1: Push to GitHub (1 minute)

```bash
cd /Users/yaswanthgandhi/Documents/analytics/enviromaster

# Add all files
git add .

# Commit changes
git commit -m "Add Vercel deployment configuration"

# Push to GitHub
git push origin main
```

---

## Step 2: Import to Vercel (2 minutes)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your GitHub repository: `enviromaster`
4. Vercel auto-detects:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Click **"Deploy"** (don't add environment variables yet)

⏱️ Wait 1-2 minutes for initial deployment...

---

## Step 3: Add Environment Variables (1 minute)

1. Go to your project dashboard in Vercel
2. Click **"Settings"** tab
3. Click **"Environment Variables"** in sidebar
4. Add this variable:

```
Name:  VITE_API_BASE_URL
Value: https://your-backend-url.ondigitalocean.app
Environments: ✅ Production ✅ Preview ✅ Development
```

**Important:** Replace `your-backend-url.ondigitalocean.app` with your actual backend URL!

5. Click **"Save"**

---

## Step 4: Redeploy (1 minute)

1. Go to **"Deployments"** tab
2. Click three dots ⋮ on latest deployment
3. Click **"Redeploy"**
4. Click **"Redeploy"** to confirm

⏱️ Wait 1-2 minutes for rebuild...

---

## Step 5: Verify Deployment (30 seconds)

1. Click **"Visit"** button at top of dashboard
2. Your app opens: `https://enviromaster-xxxxx.vercel.app`

### Quick Tests:
- ✅ App loads without errors
- ✅ Login/authentication works
- ✅ API calls connect to backend
- ✅ Navigation works

---

## Done! 🎉

**Your frontend is now live!**

**Production URL:** `https://enviromaster-xxxxx.vercel.app`

### What happens next?

Every time you push to GitHub `main` branch:
1. Vercel automatically detects the push
2. Builds your production bundle
3. Deploys to global CDN
4. Sends you a notification

**No manual deployment needed!**

---

## Quick Commands Reference

```bash
# Test production build locally
npm run build
npm run preview

# Type check before deploying
npm run type-check

# Fix linting errors
npm run lint:fix

# Deploy manually (if needed)
npx vercel --prod
```

---

## Common Issues & Quick Fixes

### Issue: "Environment variable is undefined"

**Fix:**
1. Check variable starts with `VITE_` prefix
2. Redeploy after adding variables (Settings > Deployments > Redeploy)
3. Use `import.meta.env.VITE_API_BASE_URL` not `process.env`

### Issue: "CORS error when calling API"

**Fix:** Update backend CORS to allow your Vercel domain:

```javascript
// backend/src/app.js
const allowedOrigins = [
  'http://localhost:5173',
  'https://enviromaster-xxxxx.vercel.app',  // Add this!
];
```

### Issue: "404 error when refreshing page"

**Fix:** Already configured in `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Issue: "Build fails with TypeScript errors"

**Fix:**
```bash
# Test locally first
npm run type-check

# Fix errors, then commit
git add .
git commit -m "Fix TypeScript errors"
git push origin main
```

---

## Next Steps

### 1. Add Custom Domain (Optional)

1. Go to **Settings** > **Domains**
2. Click **"Add Domain"**
3. Enter: `app.yourdomain.com`
4. Follow DNS configuration instructions
5. Vercel automatically provisions SSL certificate

### 2. Enable Analytics

1. Go to **Settings** > **Analytics**
2. Click **"Enable"**
3. Get real-time traffic and performance metrics

### 3. Set Up Notifications

1. Go to **Settings** > **Git Integration**
2. Enable:
   - ✅ Deployment comments on PRs
   - ✅ Deployment notifications on Slack/Discord
   - ✅ Email notifications

---

## Project URLs

- **Dashboard:** https://vercel.com/dashboard
- **Production:** https://enviromaster-xxxxx.vercel.app
- **Deployments:** https://vercel.com/your-username/enviromaster/deployments
- **Settings:** https://vercel.com/your-username/enviromaster/settings

---

## Support

- 📖 Full guide: See `VERCEL_DEPLOYMENT_GUIDE.md`
- 🌐 Vercel Docs: https://vercel.com/docs
- 💬 Vercel Discord: https://vercel.com/discord
- 📧 Support: support@vercel.com

---

## Deployment Checklist

### Before Deploying:
- [ ] Code tested locally (`npm run dev`)
- [ ] Production build works (`npm run build`)
- [ ] Type check passes (`npm run type-check`)
- [ ] Backend is deployed and running
- [ ] Backend URL is known
- [ ] Code pushed to GitHub

### After Deploying:
- [ ] Production URL accessible
- [ ] Environment variables configured
- [ ] API connection working
- [ ] Authentication working
- [ ] All routes accessible
- [ ] Mobile responsive
- [ ] No console errors

---

**Total Time: ~5 minutes**

**Deployment Status: READY ✅**

Now every `git push` to `main` automatically deploys to production!
