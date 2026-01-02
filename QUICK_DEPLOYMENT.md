# EnviroMaster - Quick Deployment Guide

This is a quick reference for deploying both backend and frontend to Render.

## 🚀 Deployment Order

**IMPORTANT: Deploy in this order:**

1. **Backend First** → Get backend URL
2. **Frontend Second** → Use backend URL in config

---

## Backend Deployment (Node.js)

### 1. Configure Environment Variables

Create `.env` file with production values:
```bash
cp .env.example .env
nano .env
```

Key variables:
- `NODE_ENV=production`
- `MONGO_URI=mongodb+srv://...` (MongoDB Atlas)
- `SERVER_URL=https://your-backend.onrender.com` (set after deployment)
- `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`
- `ZOHO_REDIRECT_URI=https://your-backend.onrender.com/oauth/callback`
- `EMAIL_USER`, `EMAIL_PASSWORD`
- `JWT_SECRET` (generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex')"`)
- `ALLOWED_ORIGINS` (set after frontend deployment)

### 2. Push to GitHub

```bash
cd enviro-bckend
git add .
git commit -m "Prepare backend for production"
git push origin main
```

### 3. Deploy to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. **New +** → **Blueprint** (or **Web Service**)
3. Connect GitHub repository
4. Configure environment variables in dashboard
5. Deploy

### 4. Complete OAuth Setup

After deployment:
1. Update `SERVER_URL` env var with deployed URL
2. Update Zoho Console redirect URI
3. Visit `https://your-backend.onrender.com/oauth/zoho/auth`
4. Complete OAuth flow

**Backend URL**: `https://your-backend-name.onrender.com`

---

## Frontend Deployment (Static Site)

### 1. Configure Environment Variable

Create `.env` file:
```bash
cd enviromaster
cp .env.example .env
nano .env
```

Set backend URL (from above):
```
VITE_API_BASE_URL=https://your-backend.onrender.com
```

**⚠️ NO trailing slash!**

### 2. Test Build Locally

```bash
npm install
npm run build
npm run preview
```

Visit `http://localhost:4173` and test that API calls work.

### 3. Push to GitHub

```bash
git add .
git commit -m "Prepare frontend for production"
git push origin main
```

### 4. Deploy to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. **New +** → **Static Site**
3. Connect GitHub repository
4. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
5. Add environment variable:
   - `VITE_API_BASE_URL=https://your-backend.onrender.com`
6. Deploy

**Frontend URL**: `https://your-frontend-name.onrender.com`

---

## Final Configuration

### Update Backend CORS

1. Go to backend service in Render
2. Update `ALLOWED_ORIGINS` env var:
   ```
   ALLOWED_ORIGINS=https://your-frontend.onrender.com
   ```
3. Save and redeploy

### Verify Everything Works

1. **Backend Health**: `curl https://your-backend.onrender.com/health`
   - Should return: `{"ok":true}`

2. **Frontend**: Visit `https://your-frontend.onrender.com`
   - Should load homepage
   - No console errors

3. **API Connection**: Try login/create proposal
   - Should work without CORS errors

---

## Troubleshooting Quick Fixes

### "Failed to fetch" errors
```bash
# Check these in order:
1. Backend is running: curl https://your-backend.onrender.com/health
2. Frontend env var is correct: check VITE_API_BASE_URL
3. Backend CORS includes frontend URL: check ALLOWED_ORIGINS
4. Redeploy frontend after env var changes
```

### CORS Policy Errors
```bash
# Backend .env should have:
ALLOWED_ORIGINS=https://your-frontend.onrender.com

# Multiple origins (comma-separated):
ALLOWED_ORIGINS=https://frontend1.com,https://frontend2.com
```

### 404 on Page Refresh
```bash
# Ensure render.yaml has routes configuration:
routes:
  - type: rewrite
    source: /*
    destination: /index.html
```

---

## Quick Reference

### Backend
- **Type**: Web Service (Node.js)
- **Build**: `npm install`
- **Start**: `npm start`
- **Health**: `/health`
- **Port**: `5000`

### Frontend
- **Type**: Static Site
- **Build**: `npm install && npm run build`
- **Publish**: `dist`
- **Preview**: `npm run preview`

### Environment Files
- **Backend**: `/enviro-bckend/.env`
- **Frontend**: `/enviromaster/.env`

### Important URLs
- **Backend API**: `https://your-backend.onrender.com`
- **Frontend App**: `https://your-frontend.onrender.com`
- **Zoho OAuth**: `https://your-backend.onrender.com/oauth/zoho/auth`
- **OAuth Debug**: `https://your-backend.onrender.com/oauth/debug`

---

## Deployment Checklist

### Backend
- [ ] MongoDB Atlas configured (0.0.0.0/0 IP whitelist)
- [ ] All environment variables set in Render
- [ ] Zoho OAuth redirect URI updated
- [ ] OAuth flow completed (refresh token saved)
- [ ] Health endpoint returns OK
- [ ] Email SMTP credentials working

### Frontend
- [ ] VITE_API_BASE_URL set to backend URL
- [ ] Production build tested locally
- [ ] Deployed to Render as static site
- [ ] Backend CORS updated with frontend URL
- [ ] No console errors in browser
- [ ] API calls working (test login/proposals)

### Final Checks
- [ ] Backend health check: `curl https://backend.onrender.com/health`
- [ ] Frontend loads: `https://frontend.onrender.com`
- [ ] Login works
- [ ] Create proposal works
- [ ] PDF generation works
- [ ] Zoho integration works

---

## Need More Detail?

- **Backend**: See `enviro-bckend/DEPLOYMENT.md`
- **Frontend**: See `enviromaster/DEPLOYMENT.md`
- **Environment Variables**: See `.env.example` files

---

**🎉 Your deployment is complete when all checklist items are checked!**
