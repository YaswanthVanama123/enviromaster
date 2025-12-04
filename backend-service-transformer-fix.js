// Update your backend service transformer to handle text fields
// Add this to your backend service transformation logic

function transformServiceToRows(serviceData) {
  const rows = [];

  // Process all properties of the service data
  Object.entries(serviceData).forEach(([key, value]) => {
    // Skip non-field properties
    if (['serviceId', 'displayName', 'isActive', 'totals', 'notes', 'customFields'].includes(key)) {
      return;
    }

    if (value && typeof value === 'object' && value.type) {
      switch (value.type) {
        case 'text':
          rows.push({
            type: 'line',
            label: value.label,
            value: value.value
          });
          break;

        case 'calc':
          rows.push({
            type: 'atCharge',
            label: value.label,
            v1: String(value.qty),
            v2: `$${Number(value.rate).toFixed(2)}`,
            v3: `$${Number(value.total).toFixed(2)}`
          });
          break;

        case 'dollar':
          const label = value.months ?
            `${value.label} (${value.months}mo)` :
            value.label;
          rows.push({
            type: 'bold',
            label: label,
            value: `$${Number(value.amount).toFixed(2)}`
          });
          break;
      }
    }
  });

  return rows;
}

// Usage in your backend controller:
const janitorialData = payload.services.janitorial;
if (janitorialData && janitorialData.isActive) {
  const rows = transformServiceToRows(janitorialData);

  bottomRow.push({
    heading: "JANITORIAL",
    rows: rows
  });
}