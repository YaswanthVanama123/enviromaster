import CustomerSection from "./CustomerSection";
import ProductsSection from "./ProductsSection";
import ServicesSection from "./ServicesSection";
import './FormFilling.css'

export default function FormFilling() {
  return (
    <div className="center-align">
      <CustomerSection />
      <ProductsSection />
      <ServicesSection />
    </div>
  );
}
