// Example: How to integrate Admin Dashboard into your existing app

// ============================================================================
// OPTION 1: Add as a route in your existing router
// ============================================================================

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminDashboard } from "./components/admin";
// ... your existing components

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Your existing routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />

        {/* NEW: Add admin route */}
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

// ============================================================================
// OPTION 2: Use hooks to fetch pricing data in existing components
// ============================================================================

import { useActiveServiceConfig, useActiveProductCatalog } from "./backendservice";

function MyExistingComponent() {
  // Fetch active service config for saniclean
  const { config: sanicleanConfig } = useActiveServiceConfig("saniclean");

  // Fetch active product catalog
  const { catalog: productCatalog } = useActiveProductCatalog();

  // Now you can use this data instead of hardcoded configs
  if (sanicleanConfig) {
    console.log("SaniClean rates:", sanicleanConfig.config.geographicPricing);
  }

  if (productCatalog) {
    console.log("Products:", productCatalog.families);
  }

  return <div>Your existing UI...</div>;
}

// ============================================================================
// OPTION 3: Replace hardcoded configs with API data
// ============================================================================

// BEFORE (hardcoded):
import { SANICLEAN_CONFIG } from "./components/services/saniclean/sanicleanConfig";

// AFTER (from API):
import { useActiveServiceConfig } from "./backendservice";

function SanicleanCalculator() {
  const { config, loading } = useActiveServiceConfig("saniclean");

  if (loading) return <div>Loading configuration...</div>;
  if (!config) return <div>No configuration found</div>;

  // Use config.config instead of SANICLEAN_CONFIG
  const pricing = config.config;

  return (
    <div>
      Rate per fixture: ${pricing.geographicPricing.insideBeltway.ratePerFixture}
    </div>
  );
}

// ============================================================================
// OPTION 4: Create a pricing provider for global access
// ============================================================================

import React, { createContext, useContext } from "react";
import { useActiveServiceConfig, useActiveProductCatalog } from "./backendservice";

const PricingContext = createContext(null);

export function PricingProvider({ children }) {
  const saniclean = useActiveServiceConfig("saniclean");
  const sanipod = useActiveServiceConfig("sanipod");
  const products = useActiveProductCatalog();

  return (
    <PricingContext.Provider value={{ saniclean, sanipod, products }}>
      {children}
    </PricingContext.Provider>
  );
}

export function usePricing() {
  return useContext(PricingContext);
}

// Then in your app:
<PricingProvider>
  <App />
</PricingProvider>

// And use anywhere:
function AnyComponent() {
  const { saniclean, products } = usePricing();
  // ...
}

// ============================================================================
// OPTION 5: Add admin link to your existing navigation
// ============================================================================

function Navigation() {
  const { isAuthenticated } = useAdminAuth();

  return (
    <nav>
      <a href="/">Home</a>
      <a href="/services">Services</a>
      <a href="/products">Products</a>

      {/* Show admin link if authenticated */}
      {isAuthenticated && <a href="/admin">Admin Dashboard</a>}
    </nav>
  );
}

// ============================================================================
// OPTION 6: Fetch data on app load and store in context
// ============================================================================

import React, { createContext, useEffect, useState } from "react";
import { serviceConfigApi, productCatalogApi } from "./backendservice";

const ConfigContext = createContext(null);

export function ConfigProvider({ children }) {
  const [configs, setConfigs] = useState({});
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfigs() {
      // Load all active configs at once
      const [saniclean, sanipod, products] = await Promise.all([
        serviceConfigApi.getActive("saniclean"),
        serviceConfigApi.getActive("sanipod"),
        productCatalogApi.getActive(),
      ]);

      setConfigs({
        saniclean: saniclean.data,
        sanipod: sanipod.data,
      });
      setCatalog(products.data);
      setLoading(false);
    }

    loadConfigs();
  }, []);

  if (loading) return <div>Loading pricing data...</div>;

  return (
    <ConfigContext.Provider value={{ configs, catalog }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}

// ============================================================================
// OPTION 7: Protected admin route
// ============================================================================

import { Navigate } from "react-router-dom";
import { useAdminAuth } from "./backendservice";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAdminAuth();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

// In your routes:
<Route
  path="/admin"
  element={
    <ProtectedRoute>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>

// ============================================================================
// QUICK EXAMPLE: Complete Integration
// ============================================================================

// App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminDashboard } from "./components/admin";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

// That's it! Navigate to /admin and login with:
// Username: envimaster
// Password: 9999999999
