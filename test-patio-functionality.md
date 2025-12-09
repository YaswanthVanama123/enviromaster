# Refresh Power Scrub Patio Add-on Testing Guide

This guide will help you test the patio add-on functionality and verify that the reverse mapping (edit mode) works correctly.

## Test Scenario 1: Create and Save Patio with Add-on

### Steps:
1. **Start the application**:
   ```bash
   cd /Users/yaswanthgandhi/Documents/test/enviromaster
   npm run dev
   ```

2. **Navigate to Agreement Builder**:
   - Go to the main application
   - Add a new agreement
   - Add the "Refresh Power Scrub" service

3. **Configure Patio Service**:
   - Enable the "PATIO" checkbox
   - Keep "Preset Package" selected as pricing type
   - **CHECK the "Add-on Service: +$500" checkbox**
   - Select a frequency (e.g., "Monthly")
   - Set contract months (e.g., 12 months)

4. **Verify Calculations**:
   - Base patio service: $800
   - With add-on checked: Total should be $1300
   - Monthly and contract totals should reflect this

5. **Save the Agreement**:
   - Fill in customer details
   - Click "Generate PDF"
   - Note the patio total in the generated agreement

### Expected Debug Output:
In the browser console, you should see:
```
🔄 [Patio SAVE DEBUG] Patio area state: {...}
🔄 [Patio SAVE DEBUG] Saving includePatioAddon: {value: true, type: "boolean"}
🔄 [SAVE CONTEXT DEBUG] Final services context data: {...}
```

## Test Scenario 2: Edit Mode (Reverse Mapping)

### Steps:
1. **From the saved agreement**:
   - Click the "Edit" button on the agreement you just created
   - This should load the agreement back into the form builder

2. **Verify Patio State**:
   - Navigate to the Refresh Power Scrub service
   - Check that the PATIO checkbox is enabled
   - **VERIFY: The "Add-on Service: +$500" checkbox should be CHECKED**
   - Verify the total shows $1300 (base $800 + add-on $500)

### Expected Debug Output:
In the browser console, you should see:
```
🔄 [Patio DEBUG] Raw areaData: {...}
🔄 [Patio] Final mapped state - includePatioAddon: true, patioMode: standalone
```

## Test Scenario 3: Without Add-on

### Steps:
1. **Create another agreement**:
   - Add Refresh Power Scrub service
   - Enable PATIO checkbox
   - **UNCHECK the "Add-on Service: +$500" checkbox**
   - Generate PDF

2. **Edit this agreement**:
   - The add-on checkbox should remain UNCHECKED
   - Total should be $800 (base only)

### Expected Debug Output:
```
🔄 [Patio SAVE DEBUG] Saving includePatioAddon: {value: false, type: "boolean"}
🔄 [Patio] Final mapped state - includePatioAddon: false, patioMode: standalone
```

## Debugging Data Structure

The saved data structure should look like this when patio add-on is enabled:

```json
{
  "services": {
    "patio": {
      "enabled": true,
      "pricingMethod": {
        "value": "Preset Package",
        "type": "text"
      },
      "plan": {
        "value": "Standalone",
        "type": "text"
      },
      "includePatioAddon": {
        "value": true,
        "type": "boolean"
      },
      "frequency": {
        "value": "Monthly",
        "type": "text"
      },
      "total": {
        "value": 1300,
        "type": "calc"
      }
    }
  }
}
```

## Common Issues to Check

1. **Checkbox not loading**: If the checkbox doesn't load correctly, check:
   - Console for patio debug messages
   - Verify `includePatioAddon` field exists in stored data
   - Check data transformation is working

2. **Incorrect total calculation**: If totals are wrong:
   - Verify base price ($800) + add-on price ($500) = $1300
   - Check frequency multipliers are applied correctly

3. **Data not persisting**: If add-on state doesn't save:
   - Check form serialization debug messages
   - Verify `includePatioAddon` appears in final context data

## Success Criteria

✅ **Patio add-on checkbox works in UI**
✅ **Correct pricing calculation ($800 base + $500 add-on = $1300)**
✅ **Data saves correctly to backend**
✅ **Edit mode loads checkbox state correctly**
✅ **Both checked and unchecked states work**

If any of these fail, please share the console debug output and I can help troubleshoot further.