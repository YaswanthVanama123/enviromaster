// Backend Products Transformer with Frequency Support
// This file should be integrated into your backend API server

/**
 * Enhanced product transformer that includes frequency field support
 */

export interface ProductItem {
  displayName: string;
  qty: number;
  frequency?: string;  // NEW: daily, weekly, bi-weekly, monthly, yearly
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

/**
 * Transform products data for LaTeX PDF generation
 */
export function transformProductsForPDF(products: ProductsPayload): any {
  const { smallProducts, dispensers, bigProducts } = products;

  // Transform small products to LaTeX table rows
  const smallProductRows = smallProducts.map(product => {
    return [
      escapeLatex(product.displayName || ''),
      String(product.qty || 0),
      formatCurrency(product.unitPrice || 0),
      escapeLatex(product.frequency || ''), // NEW: Frequency column
      formatCurrency(product.total || 0)
    ];
  });

  // Transform dispensers to LaTeX table rows
  const dispenserRows = dispensers.map(dispenser => {
    return [
      escapeLatex(dispenser.displayName || ''),
      String(dispenser.qty || 0),
      formatCurrency(dispenser.warrantyRate || 0),
      formatCurrency(dispenser.replacementRate || 0),
      escapeLatex(dispenser.frequency || ''), // NEW: Frequency column
      formatCurrency(dispenser.total || 0)
    ];
  });

  // Transform big products to LaTeX table rows
  const bigProductRows = bigProducts.map(product => {
    return [
      escapeLatex(product.displayName || ''),
      String(product.qty || 0),
      formatCurrency(product.amount || 0),
      escapeLatex(product.frequency || ''), // NEW: Frequency column
      formatCurrency(product.total || 0)
    ];
  });

  return {
    smallProducts: smallProductRows,
    dispensers: dispenserRows,
    bigProducts: bigProductRows,
    // For legacy compatibility, also provide as rows array
    rows: generateLegacyRowsArray(smallProductRows, dispenserRows, bigProductRows)
  };
}

/**
 * Generate legacy rows array format (for backward compatibility)
 * Each row contains all columns: [small1, small2, small3, small4, small5, disp1, disp2, disp3, disp4, disp5, disp6, big1, big2, big3, big4, big5]
 */
function generateLegacyRowsArray(
  smallRows: string[][],
  dispenserRows: string[][],
  bigRows: string[][]
): string[][] {
  const maxRows = Math.max(smallRows.length, dispenserRows.length, bigRows.length);
  const legacyRows: string[][] = [];

  for (let i = 0; i < maxRows; i++) {
    const row: string[] = [];

    // Small products (5 columns): name, unitPrice, frequency, qty, total
    const smallRow = smallRows[i] || ['', '', '', '', ''];
    row.push(...smallRow);

    // Dispensers (6 columns): name, qty, warrantyRate, replacementRate, frequency, total
    const dispenserRow = dispenserRows[i] || ['', '', '', '', '', ''];
    row.push(...dispenserRow);

    // Big products (5 columns): name, qty, amount, frequency, total
    const bigRow = bigRows[i] || ['', '', '', '', ''];
    row.push(...bigRow);

    legacyRows.push(row);
  }

  return legacyRows;
}

/**
 * Validate frequency field values
 */
export function validateFrequency(frequency?: string): boolean {
  const validFrequencies = ['', 'daily', 'weekly', 'bi-weekly', 'monthly', 'yearly'];
  return !frequency || validFrequencies.includes(frequency.toLowerCase());
}

/**
 * Format frequency for display (capitalize first letter)
 */
export function formatFrequencyForDisplay(frequency?: string): string {
  if (!frequency) return '';
  return frequency.charAt(0).toUpperCase() + frequency.slice(1).toLowerCase();
}

/**
 * Escape LaTeX special characters
 */
function escapeLatex(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[{}]/g, '\\$&')
    .replace(/[$%&_#^]/g, '\\$&')
    .replace(/~/g, '\\textasciitilde{}');
}

/**
 * Format currency values
 */
function formatCurrency(amount: number | string): string {
  const num = parseFloat(String(amount || 0));
  return `\\$${num.toFixed(2)}`;
}

/**
 * Extract products from various input formats (for form loading)
 */
export function extractProductsFromBackend(backendData: any): {
  smallProducts?: ProductItem[];
  dispensers?: ProductItem[];
  bigProducts?: ProductItem[];
} {
  // Handle new format
  if (backendData.smallProducts || backendData.dispensers || backendData.bigProducts) {
    return {
      smallProducts: backendData.smallProducts || [],
      dispensers: backendData.dispensers || [],
      bigProducts: backendData.bigProducts || []
    };
  }

  // Handle legacy rows format
  if (backendData.rows && Array.isArray(backendData.rows)) {
    const smallProducts: ProductItem[] = [];
    const dispensers: ProductItem[] = [];
    const bigProducts: ProductItem[] = [];

    backendData.rows.forEach((row: string[]) => {
      // Small products (columns 0-4): name, unitPrice, frequency, qty, total
      if (row[0] && row[0].trim() !== '') {
        smallProducts.push({
          displayName: row[0],
          unitPrice: parseFloat(row[1]) || 0,
          frequency: row[2] || '',
          qty: parseInt(row[3]) || 0,
          total: parseFloat(row[4]) || 0
        });
      }

      // Dispensers (columns 5-10): name, qty, warrantyRate, replacementRate, frequency, total
      if (row[5] && row[5].trim() !== '') {
        dispensers.push({
          displayName: row[5],
          qty: parseInt(row[6]) || 0,
          warrantyRate: parseFloat(row[7]) || 0,
          replacementRate: parseFloat(row[8]) || 0,
          frequency: row[9] || '',
          total: parseFloat(row[10]) || 0
        });
      }

      // Big products (columns 11-15): name, qty, amount, frequency, total
      if (row[11] && row[11].trim() !== '') {
        bigProducts.push({
          displayName: row[11],
          qty: parseInt(row[12]) || 0,
          amount: parseFloat(row[13]) || 0,
          frequency: row[14] || '',
          total: parseFloat(row[15]) || 0
        });
      }
    });

    return {
      smallProducts: smallProducts.length > 0 ? smallProducts : undefined,
      dispensers: dispensers.length > 0 ? dispensers : undefined,
      bigProducts: bigProducts.length > 0 ? bigProducts : undefined
    };
  }

  return {
    smallProducts: undefined,
    dispensers: undefined,
    bigProducts: undefined
  };
}

/**
 * Migrate existing documents to include frequency field
 */
export function migrateProductsAddFrequency(products: any): ProductsPayload {
  const addFrequencyField = (items: any[]): ProductItem[] => {
    return items.map(item => ({
      ...item,
      frequency: item.frequency || '' // Add empty frequency if not present
    }));
  };

  return {
    smallProducts: addFrequencyField(products.smallProducts || []),
    dispensers: addFrequencyField(products.dispensers || []),
    bigProducts: addFrequencyField(products.bigProducts || [])
  };
}

/**
 * Example usage for backend API:
 */

/*
// In your backend API route
app.post('/api/pdf/customer-header', async (req, res) => {
  try {
    const { payload } = req.body;

    // Validate frequency fields
    const products = payload.products;
    for (const category of ['smallProducts', 'dispensers', 'bigProducts']) {
      if (products[category]) {
        for (const item of products[category]) {
          if (!validateFrequency(item.frequency)) {
            return res.status(400).json({
              error: `Invalid frequency value: ${item.frequency}`
            });
          }
        }
      }
    }

    // Transform for PDF generation
    const transformedProducts = transformProductsForPDF(products);

    // Generate PDF (pass transformedProducts to your LaTeX generator)
    const pdfBuffer = await generatePDF({
      ...payload,
      products: transformedProducts
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
*/