// src/pages/AdminPricesPage.tsx
import { PricingProvider } from "../../pricing/pricingStore";
import AdminPricingTable from "../admin/AdminPricingTable";

export default function AdminPricesPage() {
  return (
    <PricingProvider>
      <AdminPricingTable />
    </PricingProvider>
  );
}
