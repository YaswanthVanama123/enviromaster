// src/utils/serviceLogger.ts
// Universal service logging helper for consistent form field change tracking

import { addPriceChange, getFieldDisplayName } from './fileLogger';

interface ServiceFieldChangeConfig {
  serviceKey: string;
  serviceName: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  quantity?: number;
  frequency?: string;
}

/**
 * Universal service field change logger
 * Handles numeric, boolean, and string field changes with proper conversion
 */
export const logServiceFieldChange = (config: ServiceFieldChangeConfig): void => {
  const { serviceKey, serviceName, fieldName, oldValue, newValue, quantity = 1, frequency = 'weekly' } = config;

  // Skip logging if values are the same
  if (oldValue === newValue) return;

  // Skip if either value is undefined
  if (oldValue === undefined || newValue === undefined) return;

  let numericOld: number;
  let numericNew: number;

  // Convert values to numeric representation for logging system
  if (typeof oldValue === 'number' && typeof newValue === 'number') {
    // Direct numeric values
    numericOld = oldValue;
    numericNew = newValue;
  } else if (typeof oldValue === 'boolean' && typeof newValue === 'boolean') {
    // Boolean to numeric conversion
    numericOld = oldValue ? 1 : 0;
    numericNew = newValue ? 1 : 0;
  } else if (typeof oldValue === 'string' && typeof newValue === 'string') {
    // String to numeric conversion (use string length or predefined mapping)
    numericOld = oldValue.length;
    numericNew = newValue.length;
  } else {
    // Mixed types - convert to string length
    numericOld = String(oldValue).length;
    numericNew = String(newValue).length;
  }

  // Only log if there's actually a change in the numeric representation
  if (numericOld === numericNew && typeof oldValue !== 'number') return;

  addPriceChange({
    productKey: `${serviceKey}_${fieldName}`,
    productName: `${serviceName} - ${getFieldDisplayName(fieldName)}`,
    productType: 'service',
    fieldType: fieldName,
    fieldDisplayName: getFieldDisplayName(fieldName),
    originalValue: numericOld,
    newValue: numericNew,
    quantity,
    frequency
  });

  console.log(`📝 [${serviceKey.toUpperCase()}-FORM-LOGGER] Added change for ${fieldName}:`, {
    from: oldValue,
    to: newValue,
    numericFrom: numericOld,
    numericTo: numericNew,
    type: typeof oldValue
  });
};

/**
 * Log multiple field changes at once
 */
export const logServiceFieldChanges = (
  serviceKey: string,
  serviceName: string,
  updates: Record<string, any>,
  originalValues: Record<string, any>,
  formFieldNames: string[],
  quantity?: number,
  frequency?: string
): void => {
  Object.keys(updates).forEach(fieldName => {
    if (formFieldNames.includes(fieldName)) {
      logServiceFieldChange({
        serviceKey,
        serviceName,
        fieldName,
        oldValue: originalValues[fieldName],
        newValue: updates[fieldName],
        quantity,
        frequency
      });
    }
  });
};

/**
 * Standard form field names for different service types
 */
export const SERVICE_FORM_FIELDS = {
  // Common quantity fields
  quantities: ['quantity', 'qty', 'units', 'count', 'number', 'pods', 'bathrooms', 'rooms', 'fixtures', 'gallons'],

  // Location and area fields
  locations: ['location', 'area', 'sqft', 'squareFeet', 'size'],

  // Frequency and timing
  timing: ['frequency', 'schedule', 'visits', 'contractMonths', 'term'],

  // Pricing and tier selection
  pricing: ['pricingMode', 'rateTier', 'tier', 'rateCategory'],

  // Boolean toggles
  toggles: ['add', 'include', 'enable', 'disable', 'need', 'require'],

  // Service-specific quantities
  saniclean: ['sinks', 'urinals', 'maleToilets', 'femaleToilets', 'microfiberBathrooms', 'warrantyDispensers'],
  sanipod: ['podQuantity', 'extraBags', 'installationQuantity'],
  carpet: ['rooms', 'squareFootage', 'dirtLevel'],
  janitorial: ['hours', 'days', 'frequency'],

  // Get comprehensive list for a service
  getFormFields: (serviceType: string): string[] => {
    const common = [
      ...SERVICE_FORM_FIELDS.quantities,
      ...SERVICE_FORM_FIELDS.locations,
      ...SERVICE_FORM_FIELDS.timing,
      ...SERVICE_FORM_FIELDS.pricing
    ];

    const specific = SERVICE_FORM_FIELDS[serviceType as keyof typeof SERVICE_FORM_FIELDS] as string[] || [];

    return [...common, ...specific];
  }
};