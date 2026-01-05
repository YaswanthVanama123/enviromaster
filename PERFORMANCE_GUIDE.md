# EnviroMaster - Performance Optimization Guide

Complete guide for optimizing the performance of your EnviroMaster React application.

---

## Table of Contents

- [Build Optimizations](#build-optimizations)
- [Runtime Optimizations](#runtime-optimizations)
- [Asset Optimization](#asset-optimization)
- [Network Optimization](#network-optimization)
- [Monitoring & Metrics](#monitoring--metrics)
- [Performance Checklist](#performance-checklist)

---

## Build Optimizations

### ✅ Already Configured in vite.config.ts

#### 1. Code Splitting (Manual Chunks)
```typescript
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'icons': ['@fortawesome/react-fontawesome', '@fortawesome/free-solid-svg-icons', 'react-icons'],
  'http': ['axios']
}
```

**Benefits:**
- Separates vendor code from app code
- Better caching (vendors change less frequently)
- Parallel loading of chunks
- Smaller initial bundle size

#### 2. Asset Organization
```typescript
assetFileNames: (assetInfo) => {
  const extType = getExtType(assetInfo.name);
  return `assets/${extType}/[name]-[hash][extname]`;
}
```

**Benefits:**
- Organized folder structure
- Cache-busting with content hashes
- Long-term caching (1 year)
- Faster subsequent loads

#### 3. CSS Optimization
```typescript
cssCodeSplit: true,
cssMinify: true,
```

**Benefits:**
- CSS loaded only when needed
- Smaller CSS bundles
- Reduced initial page load

#### 4. Modern Browser Target
```typescript
target: 'esnext',
```

**Benefits:**
- Smaller JavaScript bundles
- Native ES modules support
- Better performance on modern browsers

#### 5. Dependency Pre-bundling
```typescript
optimizeDeps: {
  include: [
    'react',
    'react-dom',
    'react-router-dom',
    'axios',
    // ... more dependencies
  ]
}
```

**Benefits:**
- Faster cold starts
- Optimized dependency resolution
- Reduced request waterfall

---

## Runtime Optimizations

### 1. Lazy Loading Routes

Implement lazy loading for route components:

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// ✅ Lazy load route components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const Analytics = lazy(() => import('./pages/Analytics'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

// Simple loading component
function LoadingSpinner() {
  return (
    <div className="loading-container">
      <div className="spinner">Loading...</div>
    </div>
  );
}
```

**Benefits:**
- Reduces initial bundle size
- Loads routes only when needed
- Faster initial page load
- Better Time to Interactive (TTI)

### 2. Component Lazy Loading

Lazy load heavy components:

```typescript
// src/components/HeavyComponent.tsx
import { lazy, Suspense } from 'react';

// ✅ Lazy load heavy components
const DataTable = lazy(() => import('./DataTable'));
const Chart = lazy(() => import('./Chart'));
const Map = lazy(() => import('./Map'));

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <Suspense fallback={<div>Loading table...</div>}>
        <DataTable />
      </Suspense>

      <Suspense fallback={<div>Loading chart...</div>}>
        <Chart />
      </Suspense>

      <Suspense fallback={<div>Loading map...</div>}>
        <Map />
      </Suspense>
    </div>
  );
}
```

### 3. React Window for Large Lists

Use virtualization for large lists:

```typescript
// src/components/VirtualizedList.tsx
import { FixedSizeList } from 'react-window';

function CompanyList({ companies }) {
  // Render only visible items
  const Row = ({ index, style }) => (
    <div style={style}>
      {companies[index].name}
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={companies.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

**Benefits:**
- Renders only visible items
- Handles 10,000+ items smoothly
- Constant performance regardless of list size

### 4. Memoization

Use React.memo and useMemo:

```typescript
import { memo, useMemo } from 'react';

// ✅ Memoize expensive components
const ExpensiveComponent = memo(({ data }) => {
  return <div>{/* Expensive rendering */}</div>;
});

// ✅ Memoize expensive calculations
function DataProcessor({ items }) {
  const processedData = useMemo(() => {
    return items
      .filter(item => item.active)
      .map(item => ({
        ...item,
        calculated: expensiveCalculation(item)
      }));
  }, [items]);

  return <div>{processedData.length} items</div>;
}
```

### 5. Debouncing & Throttling

Optimize expensive operations:

```typescript
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Usage in search input
function SearchBar() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearch) {
      // API call only after 300ms of no typing
      searchAPI(debouncedSearch);
    }
  }, [debouncedSearch]);

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

---

## Asset Optimization

### 1. Image Optimization

#### Use Modern Formats
```typescript
// ✅ Use WebP with fallback
<picture>
  <source srcSet="/image.webp" type="image/webp" />
  <source srcSet="/image.jpg" type="image/jpeg" />
  <img src="/image.jpg" alt="Description" loading="lazy" />
</picture>
```

#### Lazy Loading Images
```typescript
// ✅ Native lazy loading
<img
  src="/large-image.jpg"
  alt="Description"
  loading="lazy"
  decoding="async"
  width={800}
  height={600}
/>
```

#### Responsive Images
```typescript
// ✅ Serve different sizes based on viewport
<img
  srcSet="
    /image-320w.jpg 320w,
    /image-640w.jpg 640w,
    /image-960w.jpg 960w
  "
  sizes="(max-width: 320px) 280px,
         (max-width: 640px) 580px,
         960px"
  src="/image-640w.jpg"
  alt="Description"
/>
```

### 2. Font Optimization

#### Preload Critical Fonts
```html
<!-- public/index.html -->
<link rel="preload" href="/fonts/main-font.woff2" as="font" type="font/woff2" crossorigin>
```

#### Use font-display
```css
/* src/index.css */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom-font.woff2') format('woff2');
  font-display: swap; /* Show fallback font immediately */
}
```

### 3. Icon Optimization

#### Tree-shakeable Icon Imports
```typescript
// ✅ Import only used icons
import { faUser, faHome, faSearch } from '@fortawesome/free-solid-svg-icons';

// ❌ Don't import entire icon library
import * as Icons from '@fortawesome/free-solid-svg-icons';
```

---

## Network Optimization

### 1. API Request Optimization

#### Request Caching
```typescript
// src/services/apiClient.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchWithCache(url: string) {
  const cached = cache.get(url);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data; // Return cached data
  }

  const response = await apiClient.get(url);
  cache.set(url, { data: response.data, timestamp: Date.now() });

  return response.data;
}
```

#### Request Deduplication
```typescript
// src/services/requestManager.ts
const inFlightRequests = new Map<string, Promise<any>>();

export async function deduplicatedRequest(key: string, requestFn: () => Promise<any>) {
  // If request is already in-flight, return the same promise
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  // Create new request
  const promise = requestFn().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}

// Usage
const data = await deduplicatedRequest(
  'companies-page-1',
  () => fetchCompanies(1)
);
```

#### Parallel Requests
```typescript
// ✅ Fetch data in parallel
async function loadDashboard() {
  const [users, stats, notifications] = await Promise.all([
    fetchUsers(),
    fetchStats(),
    fetchNotifications()
  ]);

  return { users, stats, notifications };
}
```

### 2. Preloading & Prefetching

#### Preload Critical Resources
```html
<!-- public/index.html -->
<link rel="preload" href="/api/critical-data" as="fetch" crossorigin>
```

#### Prefetch Next Page
```typescript
// src/components/Link.tsx
import { Link } from 'react-router-dom';

function PrefetchLink({ to, children }) {
  const prefetch = () => {
    // Prefetch data for next page
    const route = routes[to];
    if (route?.prefetch) {
      route.prefetch();
    }
  };

  return (
    <Link to={to} onMouseEnter={prefetch}>
      {children}
    </Link>
  );
}
```

---

## Monitoring & Metrics

### 1. Web Vitals Tracking

Install web-vitals:
```bash
npm install web-vitals
```

Create reporting utility:
```typescript
// src/utils/reportWebVitals.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  console.log(metric);

  // Send to your analytics service
  if (window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.value),
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
    });
  }
}

