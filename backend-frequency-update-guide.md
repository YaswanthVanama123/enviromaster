# Backend Frequency Field Update Guide

## Overview
This document outlines the necessary backend changes to support the new `frequency` field for products in the PDF generation system.

## 1. Database Schema Updates

### MongoDB Collection: `customer-headers`
Add frequency field to the products data structure in your backend database:

```javascript
// Example document structure update
{
  "payload": {
    "products": {
      "smallProducts": [
        {
          "displayName": "Product Name",
          "qty": 10,
          "unitPrice": 25.50,
          "frequency": "weekly",  // NEW FIELD
          "total": 255.00
        }
      ],
      "dispensers": [
        {
          "displayName": "Dispenser Name",
          "qty": 2,
          "warrantyRate": 15.00,
          "replacementRate": 50.00,
          "frequency": "monthly",  // NEW FIELD
          "total": 130.00
        }
      ],
      "bigProducts": [
        {
          "displayName": "Big Product Name",
          "qty": 5,
          "amount": 100.00,
          "frequency": "bi-weekly",  // NEW FIELD
          "total": 500.00
        }
      ]
    }
  }
}
```

## 2. Backend API Type Definitions

Update your backend TypeScript interfaces:

```typescript
// backend/types/products.types.ts
export interface ProductItem {
  displayName: string;
  qty: number;
  frequency?: string;  // NEW FIELD: daily, weekly, bi-weekly, monthly, yearly
  total: number;
  // Product-specific fields
  unitPrice?: number;      // For small products
  warrantyRate?: number;   // For dispensers
  replacementRate?: number;// For dispensers
  amount?: number;         // For big products
}

export interface ProductsPayload {
  smallProducts: ProductItem[];
  dispensers: ProductItem[];
  bigProducts: ProductItem[];
}

// Update your main payload interface
export interface FormPayload {
  headerTitle: string;
  headerRows: HeaderRow[];
  products: ProductsPayload;  // Updated with proper typing
  services: ServicesPayload;
  agreement: AgreementPayload;
}
```

## 3. LaTeX Template Updates

### Current Table Structure (Before):
```latex
% Small Products Table
\begin{longtable}{|l|r|r|r|}
\hline
\textbf{Products} & \textbf{Qty} & \textbf{Unit Price} & \textbf{Total} \\
\hline
%%SMALL_PRODUCTS_ROWS%%
\end{longtable}

% Dispensers Table
\begin{longtable}{|l|r|r|r|r|}
\hline
\textbf{Dispensers} & \textbf{Qty} & \textbf{Warranty Rate} & \textbf{Replacement Rate} & \textbf{Total} \\
\hline
%%DISPENSERS_ROWS%%
\end{longtable}

% Big Products Table
\begin{longtable}{|l|r|r|r|}
\hline
\textbf{Products} & \textbf{Qty} & \textbf{Amount} & \textbf{Total} \\
\hline
%%BIG_PRODUCTS_ROWS%%
\end{longtable}
```

### New Table Structure (With Frequency):
```latex
% Small Products Table
\begin{longtable}{|l|r|r|l|r|}
\hline
\textbf{Products} & \textbf{Qty} & \textbf{Unit Price} & \textbf{Frequency} & \textbf{Total} \\
\hline
%%SMALL_PRODUCTS_ROWS%%
\end{longtable}

% Dispensers Table
\begin{longtable}{|l|r|r|r|l|r|}
\hline
\textbf{Dispensers} & \textbf{Qty} & \textbf{Warranty Rate} & \textbf{Replacement Rate} & \textbf{Frequency} & \textbf{Total} \\
\hline
%%DISPENSERS_ROWS%%
\end{longtable}

% Big Products Table
\begin{longtable}{|l|r|r|l|r|}
\hline
\textbf{Products} & \textbf{Qty} & \textbf{Amount} & \textbf{Frequency} & \textbf{Total} \\
\hline
%%BIG_PRODUCTS_ROWS%%
\end{longtable}
```

## 4. Backend Row Generation Logic

Update your backend row generation functions:

```javascript
// backend/services/pdfGenerator.js

function generateSmallProductRows(smallProducts) {
  return smallProducts.map(product => {
    const name = escapeLatex(product.displayName || '');
    const qty = product.qty || 0;
    const unitPrice = formatCurrency(product.unitPrice || 0);
    const frequency = escapeLatex(product.frequency || ''); // NEW FIELD
    const total = formatCurrency(product.total || 0);

    return `${name} & ${qty} & ${unitPrice} & ${frequency} & ${total} \\\\\\hline`;
  }).join('\n');
}

function generateDispenserRows(dispensers) {
  return dispensers.map(dispenser => {
    const name = escapeLatex(dispenser.displayName || '');
    const qty = dispenser.qty || 0;
    const warrantyRate = formatCurrency(dispenser.warrantyRate || 0);
    const replacementRate = formatCurrency(dispenser.replacementRate || 0);
    const frequency = escapeLatex(dispenser.frequency || ''); // NEW FIELD
    const total = formatCurrency(dispenser.total || 0);

    return `${name} & ${qty} & ${warrantyRate} & ${replacementRate} & ${frequency} & ${total} \\\\\\hline`;
  }).join('\n');
}

function generateBigProductRows(bigProducts) {
  return bigProducts.map(product => {
    const name = escapeLatex(product.displayName || '');
    const qty = product.qty || 0;
    const amount = formatCurrency(product.amount || 0);
    const frequency = escapeLatex(product.frequency || ''); // NEW FIELD
    const total = formatCurrency(product.total || 0);

    return `${name} & ${qty} & ${amount} & ${frequency} & ${total} \\\\\\hline`;
  }).join('\n');
}

// Helper function to escape LaTeX special characters
function escapeLatex(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[{}]/g, '\\$&')
    .replace(/[$%&_#^]/g, '\\$&');
}

// Helper function to format currency
function formatCurrency(amount) {
  return `\\$${parseFloat(amount || 0).toFixed(2)}`;
}
```

