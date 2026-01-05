# EnviroMaster Frontend - Vercel Deployment Guide

Complete guide for deploying the EnviroMaster React frontend to Vercel with automated CI/CD.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Setup (5 minutes)](#quick-setup-5-minutes)
- [Detailed Deployment Steps](#detailed-deployment-steps)
- [Environment Variables](#environment-variables)
- [Custom Domain Setup](#custom-domain-setup)
- [Deployment Verification](#deployment-verification)
- [Troubleshooting](#troubleshooting)
- [Performance Optimization](#performance-optimization)
- [Monitoring & Analytics](#monitoring--analytics)

---

## Prerequisites

### Required Accounts
- **GitHub Account** - Your code must be in a GitHub repository
- **Vercel Account** - Sign up at [vercel.com](https://vercel.com/signup) (free tier available)
- **Backend Deployed** - Your backend should already be deployed and accessible

### Repository Requirements
- React app using Vite
- Code pushed to GitHub
- `vercel.json` configuration file (✅ already created)
- `.vercelignore` file (✅ already created)

---

## Quick Setup (5 minutes)

### Step 1: Push to GitHub
```bash
cd /Users/yaswanthgandhi/Documents/analytics/enviromaster
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

### Step 2: Import to Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your `enviromaster` repository
4. Vercel auto-detects Vite configuration

### Step 3: Configure Environment Variables
In Vercel dashboard, add:
```
VITE_API_BASE_URL = https://your-backend-url.com
```
Replace with your actual backend URL (Digital Ocean deployment).

### Step 4: Deploy
Click "Deploy" - Vercel will:
- Install dependencies (`npm install`)
- Run type checking (`tsc -b`)
- Build production bundle (`vite build`)
- Deploy to global CDN

**Done!** Your app is live at `https://enviromaster-xxxxx.vercel.app`

---

## Detailed Deployment Steps

### Step 1: Prepare Your Repository

#### 1.1 Verify Configuration Files
Ensure these files exist (they should already be present):

**`vercel.json`** - Vercel configuration
```json
{
  "version": 2,
  "name": "enviromaster",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

**`.vercelignore`** - Files to exclude from deployment
```
node_modules
.env
.env.local
*.log
```

**`.env.example`** - Environment variable template
```bash
VITE_API_BASE_URL=http://localhost:5000
```

#### 1.2 Test Local Production Build
```bash
# Install dependencies
npm install

# Run type check
npm run type-check

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

Open http://localhost:4173 to test the production build.

#### 1.3 Commit and Push
```bash
git add .
git commit -m "Configure Vercel deployment"
git push origin main
```

### Step 2: Create Vercel Project

#### Option A: Vercel Dashboard (Recommended)

1. **Sign in to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub

2. **Import Repository**
   - Click "Add New Project"
   - Click "Import Git Repository"
   - Select your GitHub account
   - Find `enviromaster` repository
   - Click "Import"

3. **Configure Project**
   Vercel auto-detects:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

   **No changes needed** - Vercel reads from `vercel.json`

#### Option B: Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
cd /Users/yaswanthgandhi/Documents/analytics/enviromaster
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? enviromaster
# - Directory? ./
# - Override settings? No
```

### Step 3: Configure Environment Variables

#### 3.1 Add Environment Variables in Dashboard

1. Go to your project in Vercel dashboard
2. Click "Settings" tab
3. Click "Environment Variables" in sidebar
4. Add the following:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_API_BASE_URL` | `https://your-backend.ondigitalocean.app` | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |

**Important Notes:**
- Replace `your-backend.ondigitalocean.app` with your actual backend URL
- All Vite environment variables must start with `VITE_`
- Changes require redeployment to take effect

#### 3.2 Environment Variable Best Practices

**For Development:**
```bash
VITE_API_BASE_URL=http://localhost:5000
```

**For Production:**
```bash
VITE_API_BASE_URL=https://api.yourdomain.com
```

**For Staging/Preview:**
```bash
VITE_API_BASE_URL=https://staging-api.yourdomain.com
```

#### 3.3 Verify Environment Variables

Create a test endpoint to verify:
```typescript
// src/config/api.ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

console.log('API Base URL:', API_BASE_URL);
```

### Step 4: Deploy

#### Automatic Deployment (Recommended)

Vercel automatically deploys when you push to GitHub:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

**Deployment Flow:**
1. GitHub webhook triggers Vercel
2. Vercel clones your repository
3. Installs dependencies
4. Runs build command
5. Deploys to global CDN
6. Sends deployment notification

#### Manual Deployment

```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel
```

### Step 5: Verify Deployment

#### 5.1 Check Deployment Status

1. Go to Vercel dashboard
2. Click on your project
3. View deployment logs
4. Check for errors

#### 5.2 Test Production URL

Visit your deployment URL: `https://enviromaster-xxxxx.vercel.app`

**Test Checklist:**
- [ ] App loads without errors
- [ ] API calls connect to backend
- [ ] Authentication works
- [ ] Forms submit successfully
- [ ] Navigation works (all routes)
- [ ] Images and assets load
- [ ] Mobile responsive design works
- [ ] Console has no errors

#### 5.3 Test API Connection

Open browser console and check:
```javascript
// Should see successful API calls
fetch('https://your-backend.com/health')
  .then(r => r.json())
  .then(console.log)
```

---

## Environment Variables

### Required Variables

#### `VITE_API_BASE_URL`
- **Description**: Backend API base URL
- **Local**: `http://localhost:5000`
- **Production**: `https://your-backend.ondigitalocean.app`
- **Important**: NO trailing slash!

### How to Access in Code

```typescript
// ✅ Correct
const API_URL = import.meta.env.VITE_API_BASE_URL;

// ❌ Wrong
const API_URL = process.env.VITE_API_BASE_URL; // Don't use process.env in Vite
```

### Environment-Specific Configuration

```typescript
// src/config/environment.ts
export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
};

// Usage
import { ENV } from './config/environment';
console.log('API URL:', ENV.API_BASE_URL);
```

---

## Custom Domain Setup

### Step 1: Add Domain in Vercel

1. Go to Project Settings
2. Click "Domains" tab
3. Click "Add Domain"
4. Enter your domain: `app.yourdomain.com`
5. Click "Add"

### Step 2: Configure DNS

#### Option A: Using Vercel Nameservers (Recommended)

Vercel provides nameservers:
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Update nameservers to Vercel's
3. Wait for DNS propagation (5 minutes - 48 hours)

#### Option B: Using CNAME Record

1. Go to your DNS provider
2. Add CNAME record:
   - **Name**: `app` (or `www`)
   - **Value**: `cname.vercel-dns.com`
   - **TTL**: 3600

3. For apex domain (yourdomain.com):
   - Add A records pointing to Vercel IPs:
     ```
     76.76.21.21
     76.76.21.22
     ```

### Step 3: Verify Domain

1. Vercel automatically provisions SSL certificate
2. Check domain status in Vercel dashboard
3. Visit `https://app.yourdomain.com`

**SSL Certificate:**
- Automatically issued by Let's Encrypt
- Auto-renews every 90 days
- Free and included

---

## Deployment Verification

### Health Check Endpoints

Test these URLs after deployment:

```bash
# Frontend health
curl https://enviromaster-xxxxx.vercel.app

# Backend health
curl https://your-backend.com/health

# Test API connection
curl https://your-backend.com/api/zoho-upload/companies?page=1
```

### Performance Testing

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run performance audit
lighthouse https://enviromaster-xxxxx.vercel.app \
  --output html \
  --output-path ./lighthouse-report.html

# Open report
open lighthouse-report.html
```

**Target Scores:**
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

### Browser Testing

Test in multiple browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Troubleshooting

### Build Failures

#### Error: "Build failed with exit code 1"

**Check build logs:**
1. Go to Vercel dashboard
2. Click on failed deployment
3. View build logs

**Common causes:**
```bash
# TypeScript errors
npm run type-check  # Fix TypeScript errors locally

# ESLint errors
npm run lint:fix    # Fix linting errors

# Missing dependencies
npm install         # Install all dependencies

# Node version mismatch
# Add to package.json:
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

#### Error: "Module not found"

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Or in Vercel dashboard:
# Settings > General > Clear Cache > Redeploy
```

### Environment Variable Issues

#### Error: "API_BASE_URL is undefined"

**Check:**
1. Variable name starts with `VITE_` prefix
2. Variable is set in Vercel dashboard
3. Deployment was triggered after adding variable
4. Using `import.meta.env` not `process.env`

**Debug:**
```typescript
console.log('All env vars:', import.meta.env);
console.log('API URL:', import.meta.env.VITE_API_BASE_URL);
```

### CORS Issues

#### Error: "Access-Control-Allow-Origin" blocked

**Backend must allow Vercel domain:**

```javascript
// backend/src/app.js
const allowedOrigins = [
  'http://localhost:5173',
  'https://enviromaster-xxxxx.vercel.app',
  'https://app.yourdomain.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

### 404 Errors on Refresh

**Already fixed in `vercel.json`:**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This ensures all routes fall back to index.html for client-side routing.

### Deployment is Slow

**Optimization tips:**
1. Use `npm ci` instead of `npm install` (faster, more reliable)
2. Reduce dependencies
3. Enable caching in Vercel settings
4. Use `vercel.json` to optimize build

### Preview Deployments Not Working

**Check:**
1. GitHub integration is connected
2. Preview deployments are enabled in settings
3. Branch is not in `.vercelignore`

---

## Performance Optimization

### Build Optimizations (Already Configured)

#### Code Splitting
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'icons': ['@fortawesome/react-fontawesome', 'react-icons'],
          'http': ['axios']
        }
      }
    }
  }
});
```

#### Asset Optimization
- Images: Organized in `assets/img/`
- Fonts: Organized in `assets/fonts/`
- JS: Organized in `assets/js/`
- CSS: Code-split and minified
- Cache: 1 year for immutable assets

### Runtime Optimizations

#### Lazy Loading Routes
```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

#### Image Optimization
```typescript
// Use modern formats
<img
  src="/image.webp"
  loading="lazy"
  decoding="async"
  alt="Description"
/>
```

### Vercel Features

#### Edge Network
- Automatic global CDN
- 100+ edge locations worldwide
- Instant cache invalidation

#### Image Optimization
```typescript
// Install @vercel/image
import Image from '@vercel/image';

<Image
  src="/large-image.jpg"
  alt="Description"
  width={800}
  height={600}
  quality={85}
/>
```

#### Analytics
Enable in Vercel dashboard:
- Settings > Analytics > Enable
- Real user monitoring
- Core Web Vitals tracking
- Free tier: 100k data points/month

---

## Monitoring & Analytics

### Vercel Analytics

**Enable:**
1. Go to Project Settings
2. Click "Analytics"
3. Click "Enable"

**Metrics tracked:**
- Page views
- Unique visitors
- Core Web Vitals (LCP, FID, CLS)
- Custom events

**Custom Events:**
```typescript
// Install @vercel/analytics
npm install @vercel/analytics

// src/main.tsx
import { Analytics } from '@vercel/analytics/react';

function App() {
  return (
    <>
      <YourApp />
      <Analytics />
    </>
  );
}
```

### Error Tracking

**Option 1: Sentry (Recommended)**
```bash
npm install @sentry/react

# Initialize in main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ],
  tracesSampleRate: 1.0
});
```

**Option 2: LogRocket**
```bash
npm install logrocket

# Initialize
import LogRocket from 'logrocket';
LogRocket.init('your-app-id');
```

### Performance Monitoring

**Web Vitals:**
```typescript
// src/utils/webVitals.ts
import { onCLS, onFID, onLCP } from 'web-vitals';

export function reportWebVitals() {
  onCLS(console.log);
  onFID(console.log);
  onLCP(console.log);
}

// Call in main.tsx
reportWebVitals();
```

---

## Security Best Practices

### Content Security Policy (Already Configured)

```json
{
  "headers": [
    {
      "key": "X-Content-Type-Options",
      "value": "nosniff"
    },
    {
      "key": "X-Frame-Options",
      "value": "DENY"
    },
    {
      "key": "X-XSS-Protection",
      "value": "1; mode=block"
    }
  ]
}
```

### Environment Variables

**Never commit:**
- `.env`
- `.env.local`
- `.env.production`

**Always use:**
- `.env.example` (template)
- Vercel dashboard for production variables

### API Security

**Always use HTTPS:**
```typescript
// ✅ Correct
const API_URL = 'https://api.yourdomain.com';

// ❌ Wrong (in production)
const API_URL = 'http://api.yourdomain.com';
```

---

## Cost Estimation

### Vercel Free Tier (Hobby)
- **Price**: $0/month
- **Bandwidth**: 100 GB/month
- **Build time**: 100 hours/month
- **Deployments**: Unlimited
- **Domains**: Unlimited
- **Team members**: 1

**Recommended for:**
- Personal projects
- Staging environments
- Low-traffic apps

### Vercel Pro Tier
- **Price**: $20/month
- **Bandwidth**: 1 TB/month
- **Build time**: 400 hours/month
- **Deployments**: Unlimited
- **Domains**: Unlimited
- **Team members**: Unlimited
- **Analytics**: Advanced
- **Support**: Email support

**Recommended for:**
- Production apps
- Team collaboration
- Commercial projects

### Cost Optimization Tips
1. Use Vercel for frontend only (cheaper than full-stack)
2. Enable caching for static assets
3. Optimize images (smaller = less bandwidth)
4. Use code splitting (smaller bundles)
5. Monitor bandwidth usage in dashboard

---

## Rollback & Recovery

### Rollback to Previous Deployment

**In Dashboard:**
1. Go to "Deployments" tab
2. Find working deployment
3. Click three dots menu
4. Click "Promote to Production"

**Using CLI:**
```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]
```

### Instant Rollback
- No build time required
- Instant global rollout
- Previous deployment still cached

---

## CI/CD Workflow

### Automated Workflow

```
Push to GitHub
      ↓
Vercel webhook triggered
      ↓
Clone repository
      ↓
Install dependencies (npm ci)
      ↓
Run type check (tsc -b)
      ↓
Build production (vite build)
      ↓
Deploy to CDN
      ↓
Invalidate cache
      ↓
Send notification
```

### Branch Deployments

- **main branch** → Production deployment
- **Other branches** → Preview deployments
- **Pull requests** → Preview deployments with unique URL

### Preview URLs

Each deployment gets unique URL:
```
main branch:        enviromaster.vercel.app
feature branch:     enviromaster-git-feature.vercel.app
PR #123:            enviromaster-git-pr-123.vercel.app
```

---

## Next Steps

### 1. Set Up Monitoring
- [ ] Enable Vercel Analytics
- [ ] Set up Sentry error tracking
- [ ] Configure alert notifications

### 2. Configure Custom Domain
- [ ] Purchase domain (if needed)
- [ ] Add domain in Vercel
- [ ] Configure DNS records
- [ ] Verify SSL certificate

### 3. Optimize Performance
- [ ] Run Lighthouse audit
- [ ] Implement lazy loading
- [ ] Optimize images
- [ ] Enable Vercel Image Optimization

### 4. Team Setup
- [ ] Invite team members
- [ ] Set up deployment notifications
- [ ] Configure branch protection
- [ ] Document deployment process

---

## Support & Resources

### Documentation
- [Vercel Documentation](https://vercel.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Router](https://reactrouter.com/)

### Community
- [Vercel Discord](https://vercel.com/discord)
- [GitHub Discussions](https://github.com/vercel/vercel/discussions)

### Contact
- Vercel Support: support@vercel.com
- Status Page: https://vercel-status.com

---

## Checklist

### Pre-Deployment
- [ ] Code tested locally
- [ ] Production build works (`npm run build`)
- [ ] Environment variables documented
- [ ] Backend is deployed and accessible
- [ ] CORS configured in backend
- [ ] Code pushed to GitHub

### Deployment
- [ ] Vercel project created
- [ ] Environment variables configured
- [ ] First deployment successful
- [ ] Production URL accessible
- [ ] API connection working

### Post-Deployment
- [ ] All features tested in production
- [ ] Performance tested (Lighthouse)
- [ ] Error tracking set up
- [ ] Analytics enabled
- [ ] Custom domain configured (optional)
- [ ] Team notified

---

**Deployment Complete!** 🎉

Your EnviroMaster frontend is now live on Vercel with automated deployments.

**Production URL**: https://enviromaster-xxxxx.vercel.app

Every push to `main` branch automatically deploys to production.
