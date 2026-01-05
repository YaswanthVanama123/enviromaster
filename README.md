# EnviroMaster Frontend

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![React](https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1.14-646CFF?logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Modern, responsive React frontend for the EnviroMaster application with automated Vercel deployment.

---

## 🚀 Features

- ⚡ **Lightning Fast** - Built with Vite for instant HMR and optimized production builds
- 📱 **Fully Responsive** - Mobile-first design that works on all devices
- 🔐 **Secure** - Security headers, HTTPS, and best practices
- 🎨 **Modern UI** - Clean interface with FontAwesome and React Icons
- 🔄 **Auto Deploy** - Push to GitHub → Automatic deployment to Vercel
- 📊 **Optimized** - Code splitting, lazy loading, and asset optimization
- 🧪 **Type Safe** - Full TypeScript support with strict type checking
- 🌐 **Global CDN** - Distributed worldwide via Vercel Edge Network
- 🚀 **Preview Deployments** - Automatic preview URLs for pull requests

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Development](#development)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [Tech Stack](#tech-stack)
- [Documentation](#documentation)

---

## 🏃 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Backend API running (see backend repository)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd enviromaster

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Update .env with your backend URL
# VITE_API_BASE_URL=http://localhost:5000

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 💻 Development

### Development Server

```bash
# Start dev server with HMR
npm run dev

# Start on specific port
PORT=3000 npm run dev
```

### Type Checking

```bash
# Run TypeScript type checker
npm run type-check
```

### Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

## 🚀 Deployment

### Vercel Built-in CI/CD (Recommended) ⭐

Vercel provides automatic CI/CD through GitHub integration - no additional configuration needed!

**Quick Deploy (5 minutes):**

1. Push code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. Add environment variable: `VITE_API_BASE_URL`
5. Click Deploy

**Automatic Features:**
- ✅ **Auto-deploy on push** - Every commit to `main` triggers deployment
- ✅ **Preview deployments** - Every PR gets a unique preview URL
- ✅ **Build caching** - Faster subsequent builds
- ✅ **Global CDN** - Instant deployment to 100+ edge locations
- ✅ **SSL/HTTPS** - Automatic certificate provisioning
- ✅ **Rollback** - One-click rollback to previous deployments
- ✅ **Environment variables** - Separate configs for production/preview/development

**Detailed Instructions:**
- **Quick Start**: See [VERCEL_QUICK_START.md](VERCEL_QUICK_START.md)
- **Full Guide**: See [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md)
- **Summary**: See [DEPLOYMENT_COMPLETE.md](DEPLOYMENT_COMPLETE.md)

### Production Configuration

All production optimizations are already configured:
- ✅ Code splitting (React, Icons, HTTP clients)
- ✅ Asset optimization (images, fonts, JS)
- ✅ Security headers
- ✅ Long-term caching (1 year for immutable assets)
- ✅ Modern browser targeting
- ✅ CSS minification and code splitting

---

## 📁 Project Structure

```
enviromaster/
├── public/                 # Static assets
├── src/
│   ├── assets/            # Images, fonts, etc.
│   ├── components/        # React components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API services
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript types
│   ├── App.tsx            # Main App component
│   └── main.tsx           # Entry point
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
├── .vercelignore          # Vercel deployment exclusions
├── vercel.json            # Vercel configuration
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
├── package.json           # Dependencies and scripts
├── README.md              # This file
├── VERCEL_DEPLOYMENT_GUIDE.md  # Vercel deployment guide
├── VERCEL_QUICK_START.md       # Quick deployment guide
├── DEPLOYMENT_COMPLETE.md      # Deployment summary
└── PERFORMANCE_GUIDE.md        # Performance optimization guide
```

---

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run build:prod` | Build with production environment |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors automatically |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run type-check` | Run TypeScript type checker |
| `npm run clean` | Clean build cache and dist folder |
| `npm run vercel-build` | Build script for Vercel deployment |

---

## 🔧 Environment Variables

### Required Variables

Create a `.env` file based on `.env.example`:

```bash
# Backend API URL (NO trailing slash!)
VITE_API_BASE_URL=http://localhost:5000
```

### Environment-Specific URLs

```bash
# Local Development
VITE_API_BASE_URL=http://localhost:5000

# Staging
VITE_API_BASE_URL=https://staging-api.yourdomain.com

# Production
VITE_API_BASE_URL=https://api.yourdomain.com
```

### Accessing in Code

```typescript
// ✅ Correct (Vite)
const apiUrl = import.meta.env.VITE_API_BASE_URL;

// ❌ Wrong
const apiUrl = process.env.VITE_API_BASE_URL;
```

---

## 🛠️ Tech Stack

### Core
- **React 19.1.1** - UI library
- **TypeScript 5.9.3** - Type safety
- **Vite 7.1.14** - Build tool and dev server
- **React Router DOM 7.9.5** - Client-side routing

### UI & Icons
- **FontAwesome 7.1.0** - Icon library
- **React Icons 5.5.0** - Additional icons
- **React Window 1.8.11** - Virtualization for large lists

### HTTP & State
- **Axios 1.13.2** - HTTP client

### Development Tools
- **ESLint 9.36.0** - Code linting
- **TypeScript ESLint 8.45.0** - TypeScript linting
- **Vitest 4.0.16** - Unit testing

---

## 📦 Build Optimizations

### Code Splitting

Configured in `vite.config.ts`:
- **react-vendor**: React, React DOM, React Router
- **icons**: FontAwesome, React Icons
- **http**: Axios

### Asset Organization
- Images: `assets/img/[name]-[hash][extname]`
- Fonts: `assets/fonts/[name]-[hash][extname]`
- JavaScript: `assets/js/[name]-[hash].js`

### Performance Features
- ✅ Tree shaking (removes unused code)
- ✅ Minification (reduces bundle size)
- ✅ CSS code splitting
- ✅ Long-term caching (1 year for assets)
- ✅ Dependency pre-bundling
- ✅ Modern browser target (smaller bundles)

---

## 🔒 Security

### Headers Configured (vercel.json)

- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Referrer control
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` - Feature restrictions

### Best Practices

- ✅ HTTPS only in production
- ✅ Environment variables for sensitive data
- ✅ No secrets in source code
- ✅ CORS properly configured
- ✅ Secure headers enabled

---

## 📚 Documentation

### Deployment Guides
- **[VERCEL_QUICK_START.md](VERCEL_QUICK_START.md)** - 5-minute deployment guide
- **[VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md)** - Comprehensive deployment guide
- **[DEPLOYMENT_COMPLETE.md](DEPLOYMENT_COMPLETE.md)** - Configuration summary
- **[PERFORMANCE_GUIDE.md](PERFORMANCE_GUIDE.md)** - Performance optimization guide

### Configuration Files
- **[vercel.json](vercel.json)** - Vercel platform configuration
- **[vite.config.ts](vite.config.ts)** - Build and dev server configuration
- **[.env.example](.env.example)** - Environment variables template

---

## 🧪 Testing

### Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Write Tests

```typescript
// Example test
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText(/EnviroMaster/i)).toBeInTheDocument();
  });
});
```

---

## 🐛 Troubleshooting

### Common Issues

#### Build Fails with TypeScript Errors
```bash
# Check for type errors
npm run type-check