## 5. Backend Validation

Add validation for the frequency field:

```javascript
// backend/validators/productValidator.js
const Joi = require('joi');

const frequencyOptions = ['', 'daily', 'weekly', 'bi-weekly', 'monthly', 'yearly'];

const productItemSchema = Joi.object({
  displayName: Joi.string().required(),
  qty: Joi.number().min(0).required(),
  frequency: Joi.string().valid(...frequencyOptions).optional().allow(''), // NEW VALIDATION
  total: Joi.number().min(0).required(),
  // Product-specific fields
  unitPrice: Joi.number().min(0).optional(),      // Small products
  warrantyRate: Joi.number().min(0).optional(),   // Dispensers
  replacementRate: Joi.number().min(0).optional(), // Dispensers
  amount: Joi.number().min(0).optional()          // Big products
});

const productsPayloadSchema = Joi.object({
  smallProducts: Joi.array().items(productItemSchema).required(),
  dispensers: Joi.array().items(productItemSchema).required(),
  bigProducts: Joi.array().items(productItemSchema).required()
});

module.exports = { productsPayloadSchema };
```

## 6. Migration Script

Create a migration script for existing documents:

```javascript
// backend/migrations/add-frequency-field.js
const { MongoClient } = require('mongodb');

async function addFrequencyField() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('enviromaster');
    const collection = db.collection('customer-headers');

    // Add empty frequency field to all existing products
    const result = await collection.updateMany(
      {},
      {
        $set: {
          'payload.products.smallProducts.$[].frequency': '',
          'payload.products.dispensers.$[].frequency': '',
          'payload.products.bigProducts.$[].frequency': ''
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} documents with frequency field`);
  } finally {
    await client.close();
  }
}

// Run migration
addFrequencyField().catch(console.error);
```

## 7. Backend API Route Updates

Update your API routes to handle the new field:

```javascript
// backend/routes/pdf.js
app.post('/api/pdf/customer-header', async (req, res) => {
  try {
    const { payload } = req.body;

    // Validate payload includes frequency fields
    const { error } = productsPayloadSchema.validate(payload.products);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Generate PDF with frequency column included
    const pdfBuffer = await generatePDF(payload);

    // Save to database with frequency field
    const document = await saveCustomerHeader(payload);

    res.json({
      documentId: document._id,
      success: true
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});
```

## 8. Testing

### Test Data Example:
```json
{
  "headerTitle": "Test Document",
  "headerRows": [],
  "products": {
    "smallProducts": [
      {
        "displayName": "Test Small Product",
        "qty": 5,
        "unitPrice": 10.00,
        "frequency": "weekly",
        "total": 50.00
      }
    ],
    "dispensers": [
      {
        "displayName": "Test Dispenser",
        "qty": 2,
        "warrantyRate": 5.00,
        "replacementRate": 25.00,
        "frequency": "monthly",
        "total": 60.00
      }
    ],
    "bigProducts": [
      {
        "displayName": "Test Big Product",
        "qty": 1,
        "amount": 100.00,
        "frequency": "bi-weekly",
        "total": 100.00
      }
    ]
  },
  "services": {},
  "agreement": {}
}
```

## 9. Deployment Checklist

- [ ] Update database schema/migrations
- [ ] Update backend type definitions
- [ ] Update LaTeX templates with frequency column
- [ ] Update row generation logic
- [ ] Add validation for frequency field
- [ ] Update API documentation
- [ ] Run migration script on existing data
- [ ] Test PDF generation with frequency data
- [ ] Update any API tests
- [ ] Deploy backend changes

## 10. Frontend Integration

The frontend has been updated with:
- ✅ Frequency dropdown component (daily, weekly, bi-weekly, monthly, yearly)
- ✅ Data structure updates to include frequency field
- ✅ Form submission includes frequency in payload
- ✅ Edit mode properly loads frequency values
- ✅ Export function includes frequency data

## Notes

- The frequency field is optional and defaults to empty string
- The LaTeX templates now include the frequency column in all product tables
- Existing documents without frequency data will show empty frequency cells
- The frequency dropdown provides standardized options for consistency