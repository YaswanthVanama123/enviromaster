# Quick Setup Guide

## 🚀 Getting Started

### 1. Add Environment Variable

Create or update `.env` file in the root of `enviromaster/`:

```bash
VITE_API_BASE_URL=http://localhost:5000
```

### 2. Use the Admin Dashboard

Add to your main app router (e.g., `App.tsx` or routing file):

```typescript
import { AdminDashboard } from "./components/admin";

// In your routes
<Route path="/admin" element={<AdminDashboard />} />
```

Or use it directly:

```typescript
import { AdminDashboard } from "./components/admin";

function App() {
  return <AdminDashboard />;
}
```

### 3. Login Credentials

Default admin credentials (from backend):
- **Username:** `envimaster`
- **Password:** `9999999999`

## 📋 Available Components

### Import All Components

```typescript
import {
  AdminDashboard,    // Complete admin dashboard with all features
  AdminLogin,        // Standalone login component
  PricingTables,     // View pricing tables
  ServiceConfigManager,  // Manage service configs
  ProductCatalogManager, // Manage product catalog
} from "./components/admin";
```

### Use Standalone Components

```typescript
// Just the pricing tables
import { PricingTables } from "./components/admin";
<PricingTables />

// Just the service config manager
import { ServiceConfigManager } from "./components/admin";
<ServiceConfigManager />

// Just the product catalog manager
import { ProductCatalogManager } from "./components/admin";
<ProductCatalogManager />
```

## 🔧 Using Backend Services

### Import Services

```typescript
import {
  // APIs
  adminAuthApi,
  serviceConfigApi,
  productCatalogApi,

  // Hooks
  useAdminAuth,
  useServiceConfigs,
  useActiveServiceConfig,
  useProductCatalog,
  useActiveProductCatalog,

  // Utils
  apiClient,
  storage,
} from "./backendservice";
```

### Example: Fetch Active Service Config

```typescript
import { useActiveServiceConfig } from "./backendservice";

function MyComponent() {
  const { config, loading, error } = useActiveServiceConfig("saniclean");

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!config) return <div>No config found</div>;

  return (
    <div>
      <h2>{config.label}</h2>
      <pre>{JSON.stringify(config.config, null, 2)}</pre>
    </div>
  );
}
```

### Example: Fetch Active Product Catalog

```typescript
import { useActiveProductCatalog } from "./backendservice";

function ProductList() {
  const { catalog, loading, error } = useActiveProductCatalog();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!catalog) return <div>No catalog found</div>;

  return (
    <div>
      <h2>Products - Version {catalog.version}</h2>
      {catalog.families.map(family => (
        <div key={family.key}>
          <h3>{family.label}</h3>
          {family.products.map(product => (
            <div key={product.key}>
              {product.name} - ${product.basePrice?.amount}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

## 🎯 Features Overview

### ✅ Admin Dashboard
- **Tab Navigation:** Pricing Tables, Service Configs, Product Catalog
- **User Management:** Display logged-in user, logout functionality
- **Responsive Design:** Works on desktop and mobile

### ✅ Pricing Tables
- **Service Configs:** View all service configurations
- **Product Catalog:** Browse product families and products
- **Detail Panels:** Click to see full configuration details
- **Active Indicators:** See which configs are active

### ✅ Service Config Manager
- **Grid View:** All services in card layout
- **Edit Modal:** Update service metadata
- **Status Toggle:** Activate/deactivate services
- **Version Management:** Track config versions

### ✅ Product Catalog Manager
- **Family Navigation:** Browse by product family
- **Search:** Filter products by name or family
- **Product Details:** View full product information
- **Pricing Display:** See base prices, warranties, and quantities

## 🔐 Authentication Flow

1. User visits `/admin` route
2. If not authenticated → Shows login screen
3. User enters credentials
4. Token is stored in localStorage
5. Dashboard is displayed
6. Token is automatically included in all API requests

## 📱 Responsive Design

All components are responsive and work on:
- ✅ Desktop (1920px+)
- ✅ Laptop (1366px - 1920px)
- ✅ Tablet (768px - 1366px)
- ✅ Mobile (320px - 768px)

## 🎨 Customization

### Change Colors

Edit inline styles in component files:

```typescript
// Primary color (blue)
backgroundColor: "#2563eb"

// Success color (green)
backgroundColor: "#10b981"

// Error color (red)
backgroundColor: "#dc2626"
```

### Add Custom Tabs

Edit `AdminDashboard.tsx`:

```typescript
type TabType = "pricing" | "services" | "products" | "myCustomTab";

// Add button
<button onClick={() => setActiveTab("myCustomTab")}>
  My Custom Tab
</button>

// Add content
{activeTab === "myCustomTab" && <MyCustomComponent />}
```

## 🚨 Troubleshooting

### Issue: API calls failing
**Solution:** Check that backend is running on `http://localhost:5000`

### Issue: "No active catalog found"
**Solution:** Use the seed script or Postman to insert data

### Issue: Login not working
**Solution:** Verify credentials and check backend `/api/admin/login` endpoint

### Issue: Token expired
**Solution:** Logout and login again

## 📦 File Structure Summary

```
enviromaster/src/
├── backendservice/              # Backend integration layer
│   ├── api/                     # API services
│   ├── hooks/                   # React hooks
│   ├── types/                   # TypeScript types
│   ├── utils/                   # Utilities
│   └── README.md                # Detailed documentation
├── components/
│   └── admin/                   # Admin UI components
│       ├── AdminDashboard.tsx   # Main dashboard
│       ├── AdminLogin.tsx       # Login component
│       ├── PricingTables.tsx    # Pricing viewer
│       ├── ServiceConfigManager.tsx
│       ├── ProductCatalogManager.tsx
│       └── index.ts
└── .env                         # Environment variables
```

## 🎓 Next Steps

1. **Start the backend** - Make sure `enviro-bckend` is running
2. **Seed the database** - Use seed script or Postman JSON files
3. **Add admin route** - Add `/admin` route to your app
4. **Login** - Use default credentials
5. **Explore** - Navigate through tabs and explore features

## 📚 Additional Resources

- See `backendservice/README.md` for detailed API documentation
- See `enviro-bckend/scripts/README.md` for Postman usage
- Check backend endpoints in `backend.json`

## ⚡ Performance Tips

- Service configs and product catalogs are cached in component state
- Use `refetch()` to manually refresh data
- Loading states prevent duplicate requests
- LocalStorage persists authentication across sessions

## 🎉 You're All Set!

The complete backend integration and admin UI is ready to use. Navigate to `/admin` in your app and start managing your pricing data!