# Fix errors and rebuild
npm run build
```

#### Environment Variable is Undefined
```bash
# Ensure variable starts with VITE_ prefix
VITE_API_BASE_URL=http://localhost:5000

# Restart dev server after changing .env
npm run dev
```

#### CORS Errors
Backend must allow your frontend domain:
```javascript
// backend/src/app.js
const allowedOrigins = [
  'http://localhost:5173',
  'https://your-app.vercel.app',
];
```

#### Port Already in Use
```bash
# Use different port
PORT=3000 npm run dev

# Or kill process using port 5173
lsof -ti:5173 | xargs kill
```

---

## 🤝 Contributing

### Development Workflow

1. Create a new branch
```bash
git checkout -b feature/my-feature
```

2. Make your changes
3. Run tests and linting
```bash
npm run type-check
npm run lint:fix
npm test
```

4. Commit and push
```bash
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature
```

5. Create Pull Request on GitHub

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Build/tooling changes

---

## 📈 Performance

### Lighthouse Scores (Target)

- **Performance**: > 90
- **Accessibility**: > 90
- **Best Practices**: > 90
- **SEO**: > 90

### Monitoring

- **Vercel Analytics** - Real-time metrics (enable in dashboard)
- **Web Vitals** - Core performance metrics
- **Build Time** - Optimized for fast builds

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **Backend Repository**: [enviro-bckend](../enviro-bckend)
- **Vercel Dashboard**: [vercel.com/dashboard](https://vercel.com/dashboard)
- **Vite Documentation**: [vitejs.dev](https://vitejs.dev/)
- **React Documentation**: [react.dev](https://react.dev/)

---

## 📞 Support

### Documentation
- 📖 Quick Start: [VERCEL_QUICK_START.md](VERCEL_QUICK_START.md)
- 📚 Full Guide: [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md)

### Community
- 💬 Vercel Discord: [vercel.com/discord](https://vercel.com/discord)
- 🐛 GitHub Issues: [Create an issue](https://github.com/your-org/enviromaster/issues)

---

## ✨ Status

- **Development**: ✅ Active
- **Deployment**: ✅ Configured
- **Production**: 🟢 Ready

**Last Updated**: January 2026

---

**Built with ❤️ using React, TypeScript, and Vite**
