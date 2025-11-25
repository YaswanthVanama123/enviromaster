# Backend Service Architecture

This directory contains the complete backend service layer for the Enviromaster frontend application.

## 📁 Folder Structure

```
backendservice/
├── api/                      # API service layer
│   ├── adminAuthApi.ts       # Admin authentication
│   ├── serviceConfigApi.ts   # Service configuration CRUD
│   ├── productCatalogApi.ts  # Product catalog CRUD
│   └── index.ts
├── types/                    # TypeScript type definitions
│   ├── serviceConfig.types.ts
│   ├── productCatalog.types.ts
│   ├── api.types.ts
│   └── index.ts
├── hooks/                    # React hooks for API calls
│   ├── useAdminAuth.ts
│   ├── useServiceConfigs.ts
│   ├── useProductCatalog.ts
│   └── index.ts
├── utils/                    # Utility functions
│   ├── apiClient.ts          # Base API client
│   ├── storage.ts            # LocalStorage helper
│   └── index.ts
└── index.ts                  # Main entry point
```

## 🏗️ Architecture Overview

### 1. **API Client Layer** (`utils/apiClient.ts`)
- Centralized HTTP client using fetch API
- Automatic token management
- Error handling
- Type-safe responses

**Features:**
- GET, POST, PUT, DELETE methods
- Automatic Authorization header injection
- JSON request/response handling
- Error normalization

### 2. **API Services** (`api/`)
Each API service encapsulates endpoints for a specific resource:

#### `adminAuthApi.ts`
- `login()` - Admin login with credentials
- `getProfile()` - Get current admin profile
- `changePassword()` - Change admin password
- `createAdmin()` - Create new admin user
- `logout()` - Clear authentication
- `isAuthenticated()` - Check login status

#### `serviceConfigApi.ts`
- `create()` - Create new service config
- `getAll()` - Get all configs (with optional filtering)
- `getActive()` - Get active configs
- `getById()` - Get config by ID
- `getLatest()` - Get latest config for a service
- `replace()` - Full replace
- `update()` - Partial update

#### `productCatalogApi.ts`
- `create()` - Create new product catalog
- `getActive()` - Get active catalog
- `getAll()` - Get all catalogs
- `getById()` - Get catalog by ID
- `update()` - Update catalog
- `replace()` - Full replace

### 3. **React Hooks** (`hooks/`)
Custom hooks provide stateful API integration:

#### `useAdminAuth()`
```typescript
const { user, isAuthenticated, login, logout, loading, error } = useAdminAuth();
```

#### `useServiceConfigs(serviceId?)`
```typescript
const { configs, loading, error, fetchConfigs, createConfig, updateConfig } =
  useServiceConfigs();
```

#### `useActiveServiceConfig(serviceId?)`
```typescript
const { config, loading, error, refetch } = useActiveServiceConfig("saniclean");
```

#### `useProductCatalog()`
```typescript
const { catalogs, loading, error, fetchCatalogs, createCatalog, updateCatalog } =
  useProductCatalog();
```

#### `useActiveProductCatalog()`
```typescript
const { catalog, loading, error, refetch } = useActiveProductCatalog();
```

### 4. **TypeScript Types** (`types/`)
Complete type definitions for:
- Service configurations
- Product catalogs
- API requests/responses
- Authentication

## 🎨 Admin UI Components

Located in `src/components/admin/`:

### 1. **AdminLogin** - Authentication
- Login form with username/password
- Error handling
- Automatic token storage

### 2. **AdminDashboard** - Main Dashboard
- Tab-based navigation
- User info display
- Logout functionality

### 3. **PricingTables** - View Pricing Data
- Service configs viewer
- Product catalog viewer
- Detailed panel for configurations
- Responsive grid layout

### 4. **ServiceConfigManager** - Manage Services
- Grid view of all service configs
- Edit modal for metadata
- Status indicators (active/inactive)
- Version and tag management

### 5. **ProductCatalogManager** - Manage Products
- Product family navigation
- Product search functionality
- Detailed product information
- Pricing and warranty display

## 🚀 Usage Examples

