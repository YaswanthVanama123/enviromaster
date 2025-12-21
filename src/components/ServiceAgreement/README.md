# Service Agreement Component

A beautifully designed React/TypeScript component for displaying and collecting service agreement information.

## Features

✅ **Complete Terms & Conditions Display** - All 7 sections from the original document
✅ **Interactive Checkboxes** - Mutually exclusive dispenser options
✅ **Signature Fields** - Customer and EM Franchisee signature capture
✅ **Auto-Date Filling** - Click date fields to auto-populate with today's date
✅ **Sales Representative Fields** - Both EM Sales and Inside Sales Rep
✅ **Responsive Design** - Works on desktop, tablet, and mobile
✅ **Print-Friendly** - Optimized CSS for printing
✅ **Real-time Data Updates** - Callback function for form data integration
✅ **Professional UI** - Styled to match the original document with modern touches

## Installation

The component is already created in:
```
src/components/ServiceAgreement/
├── ServiceAgreement.tsx
├── ServiceAgreement.css
└── index.ts
```

## Usage

### Basic Usage

```tsx
import { ServiceAgreement } from './components/ServiceAgreement';

function App() {
  const handleAgreementChange = (data) => {
    console.log('Agreement data:', data);
  };

  return <ServiceAgreement onAgreementChange={handleAgreementChange} />;
}
```

### Data Structure

The component returns this data structure:

```typescript
interface ServiceAgreementData {
  retainDispensers: boolean;        // Checkbox for retaining dispensers
  disposeDispensers: boolean;       // Checkbox for disposing dispensers
  customerContactName: string;      // Customer name
  customerSignature: string;        // Customer signature
  customerSignatureDate: string;    // Customer signature date
  emFranchisee: string;            // EM Franchisee name
  emSignature: string;             // EM signature
  emSignatureDate: string;         // EM signature date
  insideSalesRepresentative: string;
  emSalesRepresentative: string;
}
```

## Integration Steps

### Step 1: Add to Your Main Form

```tsx
import { ServiceAgreement, ServiceAgreementData } from './components/ServiceAgreement';

function YourForm() {
  const [agreementData, setAgreementData] = useState<ServiceAgreementData | null>(null);

  return (
    <>
      {/* Your existing services */}

      {/* Add Service Agreement */}
      <ServiceAgreement onAgreementChange={setAgreementData} />

      {/* Submit button */}
      <button onClick={handleSubmit}>Submit</button>
    </>
  );
}
```

### Step 2: Add Validation

```tsx
const validateAgreement = (data: ServiceAgreementData): boolean => {
  // Check if customer has selected dispenser option
  if (!data.retainDispensers && !data.disposeDispensers) {
    alert('Please select a dispenser option');
    return false;
  }

  // Check if customer details are filled
  if (!data.customerContactName || !data.customerSignature) {
    alert('Please complete customer signature section');
    return false;
  }

  // Check if EM franchisee details are filled
  if (!data.emFranchisee || !data.emSignature) {
    alert('Please complete EM Franchisee signature section');
    return false;
  }

  return true;
};
```

### Step 3: Submit with Form Data

```tsx
const handleSubmit = async () => {
  if (!agreementData || !validateAgreement(agreementData)) {
    return;
  }

  const formData = {
    services: servicesData,
    agreement: agreementData,
    // ... other form data
  };

  // Submit to your backend
  await submitForm(formData);
};
```

## Styling Customization

The component uses CSS classes that can be easily customized:

```css
/* Main container */
.service-agreement-container { }

/* Header */
.agreement-header { }
.em-logo { }
.agreement-title { }

/* Terms sections */
.terms-section { }
.term-item { }

/* Checkboxes */
.dispenser-options { }
.checkbox-label { }

/* Signatures */
.signature-section { }
.signature-row { }
.signature-field { }
```

## Key Features Explained

### 1. Mutually Exclusive Checkboxes
When a user clicks "Retain Dispensers", the "Dispose Dispensers" is automatically unchecked and vice versa.

### 2. Auto-Date Fill
Click on any date field to automatically populate it with today's date in MM/DD/YYYY format.

### 3. Responsive Layout
- Desktop: Full width with side-by-side layouts
- Tablet: Adjusted spacing and font sizes
- Mobile: Stacked layouts for easy reading

### 4. Print Optimization
Use browser print (Ctrl+P / Cmd+P) to print the agreement with optimized styling.

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Accessibility

- ✅ Keyboard navigation supported
- ✅ Screen reader friendly
- ✅ High contrast mode compatible
- ✅ Focus indicators on all interactive elements

## Tips

1. **Testing**: Use the console logs to verify data is being captured correctly
2. **Styling**: Adjust colors in CSS by changing the `#d32f2f` (red) values
3. **Validation**: Add your own validation logic before form submission
4. **Storage**: Consider saving draft data to localStorage for user convenience

## Support

For issues or questions, check the INTEGRATION_EXAMPLE.tsx file for more detailed usage examples.
