# Professional Pricing Tables - Admin Panel

## Overview

The admin panel now displays **professional pricing tables** for both services and products when you click "Pricing Tables" in the navbar.

## Features

### 📊 Service Pricing Table
- **View all services** in a professional table layout
- **See pricing details** at a glance:
  - Rate per Fixture
  - Weekly Minimum
  - All-Inclusive Rate
- **Inline editing** - Click "Edit Pricing" to modify values
- **Live updates** - Changes save directly to database via PUT API
- **Status indicators** - Active/Inactive badges for each service

### 📦 Product Pricing Table
- **View all products** organized by product families
- **See product details**:
  - Product Name
  - Product Key
  - Base Price & UOM
  - Warranty Price & Billing Period
- **Inline editing** - Click "Edit Price" to modify product prices
- **Live updates** - Changes save to database via PUT API
- **Family organization** - Products grouped by family for easy navigation

## How to Use

### 1. Access Pricing Tables
1. Login to admin panel at `/admin`
2. Click **"Pricing Tables"** in the navbar
3. You'll see two tabs:
   - **Service Pricing** (11 services)
   - **Product Pricing** (75+ products)

### 2. Edit Service Pricing

**Step-by-step:**
1. Click **"📊 Service Pricing"** tab
2. Find the service you want to edit in the table
3. Click **"Edit Pricing"** button
4. The row will highlight in yellow
5. Edit the pricing fields:
   - Rate/Fixture ($)
   - Weekly Minimum ($)
   - All-Inclusive Rate ($)
6. Click **"Save Changes"** or **"Cancel"**
7. Success message appears when saved

**Example:**
```
Service: SaniClean - Restroom & Hygiene
Before: Rate/Fixture: $7
After: Rate/Fixture: $9 (you changed it)
✅ Service pricing updated successfully!
```

### 3. Edit Product Pricing

**Step-by-step:**
1. Click **"📦 Product Pricing"** tab
2. Browse product families (Restroom, Sanitation, etc.)
3. Find the product you want to edit
4. Click **"Edit Price"** button
5. The row will highlight in yellow
6. Edit the prices directly in the input fields:
   - Base Price ($)
   - Warranty Price ($)
7. Click **"Save"** or **"Cancel"**
8. Success message appears when saved

**Example:**
```
Product: Urinal Fixture Seat Cover
Before: Base Price: $175.00
After: Base Price: $200.00 (you changed it)
✅ Product pricing updated successfully!
```

## User Interface

### Service Pricing Table Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│  Service Pricing Configuration                                         │
│  11 services available • Edit pricing directly                         │
├────────────────────────────────────────────────────────────────────────┤
│ Service Name          │ ID        │ Ver  │ Status │ Pricing │ Actions │
├────────────────────────────────────────────────────────────────────────┤
│ SaniClean            │ saniclean │ v1.0 │ Active │ $7/fix  │ [Edit]  │
│ Restroom & Hygiene   │           │      │        │ $40 min │         │
├────────────────────────────────────────────────────────────────────────┤
│ SaniPod              │ sanipod   │ v1.0 │ Active │ $12/fix │ [Edit]  │
│ Feminine Hygiene     │           │      │        │ $48 min │         │
└────────────────────────────────────────────────────────────────────────┘
```

### Product Pricing Table Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│  Product Catalog Pricing                                               │
│  Version: v1.0 • Currency: USD • Edit pricing directly                 │
├────────────────────────────────────────────────────────────────────────┤
│  Restroom Fixtures & Supplies (15 products)                           │
├────────────────────────────────────────────────────────────────────────┤
│ Product Name         │ Key      │ Price │ UOM  │ Warranty │ Actions  │
├────────────────────────────────────────────────────────────────────────┤
│ Urinal Fixture Seat  │ urinal_  │ $175  │ unit │ $0.60/mo │ [Edit]   │
│ Cover                │ seat     │       │      │          │          │
├────────────────────────────────────────────────────────────────────────┤
│ Toilet Seat Cover    │ toilet_  │ $150  │ unit │ $0.50/mo │ [Edit]   │
│ Dispenser            │ seat     │       │      │          │          │
└────────────────────────────────────────────────────────────────────────┘
```

## API Integration

### Backend APIs Used

**Service Config APIs:**
- `GET /api/service-configs` - Fetch all service configurations
- `PUT /api/service-configs/:id` - Update service configuration

