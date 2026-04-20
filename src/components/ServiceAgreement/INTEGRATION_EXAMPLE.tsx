import React, { useState } from 'react';
import { ServiceAgreement, ServiceAgreementData } from './components/ServiceAgreement';

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

    if (!agreementData.customerContactName || !agreementData.customerSignature) {
      alert('Please complete customer signature section');
      return;
    }

    if (!agreementData.retainDispensers && !agreementData.disposeDispensers) {
      alert('Please select a dispenser option');
      return;
    }

    const formData = {
      serviceAgreement: agreementData,
    };

    console.log('Submitting form with agreement:', formData);
  };

  return (
    <div>
      <ServiceAgreement onAgreementChange={handleAgreementChange} />

      <button onClick={handleSubmit} className="submit-btn">
        Submit Form
      </button>
    </div>
  );
}

interface ServicesContextState {
  serviceAgreement?: ServiceAgreementData | null;
  updateServiceAgreement: (data: ServiceAgreementData) => void;
}

const [serviceAgreement, setServiceAgreement] = useState<ServiceAgreementData | null>(null);

const updateServiceAgreement = (data: ServiceAgreementData) => {
  setServiceAgreement(data);
};

const contextValue = {
  serviceAgreement,
  updateServiceAgreement,
};

function FormWithContext() {
  const { updateServiceAgreement } = useServicesContext();

  return (
    <ServiceAgreement onAgreementChange={updateServiceAgreement} />
  );
}