### Using API Services Directly

```typescript
import { serviceConfigApi } from "@/backendservice/api";

// Get all service configs
const response = await serviceConfigApi.getAll();
if (response.data) {
  console.log(response.data);
}

// Get active config for saniclean
const activeResponse = await serviceConfigApi.getActive("saniclean");
```

### Using React Hooks in Components

```typescript
import { useServiceConfigs } from "@/backendservice/hooks";

function MyComponent() {
  const { configs, loading, error, updateConfig } = useServiceConfigs();

  const handleUpdate = async (id: string) => {
    const result = await updateConfig(id, { isActive: true });
    if (result.success) {
      console.log("Updated successfully!");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {configs.map(config => (
        <div key={config._id}>{config.label}</div>
      ))}
    </div>
  );
}
```

### Authentication Flow

```typescript
import { useAdminAuth } from "@/backendservice/hooks";

function LoginPage() {
  const { login, loading, error } = useAdminAuth();

  const handleLogin = async () => {
    const result = await login({
      username: "envimaster",
      password: "9999999999"
    });

    if (result.success) {
      // Redirect to dashboard
      window.location.href = "/admin";
    }
  };

  return <button onClick={handleLogin}>Login</button>;
}
```

## 🔐 Environment Variables

Add to your `.env` file:

```bash
VITE_API_BASE_URL=http://localhost:5000
```

## 📊 Features

### ✅ Complete CRUD Operations
- Create, Read, Update service configurations
- Manage product catalogs
- Admin authentication

### ✅ Type Safety
- Full TypeScript support
- Type-safe API responses
- IntelliSense support

### ✅ Error Handling
- Normalized error responses
- Loading states
- User-friendly error messages

### ✅ State Management
- React hooks for state
- Automatic refetching
- Optimistic updates

### ✅ Responsive UI
- Mobile-friendly design
- Grid layouts
- Modal dialogs
- Table views

### ✅ Search & Filter
- Product search
- Service filtering by serviceId
- Active/inactive filtering

## 🎯 API Endpoints Reference

### Admin Auth
- `POST /api/admin/login` - Login
- `GET /api/admin/me` - Get profile
- `PUT /api/admin/change-password` - Change password
- `POST /api/admin/create` - Create admin

### Service Configs
- `POST /api/service-configs` - Create
- `GET /api/service-configs` - Get all
- `GET /api/service-configs/active` - Get active
- `GET /api/service-configs/:id` - Get by ID
- `PUT /api/service-configs/:id` - Replace
- `PUT /api/service-configs/:id/partial` - Update

### Product Catalog
- `POST /api/product-catalog` - Create
- `GET /api/product-catalog/active` - Get active
- `GET /api/product-catalog` - Get all
- `GET /api/product-catalog/:id` - Get by ID
- `PUT /api/product-catalog/:id` - Update

## 🔄 Data Flow

```
Component → Hook → API Service → API Client → Backend
    ↓         ↓         ↓            ↓
  State   Loading   Format      HTTP
          Error    Response    Request
```

## 🛠️ Best Practices

1. **Always use hooks in components** instead of calling API services directly
2. **Handle loading and error states** in your UI
3. **Use TypeScript types** for all API data
4. **Centralize API configuration** in apiClient.ts
5. **Keep components presentational** - business logic in hooks

## 📝 Notes

- All API calls are asynchronous
- Authentication token is stored in localStorage
- Token is automatically included in requests
- Error responses are normalized
- All dates are in ISO format
- Currency is USD by default

## 🎨 Styling

All components use inline styles for:
- **Portability** - No external CSS dependencies
- **Simplicity** - Easy to understand
- **Flexibility** - Easy to customize
- **Responsive** - Mobile-friendly layouts

## 🚧 Future Enhancements

- [ ] Add bulk operations
- [ ] Add import/export functionality
- [ ] Add version history
- [ ] Add audit logs
- [ ] Add advanced filtering
- [ ] Add sorting options
- [ ] Add pagination
- [ ] Add real-time updates
- [ ] Add optimistic UI updates
- [ ] Add undo/redo functionality
