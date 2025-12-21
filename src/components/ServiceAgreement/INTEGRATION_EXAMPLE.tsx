// INTEGRATION EXAMPLE
// How to add the Service Agreement to your main form

import React, { useState } from 'react';
import { ServiceAgreement, ServiceAgreementData } from './components/ServiceAgreement';

// Example: Adding to your existing form component
function YourMainFormComponent() {
  const [agreementData, setAgreementData] = useState<ServiceAgreementData | null>(null);

  const handleAgreementChange = (data: ServiceAgreementData) => {
    setAgreementData(data);
    console.log('Agreement data updated:', data);
  };

  const handleSubmit = () => {
    if (!agreementData) {
      alert('Please complete the service agreement');
      return;
    }

    // Check if required fields are filled
    if (!agreementData.customerContactName || !agreementData.customerSignature) {
      alert('Please complete customer signature section');
      return;
    }

    if (!agreementData.retainDispensers && !agreementData.disposeDispensers) {
      alert('Please select a dispenser option');
      return;
    }

    // Your form submission logic here
    const formData = {
      // ... your other form data
      serviceAgreement: agreementData,
    };

    console.log('Submitting form with agreement:', formData);
    // Submit to your backend...
  };

  return (
    <div>
      {/* Your existing services form components */}

      {/* Add the Service Agreement component */}
      <ServiceAgreement onAgreementChange={handleAgreementChange} />

      {/* Your submit button */}
      <button onClick={handleSubmit} className="submit-btn">
        Submit Form
      </button>
    </div>
  );
}

// Example: If you're using ServicesContext
// You can add the agreement data to your context:

// In ServicesContext.tsx, add to your context state:
interface ServicesContextState {
  // ... existing state
  serviceAgreement?: ServiceAgreementData | null;
  updateServiceAgreement: (data: ServiceAgreementData) => void;
}

// Then in your provider:
const [serviceAgreement, setServiceAgreement] = useState<ServiceAgreementData | null>(null);

const updateServiceAgreement = (data: ServiceAgreementData) => {
  setServiceAgreement(data);
};

// Provide it in context value:
const contextValue = {
  // ... existing values
  serviceAgreement,
  updateServiceAgreement,
};

// Usage in your form:
function FormWithContext() {
  const { updateServiceAgreement } = useServicesContext();

  return (
    <ServiceAgreement onAgreementChange={updateServiceAgreement} />
  );
}