export function reportWebVitals() {
  onCLS(sendToAnalytics);  // Cumulative Layout Shift
  onFID(sendToAnalytics);  // First Input Delay
  onFCP(sendToAnalytics);  // First Contentful Paint
  onLCP(sendToAnalytics);  // Largest Contentful Paint
  onTTFB(sendToAnalytics); // Time to First Byte
}

// src/main.tsx
import { reportWebVitals } from './utils/reportWebVitals';

reportWebVitals();
```

### 2. Performance Monitoring

```typescript
// src/utils/performanceMonitor.ts
export function measurePerformance(name: string, fn: () => void) {
  const start = performance.now();
  fn();
  const end = performance.now();

  console.log(`${name} took ${(end - start).toFixed(2)}ms`);

  // Send to analytics
  if (end - start > 1000) {
    console.warn(`Slow operation detected: ${name}`);
  }
}

// Usage
measurePerformance('Data Processing', () => {
  processLargeDataset(data);
});
```

### 3. Bundle Analysis

Analyze bundle size:
```bash
# Install bundle analyzer
npm install --save-dev rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ]
});

# Build and analyze
npm run build
# Opens stats.html with bundle visualization
```

---

## Performance Checklist

### Development Phase
- [ ] Implement lazy loading for routes
- [ ] Use React.memo for expensive components
- [ ] Use useMemo for expensive calculations
- [ ] Implement virtualization for large lists (react-window)
- [ ] Debounce search inputs and filters
- [ ] Optimize icon imports (tree-shaking)
- [ ] Use native lazy loading for images
- [ ] Implement request caching
- [ ] Add request deduplication
- [ ] Use parallel requests where possible

### Build Phase
- [ ] Code splitting configured (✅ Done)
- [ ] CSS minification enabled (✅ Done)
- [ ] Asset hashing for cache-busting (✅ Done)
- [ ] Source maps disabled for production (✅ Done)
- [ ] Modern browser target (esnext) (✅ Done)
- [ ] Dependency optimization configured (✅ Done)
- [ ] Tree shaking enabled (✅ Done)

### Deployment Phase
- [ ] Vercel CDN caching configured (✅ Done)
- [ ] Long-term asset caching (1 year) (✅ Done)
- [ ] Compression enabled (Brotli/Gzip)
- [ ] Security headers configured (✅ Done)
- [ ] SSL/HTTPS enabled
- [ ] DNS configured correctly

### Monitoring Phase
- [ ] Web Vitals tracking installed
- [ ] Performance monitoring setup
- [ ] Error tracking (Sentry) installed
- [ ] Analytics enabled (Vercel Analytics)
- [ ] Lighthouse CI configured

---

## Performance Targets

### Core Web Vitals (Target)

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Lighthouse Scores (Target)

- **Performance**: > 90
- **Accessibility**: > 90
- **Best Practices**: > 90
- **SEO**: > 90

### Bundle Size Targets

- **Initial JS**: < 200 KB (gzipped)
- **Total CSS**: < 50 KB (gzipped)
- **Vendor chunks**: < 150 KB (gzipped)
- **Route chunks**: < 50 KB each (gzipped)

---

## Testing Performance

### 1. Lighthouse Audit

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://your-app.vercel.app \
  --output html \
  --output-path ./lighthouse-report.html \
  --chrome-flags="--headless"

# Open report
open lighthouse-report.html
```

