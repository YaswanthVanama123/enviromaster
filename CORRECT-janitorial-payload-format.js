// CORRECTED: Janitorial service payload structure
// This is what your janitorial service should send (matching other services)

export interface CorrectJanitorialPayload {
  serviceId: "janitorial";
  displayName: "Pure Janitorial";
  isActive: boolean;

  // Text field for service type
  serviceType: {
    label: "Service Type";
    type: "text";
    value: string; // "Recurring Service" or "One-Time Service"
  };

  // CALC field for main service (this is the key!)
  service: {
    label: "Service";
    type: "calc";
    qty: number;     // e.g., 5.07 (hours)
    rate: number;    // e.g., 30 ($/hour)
    total: number;   // e.g., 152 (qty * rate)
    unit: "hours";
  };

  // TEXT field for vacuuming
  vacuuming: {
    label: "Vacuuming";
    type: "text";
    value: string;   // e.g., "4 hours"
  };

  // TEXT field for dusting
  dusting: {
    label: "Dusting";
    type: "text";
    value: string;   // e.g., "2 places"
  };

  // TOTALS section (dollar fields)
  totals: {
    perVisit: {
      label: "Per Visit Total";
      type: "dollar";
      amount: number;
    };
    contract: {
      label: "Contract Total";
      type: "dollar";
      months: number;
      amount: number;
    };
  };

  notes: string;
  customFields: Array<{
    id: string;
    label: string;
    type: "text" | "calc" | "dollar";
    value: any;
  }>;
}

// NO BACKEND TRANSFORMATION NEEDED!
// The system already knows how to handle calc/text/dollar field types!

/**
 * Example of the CORRECT payload (exactly like other services):
 */
export const correctPayloadExample: CorrectJanitorialPayload = {
  "serviceId": "janitorial",
  "displayName": "Pure Janitorial",
  "isActive": true,

  "serviceType": {
    "label": "Service Type",
    "type": "text",
    "value": "Recurring Service"
  },

  // THIS IS THE KEY DIFFERENCE - Use "calc" type like other services
  "service": {
    "label": "Service",
    "type": "calc",
    "qty": 5.07,      // Fixed decimal precision
    "rate": 30,
    "total": 152,
    "unit": "hours"
  },

  "vacuuming": {
    "label": "Vacuuming",
    "type": "text",
    "value": "4 hours"
  },

  "dusting": {
    "label": "Dusting",
    "type": "text",
    "value": "2 places"
  },

  "totals": {
    "perVisit": {
      "label": "Per Visit Total",
      "type": "dollar",
      "amount": 152
    },
    "contract": {
      "label": "Contract Total",
      "type": "dollar",
      "months": 2,
      "amount": 1316.32
    }
  },

  "notes": "",
  "customFields": []
};

/**
 * The system ALREADY knows how to process this format!
 * Look at /src/components/services/common/dataTransformers.ts
 * It handles "calc", "text", and "dollar" field types automatically!
 */