**Product Catalog APIs:**
- `GET /api/product-catalogs/active` - Fetch active product catalog
- `PUT /api/product-catalogs/:id` - Update product catalog

### Data Flow

1. **On Load:**
   - Component calls `useServiceConfigs()` hook
   - Hook calls `GET /api/service-configs` API
   - Service data populates in table

2. **On Edit:**
   - User clicks "Edit Pricing"
   - Row enters edit mode with input fields
   - User modifies values

3. **On Save:**
   - Component calls `updateConfig(id, payload)` from hook
   - Hook calls `PUT /api/service-configs/:id` API
   - Server updates database
   - Component refetches data
   - Table updates with new values
   - Success message displays

## Technical Details

### Component Architecture

```
PricingTablesView.tsx
├── useServiceConfigs() hook          (GET, PUT service configs)
├── useActiveProductCatalog() hook    (GET, PUT product catalog)
├── Service Pricing Table
│   ├── Table with all services
│   ├── Inline editing functionality
│   └── Save/Cancel actions
└── Product Pricing Table
    ├── Product families sections
    ├── Tables for each family
    ├── Inline editing functionality
    └── Save/Cancel actions
```

### State Management

**Service Editing:**
```typescript
interface EditingService {
  id: string;        // Service config ID
  config: any;       // Updated configuration object
}
```

**Product Editing:**
```typescript
interface EditingProduct {
  familyKey: string;     // Product family key
  productKey: string;    // Product key
  basePrice?: number;    // Updated base price
  warrantyPrice?: number; // Updated warranty price
}
```

### Styling

- **Professional design** with clean tables
- **Responsive layout** - works on all screen sizes
- **Color-coded states:**
  - Yellow highlight for editing row
  - Green success messages
  - Blue "Active" badges
  - Red "Inactive" badges
- **Hover effects** on buttons and rows
- **Clear typography** for easy reading

## Success Indicators

✅ **Service pricing updated successfully!** - Appears when service pricing is saved
✅ **Product pricing updated successfully!** - Appears when product pricing is saved

Success messages auto-dismiss after 3 seconds.

## Benefits

### For Admins:
- **Quick overview** of all pricing at a glance
- **Easy editing** with inline forms
- **Professional interface** for managing pricing
- **Real-time updates** to database
- **No page reloads** needed

### For Developers:
- **Clean code** with TypeScript
- **Reusable hooks** for API calls
- **Type-safe** data structures
- **Separation of concerns** (UI, logic, API)
- **Easy to maintain** and extend

## Files Modified

1. ✅ Created `src/components/admin/PricingTablesView.tsx` - Main pricing tables component
2. ✅ Updated `src/components/admin/AdminDashboard.tsx` - Uses PricingTablesView
3. ✅ Updated `src/components/admin/index.ts` - Exports PricingTablesView
4. ✅ Updated `src/backendservice/hooks/useProductCatalog.ts` - Added updateCatalog to useActiveProductCatalog

## Usage Example

```typescript
// In your app
import { AdminDashboard } from "./components/admin";

function App() {
  return <AdminDashboard />;
}

// Admin navigates to /admin
// Clicks "Pricing Tables"
// Sees professional tables with all services and products
// Clicks "Edit Pricing" on any service
// Modifies values
// Clicks "Save Changes"
// ✅ Success! Database updated
```

## What's Different from Before?

### Before:
- AdminPricingManager showed individual service forms
- Had to click "View Pricing Form" to see one service at a time
- Showed full calculator UI with all inputs

### Now:
- PricingTablesView shows ALL services and products in tables
- Can see all pricing at once in a professional table
- Quick inline editing for pricing values
- Better for admin overview and bulk editing

## Next Steps

1. **Start backend**: `cd enviro-bckend && npm start`
2. **Start frontend**: `cd enviromaster && npm run dev`
3. **Login**: Navigate to `/admin` and login
4. **Click "Pricing Tables"** in navbar
5. **Start editing pricing!**

## Notes

- Only pricing fields are editable (not labels, keys, or other metadata)
- Changes are immediately saved to MongoDB
- Service calculators still work with updated pricing
- Original service forms are still available in AdminPricingManager component if needed

---

**Ready to use!** The professional pricing tables are now live in your admin panel. 🎉
