

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


export const logServiceFieldChange = (config: ServiceFieldChangeConfig): void => {
  const { serviceKey, serviceName, fieldName, oldValue, newValue, quantity = 1, frequency = 'weekly' } = config;


  if (oldValue === newValue) return;


  if (oldValue === undefined || newValue === undefined) return;

  let numericOld: number;
  let numericNew: number;


  if (typeof oldValue === 'number' && typeof newValue === 'number') {

    numericOld = oldValue;
    numericNew = newValue;
  } else if (typeof oldValue === 'boolean' && typeof newValue === 'boolean') {

    numericOld = oldValue ? 1 : 0;
    numericNew = newValue ? 1 : 0;
  } else if (typeof oldValue === 'string' && typeof newValue === 'string') {

    numericOld = oldValue.length;
    numericNew = newValue.length;
  } else {

    numericOld = String(oldValue).length;
    numericNew = String(newValue).length;
  }


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


export const SERVICE_FORM_FIELDS = {

  quantities: ['quantity', 'qty', 'units', 'count', 'number', 'pods', 'bathrooms', 'rooms', 'fixtures', 'gallons'],


  locations: ['location', 'area', 'sqft', 'squareFeet', 'size'],


  timing: ['frequency', 'schedule', 'visits', 'contractMonths', 'term'],


  pricing: ['pricingMode', 'rateTier', 'tier', 'rateCategory'],


  toggles: ['add', 'include', 'enable', 'disable', 'need', 'require'],


  saniclean: ['sinks', 'urinals', 'maleToilets', 'femaleToilets', 'microfiberBathrooms', 'warrantyDispensers'],
  sanipod: ['podQuantity', 'extraBags', 'installationQuantity'],
  carpet: ['rooms', 'squareFootage', 'dirtLevel'],
  janitorial: ['hours', 'days', 'frequency'],


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
