# Text Change Tracking in Log Files - Usage Guide

## Overview
The log file system now supports tracking **text changes** in addition to numeric price changes. This allows you to track changes to agreement terms, service descriptions, special conditions, and any other text fields in the service agreement.

## What's New

### Text Changes vs Numeric Changes
- **Numeric Changes**: Price overrides (e.g., $100 → $90)
- **Text Changes**: Agreement text modifications (e.g., "Net 30" → "Net 15")

Both types of changes are tracked in the same log file with separate formatting.

---

## How to Track Text Changes

### 1. Import the Helper Function

```typescript
import { addTextChange } from '../utils/fileLogger';
```

### 2. Track Text Changes

When a user modifies any text field in the agreement, call `addTextChange`:

```typescript
// Example: User changes payment terms
addTextChange({
  productKey: 'agreement_paymentTerms',
  productName: 'Service Agreement',
  productType: 'agreement_text',
  fieldType: 'paymentTerms',
  fieldDisplayName: 'Payment Terms',
  originalText: 'Net 30 days',
  newText: 'Net 15 days'
});
```

### 3. Common Use Cases

#### Example 1: Agreement Terms Change
```typescript
addTextChange({
  productKey: 'agreement_terms',
  productName: 'Service Agreement',
  productType: 'agreement_text',
  fieldType: 'agreementTerms',
  fieldDisplayName: 'Agreement Terms',
  originalText: 'Monthly service with 30-day notice for cancellation',
  newText: 'Monthly service with 60-day notice for cancellation'
});
```

#### Example 2: Service Description Change
```typescript
addTextChange({
  productKey: 'service_description',
  productName: 'Carpet Cleaning',
  productType: 'agreement_text',
  fieldType: 'serviceDescription',
  fieldDisplayName: 'Service Description',
  originalText: 'Standard carpet cleaning using hot water extraction',
  newText: 'Deep carpet cleaning using advanced hot water extraction with stain protection'
});
```

#### Example 3: Special Conditions
```typescript
addTextChange({
  productKey: 'agreement_specialConditions',
  productName: 'Service Agreement',
  productType: 'agreement_text',
  fieldType: 'specialConditions',
  fieldDisplayName: 'Special Conditions',
  originalText: '',
  newText: 'Customer must provide access to all areas 24 hours before scheduled service'
});
```

#### Example 4: Cancellation Policy
```typescript
addTextChange({
  productKey: 'agreement_cancellationPolicy',
  productName: 'Service Agreement',
  productType: 'agreement_text',
  fieldType: 'cancellationPolicy',
  fieldDisplayName: 'Cancellation Policy',
  originalText: 'Cancel anytime with 30 days notice',
  newText: 'Cancel anytime with 60 days notice. Early cancellation fee: $500'
});
```

---

## Log File Output Format

### Numeric Change (Price)
```
1. Carpet Cleaning - Custom First Unit Rate
   Type: SERVICE
   Quantity: 1
   Frequency: monthly

   • Custom First Unit Rate:
     Original: $300.00
     New: $30.00
     Change: $-270.00 (-90.0%) ⚠️  SIGNIFICANT
```

### Text Change (Agreement)
```
2. Service Agreement
   Type: AGREEMENT_TEXT

   • Payment Terms:
     Original Text:
     "Net 30 days"

     Changed To:
     "Net 15 days"

     [TEXT CHANGE]
```

---

## Available Field Types

You can use these pre-defined field types for agreement text changes:

| Field Type | Display Name | Example Usage |
|-----------|--------------|---------------|
| `agreementTerms` | Agreement Terms | General agreement terms and conditions |
| `serviceDescription` | Service Description | Description of services provided |
| `specialConditions` | Special Conditions | Custom conditions for this agreement |
| `paymentTerms` | Payment Terms | Payment schedule and terms |
| `cancellationPolicy` | Cancellation Policy | Cancellation and refund policy |
| `warrantyInfo` | Warranty Information | Warranty coverage details |
| `customNotes` | Custom Notes | Additional notes and comments |
| `legalDisclaimer` | Legal Disclaimer | Legal disclaimers and liability |
| `contractClause` | Contract Clause | Specific contract clauses |
| `serviceScope` | Service Scope | Scope of services covered |

---

## Integration Points

### Where to Add Text Change Tracking

1. **FormFilling Component**: When user edits agreement text fields
2. **ServicesSection Component**: When service descriptions are modified
3. **Agreement Editor**: When terms, conditions, or policies are changed
4. **Custom Notes/Comments**: When custom text fields are updated

### Example Integration in React Component

```typescript
import React, { useState } from 'react';
import { addTextChange } from '../utils/fileLogger';

const AgreementTermsEditor = () => {
  const [terms, setTerms] = useState('Net 30 days');
  const [originalTerms] = useState('Net 30 days');

  const handleSave = () => {
    if (terms !== originalTerms) {
      // Track the text change
      addTextChange({
        productKey: 'agreement_paymentTerms',
        productName: 'Service Agreement',
        productType: 'agreement_text',
        fieldType: 'paymentTerms',
        fieldDisplayName: 'Payment Terms',
        originalText: originalTerms,
        newText: terms
      });
    }

    // Continue with save logic...
  };

  return (
    <div>
      <textarea
        value={terms}
        onChange={(e) => setTerms(e.target.value)}
      />
      <button onClick={handleSave}>Save Changes</button>
    </div>
  );
};
```

---

## Complete Example: Mixed Changes

When a user makes both price changes and text changes in the same session, the log file will show both:

```typescript
// Price change
addPriceChange({
  productKey: 'carpetCleaning_001',
  productName: 'Carpet Cleaning',
  productType: 'service',
  fieldType: 'customFirstUnitRate',
  fieldDisplayName: 'Custom First Unit Rate',
  originalValue: 300,
  newValue: 250,
  quantity: 1,
  frequency: 'monthly'
});

// Text change
addTextChange({
  productKey: 'agreement_paymentTerms',
  productName: 'Service Agreement',
  productType: 'agreement_text',
  fieldType: 'paymentTerms',
  fieldDisplayName: 'Payment Terms',
  originalText: 'Net 30 days',
  newText: 'Net 15 days'
});
```

### Log File Output:
```
================================================================================
                    VERSION CHANGE LOG
================================================================================

CUSTOMER/AGREEMENT: ABC Company
--------------------------------------------------------------------------------

Version Number: v2
Total Changes Made: 2

--------------------------------------------------------------------------------
                    CURRENT CHANGES (This Version)
--------------------------------------------------------------------------------

1. Carpet Cleaning
   Type: SERVICE
   Quantity: 1
   Frequency: monthly

   • Custom First Unit Rate:
     Original: $300.00
     New: $250.00
     Change: $-50.00 (-16.7%) ⚠️  SIGNIFICANT

2. Service Agreement
   Type: AGREEMENT_TEXT

   • Payment Terms:
     Original Text:
     "Net 30 days"

     Changed To:
     "Net 15 days"

     [TEXT CHANGE]

================================================================================
```

---

## Benefits

1. **Complete Change History**: Track both numeric and text modifications
2. **Audit Trail**: Full transparency on what was changed and when
3. **Compliance**: Meet regulatory requirements for contract change tracking
4. **Customer Transparency**: Clear documentation of agreement modifications
5. **Dispute Resolution**: Easy reference for what was agreed upon

---

## Notes

- Text changes do NOT affect price impact calculations
- Text changes are cumulative across versions (just like price changes)
- Empty text is displayed as `(empty)` in log files
- Text changes are tracked per field (duplicate field types will be overwritten)
- All text changes are preserved in `allPreviousChanges` for historical tracking
