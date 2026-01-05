# GitHub Actions CI/CD Setup Guide

Complete guide for setting up automated deployment to Vercel using GitHub Actions.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step 1: Create Vercel Project](#step-1-create-vercel-project)
- [Step 2: Get Vercel Credentials](#step-2-get-vercel-credentials)
- [Step 3: Configure GitHub Secrets](#step-3-configure-github-secrets)
- [Step 4: Test the Pipeline](#step-4-test-the-pipeline)
- [Workflow Details](#workflow-details)
- [Troubleshooting](#troubleshooting)

---

## Overview

This CI/CD pipeline automatically:
- ✅ Runs quality checks (linting, type checking, tests)
- ✅ Builds production bundle
- ✅ Deploys to Vercel on every push to `main`
- ✅ Creates preview deployments for pull requests
- ✅ Runs Lighthouse performance tests
- ✅ Sends deployment notifications

---

## Prerequisites

- GitHub repository with your code
- Vercel account (sign up at [vercel.com](https://vercel.com))
- Git installed locally

---

## Step 1: Create Vercel Project

### Option A: Via Vercel Dashboard (Recommended)

1. **Sign in to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub

2. **Import Project**
   - Click "Add New Project"
   - Click "Import Git Repository"
   - Select your `enviromaster` repository
   - Click "Import"

3. **Configure Project**
   - Framework Preset: Vite
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add: `VITE_API_BASE_URL` = `https://your-backend-url.com`
   - Click "Deploy"

5. **Note the Project Details**
   - After deployment, you'll need the Project ID and Org ID (see next step)

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project
cd /Users/yaswanthgandhi/Documents/analytics/enviromaster
vercel link

# Follow prompts to create/link project
```

---

## Step 2: Get Vercel Credentials

You need three pieces of information for GitHub Actions:

### 1. Vercel Token

**Get Token:**
1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Name: `GitHub Actions - EnviroMaster`
4. Scope: `Full Account`
5. Expiration: `No Expiration` (or set custom)
6. Click "Create Token"
7. **Copy the token immediately** (you won't see it again!)

**Example:**
```
vercel_token_1234567890abcdef1234567890abcdef
```

### 2. Vercel Organization ID

**Method 1: Via Dashboard**
1. Go to [vercel.com/account](https://vercel.com/account)
2. Click on your profile/team
3. Go to "Settings"
4. Look for "Team ID" or "Organization ID"

**Method 2: Via CLI**
```bash
cd /Users/yaswanthgandhi/Documents/analytics/enviromaster
vercel link

# After linking, check the .vercel/project.json file
cat .vercel/project.json
```

The file contains:
```json
{
  "orgId": "team_xxxxxxxxxxxxxxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**Example:**
```
team_abc123def456ghi789jkl012mno345
```

### 3. Vercel Project ID

**Method 1: From .vercel/project.json**
```bash
cat .vercel/project.json
# Look for "projectId"
```

**Method 2: From Project Settings**
1. Go to your project in Vercel dashboard
2. Click "Settings"
3. Scroll to "Project ID"

**Example:**
```
prj_abc123def456ghi789jkl012mno345
```

---

## Step 3: Configure GitHub Secrets

### Add Secrets to GitHub Repository

1. **Go to Repository Settings**
   - Navigate to your GitHub repository
   - Click "Settings" tab
   - Click "Secrets and variables" > "Actions"

2. **Add Repository Secrets**
   Click "New repository secret" for each:

#### Secret 1: VERCEL_TOKEN
```
Name: VERCEL_TOKEN
Value: [paste your Vercel token here]
```

#### Secret 2: VERCEL_ORG_ID
```
Name: VERCEL_ORG_ID
Value: [paste your Vercel org ID here]
```

#### Secret 3: VERCEL_PROJECT_ID
```
Name: VERCEL_PROJECT_ID
Value: [paste your Vercel project ID here]
```

#### Secret 4: VITE_API_BASE_URL (Optional)
```
Name: VITE_API_BASE_URL
Value: https://your-backend-url.ondigitalocean.app
```

**Note:** This is only needed for the GitHub Actions build step. The actual production environment variable should be set in Vercel dashboard.

3. **Verify Secrets**
   - You should now see 3-4 secrets listed
   - ✅ VERCEL_TOKEN
   - ✅ VERCEL_ORG_ID
   - ✅ VERCEL_PROJECT_ID
   - ✅ VITE_API_BASE_URL (optional)

---

## Step 4: Test the Pipeline

### Test Automatic Deployment

1. **Make a change to your code**
```bash
cd /Users/yaswanthgandhi/Documents/analytics/enviromaster

# Make a small change
echo "// CI/CD test" >> src/App.tsx

# Commit and push
git add .
git commit -m "test: trigger CI/CD pipeline"
git push origin main
```

2. **Watch the deployment**
   - Go to your GitHub repository
   - Click "Actions" tab
   - You should see "Deploy to Vercel" workflow running

3. **Check the workflow steps**
   - Quality Checks (linting, type checking, tests)
   - Build Application
   - Deploy to Vercel (Production)
   - Lighthouse Performance Test
   - Notify Deployment Status

4. **Verify deployment**
   - Once complete, check your Vercel dashboard
   - Your app should be deployed
   - Production URL: `https://enviromaster-xxxxx.vercel.app`

### Test Preview Deployment

1. **Create a new branch**
```bash
git checkout -b feature/test-preview

# Make a change
echo "// Preview test" >> src/App.tsx

# Commit and push
git add .
git commit -m "feat: test preview deployment"
git push origin feature/test-preview
```

2. **Create Pull Request**
   - Go to GitHub repository
   - Click "Pull requests"
   - Click "New pull request"
   - Select your branch
   - Create pull request

3. **Check preview deployment**
   - GitHub Actions will run automatically
   - A comment will be added to the PR with the preview URL
   - Preview URL: `https://enviromaster-git-feature-test-preview-xxxxx.vercel.app`

---

## Workflow Details

### Workflow Triggers

The CI/CD pipeline runs on:
- **Push to `main` branch** → Production deployment
- **Pull request to `main`** → Preview deployment
- **Manual trigger** → Via "Run workflow" button in Actions tab

### Jobs Overview

```
┌─────────────────┐
│ Quality Checks  │  Lint, Type Check, Test
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Build App       │  Create production bundle
└────────┬────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
┌─────────┐ ┌──────────┐
│ Deploy  │ │ Deploy   │
│ Prod    │ │ Preview  │
└────┬────┘ └──────────┘
     │
     ▼
┌─────────────────┐
│ Performance     │  Run Lighthouse
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Notify          │  Send status
└─────────────────┘
```

### Deployment Flow

**For Main Branch:**
1. Quality checks run
2. App is built
3. Deploys to Vercel production
4. Runs Lighthouse performance test
5. Sends notification

**For Pull Requests:**
1. Quality checks run
2. App is built
3. Deploys to Vercel preview
4. Comments preview URL on PR

---

## Troubleshooting

### Issue 1: "Error: Invalid token"

**Cause:** Vercel token is incorrect or expired

**Solution:**
1. Generate a new token at [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Update `VERCEL_TOKEN` secret in GitHub

### Issue 2: "Error: Project not found"

**Cause:** `VERCEL_ORG_ID` or `VERCEL_PROJECT_ID` is incorrect

**Solution:**
1. Check `.vercel/project.json` for correct IDs:
```bash
cd /Users/yaswanthgandhi/Documents/analytics/enviromaster
vercel link
cat .vercel/project.json
```
2. Update secrets in GitHub

### Issue 3: Build fails with "Module not found"

**Cause:** Dependencies not installed correctly

**Solution:**
1. Check that all dependencies are in `package.json`
2. Delete `node_modules` and `package-lock.json`
3. Run `npm install` locally
4. Commit updated `package-lock.json`

### Issue 4: Type check fails

**Cause:** TypeScript errors in code

**Solution:**
1. Run type check locally:
```bash
npm run type-check
```
2. Fix all type errors
3. Commit and push

### Issue 5: Deployment succeeds but app doesn't work

**Cause:** Environment variables not set in Vercel

**Solution:**
1. Go to Vercel dashboard
2. Project Settings > Environment Variables
3. Add `VITE_API_BASE_URL` with your backend URL
4. Redeploy

### Issue 6: Lighthouse test fails

**Cause:** Performance scores below threshold or deployment not ready

**Solution:**
1. Check Lighthouse report in workflow logs
2. Optimize performance (see PERFORMANCE_GUIDE.md)
3. You can disable Lighthouse test by removing the job from `.github/workflows/deploy.yml`

---

## Advanced Configuration

### Customize Build Command

Edit `.github/workflows/deploy.yml`:

```yaml
- name: Build production bundle
  run: npm run build:prod  # Change this to your custom build script
```

### Add Environment-Specific Deployments

Add staging environment:

```yaml
deploy-staging:
  name: Deploy to Vercel (Staging)
  runs-on: ubuntu-latest
  needs: build
  if: github.ref == 'refs/heads/staging'

  steps:
    # Same steps as production but with different environment
```

### Configure Branch Protection

1. Go to GitHub repository Settings
2. Click "Branches"
3. Add rule for `main` branch:
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date
   - Select: "Quality Checks", "Build Application"

### Add Slack/Discord Notifications

Install Slack/Discord webhook action:

```yaml
- name: Send Slack notification
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Monitoring Deployments

### View Deployment History

**GitHub Actions:**
- Go to repository > Actions tab
- View all workflow runs
- Click on a run to see detailed logs

**Vercel Dashboard:**
- Go to project in Vercel
- Click "Deployments" tab
- View all deployments with timestamps

### Check Deployment Status

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# List deployments
vercel ls

# Check deployment details
vercel inspect [deployment-url]
```

---

## Rollback Instructions

### Rollback via Vercel Dashboard

1. Go to project in Vercel
2. Click "Deployments"
3. Find working deployment
4. Click "..." menu
5. Click "Promote to Production"

### Rollback via Git

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard [commit-hash]
git push --force origin main  # Be careful with force push!
```

---

## Security Best Practices

### Secrets Management

- ✅ Never commit secrets to Git
- ✅ Use GitHub Secrets for sensitive data
- ✅ Rotate tokens every 90 days
- ✅ Use least-privilege access

### Token Permissions

- Vercel token should have minimum required permissions
- Consider using team tokens instead of personal tokens
- Enable 2FA on Vercel account

### Branch Protection

- Require reviews before merging to `main`
- Require status checks to pass
- Prevent force pushes to `main`

---

## CI/CD Pipeline Checklist

### Initial Setup
- [ ] Vercel account created
- [ ] Project created in Vercel
- [ ] Environment variables set in Vercel
- [ ] Vercel token generated
- [ ] GitHub secrets configured
- [ ] Workflow file committed (`.github/workflows/deploy.yml`)

### Before First Push
- [ ] Code tested locally
- [ ] Type check passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)

### After First Deployment
- [ ] Workflow completed successfully
- [ ] Production URL accessible
- [ ] Environment variables working
- [ ] API connection working
- [ ] All features working in production

### Ongoing Maintenance
- [ ] Monitor workflow runs regularly
- [ ] Check Lighthouse scores
- [ ] Review deployment logs
- [ ] Update dependencies monthly
- [ ] Rotate tokens quarterly

---

## Cost Considerations

### GitHub Actions (Free Tier)

- **Free minutes/month**: 2,000 minutes
- **Concurrent jobs**: 20
- **Estimated usage**: ~5 minutes per deployment
- **Deployments/month**: ~400 with free tier

### Vercel (Free Tier)

- **Deployments**: Unlimited
- **Bandwidth**: 100 GB/month
- **Build time**: 100 hours/month
- **Team members**: 1

### Optimization Tips

1. **Reduce workflow runs:**
   - Skip CI for documentation changes
   - Use `[skip ci]` in commit message

2. **Cache dependencies:**
   - Already configured with `cache: 'npm'`

3. **Parallel jobs:**
   - Already optimized with job dependencies

---

## Support

### Documentation
- GitHub Actions: [docs.github.com/actions](https://docs.github.com/actions)
- Vercel CLI: [vercel.com/docs/cli](https://vercel.com/docs/cli)
- Vercel Deployments: [vercel.com/docs/deployments](https://vercel.com/docs/deployments)

### Community
- GitHub Actions Discord: [discord.gg/github](https://discord.gg/github)
- Vercel Discord: [vercel.com/discord](https://vercel.com/discord)

---

## Quick Reference

### Required Secrets

| Secret Name | Where to Get | Example Value |
|------------|-------------|---------------|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) | `vercel_token_abc123...` |
| `VERCEL_ORG_ID` | `.vercel/project.json` or Vercel Settings | `team_abc123...` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` or Project Settings | `prj_abc123...` |
| `VITE_API_BASE_URL` | Your backend URL | `https://api.example.com` |

### Common Commands

```bash
# View workflow runs
gh workflow list
gh run list
gh run view [run-id]

# Trigger workflow manually
gh workflow run deploy.yml

# Check Vercel deployments
vercel ls

# View deployment logs
vercel logs [deployment-url]
```

---

**CI/CD Pipeline Setup Complete!** 🎉

Every push to `main` now automatically deploys to production with full quality checks!
