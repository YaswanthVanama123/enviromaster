# RPM Windows Special Frequency Pricing Rules

## Overview
RPM Windows now implements special per-window pricing rules for certain frequencies, where some frequencies share the same per-window rates.

## Special Pricing Rules

### **2×/Month and Bi-Monthly Frequencies**
- **Use Monthly per-window pricing**
- When user selects "2×/Month" or "Bi-Monthly" frequency
- The per-window rates (Small, Medium, Large) will use the **Monthly** frequency multiplier
- This ensures consistent pricing between these related frequencies

### **Bi-Annual and Annual Frequencies**
- **Use Quarterly per-window pricing**
- When user selects "Bi-Annual" or "Annual" frequency
- The per-window rates (Small, Medium, Large) will use the **Quarterly** frequency multiplier
- This provides consistent pricing for longer-term service frequencies

## Implementation Details

### **Files Updated:**
- `src/components/services/rpmWindows/useRpmWindowsCalc.ts`

### **Logic Changes:**
1. **Frequency Multiplier Selection** (useEffect line ~258)
2. **Calculation Logic** (useMemo line ~425)
3. **Manual Rate Editing** (onChange line ~347)

All three locations now apply the same mapping logic:
- `twicePerMonth` → uses `monthly` multiplier
- `bimonthly` → uses `monthly` multiplier
- `biannual` → uses `quarterly` multiplier
- `annual` → uses `quarterly` multiplier

### **Backend Integration:**
- Frequency multipliers still pulled from backend configuration
- The special rules determine which backend multiplier to use
- Maintains consistency across all pricing calculations

## Example Scenarios

**Scenario 1: User selects "2×/Month"**
- System uses `monthly` frequency multiplier from backend
- Per-window rates calculated as: `baseWeeklyRate × monthlyMultiplier`

**Scenario 2: User selects "Bi-Annual"**
- System uses `quarterly` frequency multiplier from backend
- Per-window rates calculated as: `baseWeeklyRate × quarterlyMultiplier`

**Scenario 3: User selects "Weekly"**
- System uses `weekly` frequency multiplier from backend (no change)
- Per-window rates calculated as: `baseWeeklyRate × weeklyMultiplier`

## Benefits
- **Consistent Pricing**: Related frequencies use the same per-window rates
- **Simplified Management**: Fewer unique price points to maintain
- **Backend Driven**: All multipliers still come from backend configuration
- **Transparent**: Users see the effective per-window rate in the UI

The system maintains all existing functionality while providing more logical pricing relationships between frequencies.