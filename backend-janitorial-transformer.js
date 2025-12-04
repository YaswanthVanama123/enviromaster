// Backend payload transformer for janitorial service
// This should be added to your backend code

export interface JanitorialPayloadInput {
  serviceId: "janitorial";
  displayName: "Pure Janitorial";
  isActive: boolean;
  serviceType: {
    label: "Service Type";
    type: "text";
    value: string; // "Recurring Service" or "One-Time Service"
  };
  service: {
    label: "Service";
    type: "calc";
    qty: number;     // baseHours (e.g., 5.066666666666666)
    rate: number;    // hourly rate (e.g., 30)
    total: number;   // calculated total (e.g., 152)
    unit: "hours";
  };
  vacuuming: {
    label: "Vacuuming";
    type: "text";
    value: string;   // e.g., "4 hours"
  };
  dusting: {
    label: "Dusting";
    type: "text";
    value: string;   // e.g., "2 places"
  };
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
    type: "text" | "money" | "calc";
    value: string | { qty: number; rate: number; total: number };
  }>;
}

export interface BackendServicesPayload {
  topRow: Array<{
    heading: string;
    rows: Array<{
      type: "line" | "bold" | "atCharge";
      label: string;
      value?: string;
      v1?: string;
      v2?: string;
      v3?: string;
    }>;
  }>;
  bottomRow: Array<{
    heading: string;
    rows: Array<{
      type: "line" | "bold" | "atCharge";
      label: string;
      value?: string;
      v1?: string;
      v2?: string;
      v3?: string;
    }>;
  }>;
  refreshPowerScrub: {
    heading: string;
    columns: string[];
    freqLabels: string[];
  };
  notes: {
    heading: string;
    lines: number;
    textLines: string[];
  };
}

/**
 * Transform janitorial payload to the correct format for PDF generation
 */
export function transformJanitorialPayload(payload: JanitorialPayloadInput): BackendServicesPayload {
  console.log('Transforming janitorial payload:', payload);

  // Fix decimal precision issue
  const fixedQty = typeof payload.service.qty === 'number'
    ? payload.service.qty.toFixed(2)
    : payload.service.qty.toString();

  // Build the main service rows
  const serviceRows = [
    // Service Type as a line
    {
      type: "line" as const,
      label: payload.serviceType.label,
      value: payload.serviceType.value
    },
    // Main service as calculation (atCharge type)
    {
      type: "atCharge" as const,
      label: payload.service.label,
      v1: fixedQty,                                    // qty (hours)
      v2: payload.service.rate.toString(),            // rate ($/hour)
      v3: payload.service.total.toString()            // total ($)
    },
    // Vacuuming as text line
    {
      type: "line" as const,
      label: payload.vacuuming.label,
      value: payload.vacuuming.value
    },
    // Dusting as text line
    {
      type: "line" as const,
      label: payload.dusting.label,
      value: payload.dusting.value
    }
  ];

  // Add custom fields to the service rows
  payload.customFields?.forEach(field => {
    if (field.type === "text") {
      serviceRows.push({
        type: "line" as const,
        label: field.label,
        value: field.value as string
      });
    } else if (field.type === "money") {
      serviceRows.push({
        type: "bold" as const,
        label: field.label,
        value: `$${field.value}`
      });
    } else if (field.type === "calc") {
      const calcValue = field.value as { qty: number; rate: number; total: number };
      serviceRows.push({
        type: "atCharge" as const,
        label: field.label,
        v1: calcValue.qty.toString(),
        v2: calcValue.rate.toString(),
        v3: calcValue.total.toString()
      });
    }
  });

  // Create the transformed payload matching the expected structure
  const transformed: BackendServicesPayload = {
    topRow: [
      {
        heading: "JANITORIAL",
        rows: serviceRows
      }
    ],
    bottomRow: [], // Empty for janitorial service
    refreshPowerScrub: {
      heading: "REFRESH POWER SCRUB",
      columns: ["Dumpster $", "Patio $", "Walkway $", "FOH $", "BOH $", "Other $"],
      freqLabels: ["Freq", "Freq", "Freq", "Freq", "Freq", "Freq"]
    },
    notes: {
      heading: "SERVICE NOTES",
      lines: 2,
      textLines: [payload.notes || "", ""]
    }
  };

  console.log('Transformed janitorial payload:', JSON.stringify(transformed, null, 2));
  return transformed;
}

/**
 * Example usage in your backend route:
 */
export function handlePdfGeneration(req: any, res: any) {
  const payload = req.body;

  let servicesData: BackendServicesPayload;

  if (payload.serviceId === 'janitorial') {
    // Transform janitorial to correct format
    servicesData = transformJanitorialPayload(payload as JanitorialPayloadInput);
  } else {
    // Use payload as-is for other services that are already in correct format
    servicesData = payload;
  }

  // Now send the properly formatted servicesData to LaTeX server
  sendToLatexServer(servicesData);
}

/**
 * Test the transformation with your current payload:
 */
export function testTransformation() {
  const testPayload: JanitorialPayloadInput = {
    "serviceId": "janitorial",
    "displayName": "Pure Janitorial",
    "isActive": true,
    "serviceType": {
      "label": "Service Type",
      "type": "text",
      "value": "Recurring Service"
    },
    "service": {
      "label": "Service",
      "type": "calc",
      "qty": 5.066666666666666,  // Will be fixed to "5.07"
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

  return transformJanitorialPayload(testPayload);
}

// The transformed result will be:
/*
{
  "topRow": [
    {
      "heading": "JANITORIAL",
      "rows": [
        {
          "type": "line",
          "label": "Service Type",
          "value": "Recurring Service"
        },
        {
          "type": "atCharge",
          "label": "Service",
          "v1": "5.07",
          "v2": "30",
          "v3": "152"
        },
        {
          "type": "line",
          "label": "Vacuuming",
          "value": "4 hours"
        },
        {
          "type": "line",
          "label": "Dusting",
          "value": "2 places"
        }
      ]
    }
  ],
  "bottomRow": [],
  "refreshPowerScrub": {
    "heading": "REFRESH POWER SCRUB",
    "columns": ["Dumpster $", "Patio $", "Walkway $", "FOH $", "BOH $", "Other $"],
    "freqLabels": ["Freq", "Freq", "Freq", "Freq", "Freq", "Freq"]
  },
  "notes": {
    "heading": "SERVICE NOTES",
    "lines": 2,
    "textLines": ["", ""]
  }
}
*/