### 2. WebPageTest

Test from multiple locations:
- Go to [webpagetest.org](https://www.webpagetest.org/)
- Enter your Vercel URL
- Test from different locations
- Analyze waterfall chart

### 3. Chrome DevTools

#### Performance Profiling
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Interact with your app
5. Stop recording
6. Analyze flame chart

#### Network Analysis
1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Check:
   - Request count
   - Total size
   - Load time
   - Waterfall

#### Coverage Analysis
1. Open DevTools (F12)
2. Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows)
3. Type "Show Coverage"
4. Click Record
5. Interact with app
6. See unused code percentage

---

## Common Performance Issues & Solutions

### Issue 1: Large Initial Bundle

**Problem:** First load is slow
**Solution:**
- Implement lazy loading for routes
- Split large dependencies into separate chunks
- Remove unused dependencies

### Issue 2: Slow API Responses

**Problem:** API calls take too long
**Solution:**
- Implement request caching
- Use request deduplication
- Add loading states
- Use optimistic UI updates

### Issue 3: Slow Renders

**Problem:** UI feels sluggish
**Solution:**
- Use React.memo for expensive components
- Use useMemo for calculations
- Implement virtualization for lists
- Debounce expensive operations

### Issue 4: Layout Shifts

**Problem:** High CLS score
**Solution:**
- Set width/height on images
- Reserve space for dynamic content
- Use CSS aspect-ratio
- Avoid inserting content above fold

### Issue 5: Large Images

**Problem:** Images slow down page load
**Solution:**
- Use modern formats (WebP, AVIF)
- Implement lazy loading
- Use responsive images (srcset)
- Compress images (TinyPNG, ImageOptim)

---

## Advanced Optimizations

### 1. Service Worker for Caching

```typescript
// public/sw.js
const CACHE_NAME = 'enviromaster-v1';
const urlsToCache = [
  '/',
  '/assets/js/main.js',
  '/assets/css/main.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

### 2. Intersection Observer for Lazy Loading

```typescript
// src/hooks/useIntersectionObserver.ts
import { useEffect, useRef, useState } from 'react';

export function useIntersectionObserver(options = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [options]);

  return { ref, isIntersecting };
}

// Usage
function LazyComponent() {
  const { ref, isIntersecting } = useIntersectionObserver();

  return (
    <div ref={ref}>
      {isIntersecting ? <ExpensiveComponent /> : <Placeholder />}
    </div>
  );
}
```

---

## Resources

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Vite Performance](https://vitejs.dev/guide/performance.html)
- [Vercel Analytics](https://vercel.com/docs/analytics)

---

**Performance optimization is an ongoing process. Continuously monitor, measure, and improve!**
