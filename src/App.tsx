import CustomerSection from "./components/CustomerSection";
import ProductsSection from "./components/ProductsSection";
import ServicesSection from "./components/ServicesSection";
import './App.css'

export default function App() {
  return (
    <div className="center-align">
      <CustomerSection />
      <ProductsSection />
      <ServicesSection />
    </div>
  );
}
