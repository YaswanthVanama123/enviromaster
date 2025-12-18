# Pricing Override System - Comprehensive Test Plan

## Overview
This test plan validates the global editable fields and hierarchical pricing override system implemented across all services (RPM Windows, SaniScrub, Carpet Cleaning).

## Test Environment Setup
1. Start the development server: `npm run dev`
2. Navigate to the service pricing forms
3. Ensure backend configuration is loaded
4. Monitor browser console for configuration loading messages

## 🔧 Core System Tests

### **Backend Configuration Loading**
**Test**: Verify backend config loads and updates form fields
- [ ] Check console for "✅ [Service] CONFIG loaded from backend" messages
- [ ] Verify rate fields update from hardcoded values to backend values
- [ ] Test fallback to context pricing when active service unavailable
- [ ] Test final fallback to static config when backend unavailable

### **File Logging System**
**Test**: Price change logging
- [ ] Edit any pricing field
- [ ] Check console for "📝 [SERVICE-FILE-LOGGER] Added change" messages
- [ ] Verify logged data includes: from/to values, change amount, percentage change

## 🎯 RPM Windows - Specific Tests

### **Frequency Pricing Rules**
**Test**: Special frequency mapping
- [ ] Set frequency to "2×/Month" → verify per-window rates match Monthly exactly
- [ ] Set frequency to "Bi-Monthly" → verify per-window rates match Monthly exactly
- [ ] Set frequency to "Bi-Annual" → verify per-window rates match Quarterly exactly
- [ ] Set frequency to "Annual" → verify per-window rates match Quarterly exactly

**Test**: Monthly recurring display
- [ ] Set frequency to "Quarterly" → verify monthly recurring field shows prorated amount (per-visit ÷ 3)
- [ ] Set frequency to "Bi-Annual" → verify monthly recurring field shows prorated amount (per-visit ÷ 6)
- [ ] Set frequency to "Annual" → verify monthly recurring field shows prorated amount (per-visit ÷ 12)

### **Editable Installation Multipliers**
**Test**: Installation multiplier fields
- [ ] Verify "Install Multiplier (Dirty)" field shows backend value (typically 3)
- [ ] Verify "Install Multiplier (Clean)" field shows 1
- [ ] Edit multiplier values → verify installation cost updates immediately
- [ ] Test with "First Time Install" checked → verify uses dirty multiplier
- [ ] Test with "First Time Install" unchecked → verify uses clean multiplier

### **Hierarchical Overrides**
**Test**: Custom override priority
- [ ] Enter windows (small: 5, medium: 3, large: 2) with weekly frequency
- [ ] Note calculated per-visit price
- [ ] Enter custom per-visit price → verify displayed value changes to custom
- [ ] Clear custom per-visit price → verify returns to calculated value
- [ ] Enter custom monthly recurring → verify monthly field shows custom value
- [ ] Enter custom contract total → verify contract total shows custom value

## 🧼 SaniScrub - Specific Tests

### **Editable Rate Fields**
**Test**: Fixture rates by frequency
- [ ] Verify "Monthly Rate" field shows backend value
- [ ] Verify "Bi-Monthly Rate" field shows backend value
- [ ] Verify "Quarterly Rate" field shows backend value
- [ ] Edit any rate → verify calculations update immediately

**Test**: Non-bathroom area rates
- [ ] Verify "First Unit Rate" (500 sq ft) field shows backend value
- [ ] Verify "Additional Unit Rate" field shows backend value
- [ ] Edit rates → verify non-bathroom pricing updates immediately

### **Frequency-Specific Calculations**
**Test**: 2×/Month with SaniClean discount
- [ ] Set frequency to "2×/Month", check "Has SaniClean"
- [ ] Verify $15 discount applied to monthly recurring
- [ ] Uncheck "Has SaniClean" → verify discount removed

**Test**: Installation-based pricing rules
- [ ] Set "Monthly" frequency, check "Include Installation"
- [ ] Verify first month = installation only (no service cost)
- [ ] Set "Weekly" frequency, check "Include Installation"
- [ ] Verify first month = installation + remaining visits × service cost

### **Hierarchical Overrides**
**Test**: Installation and pricing overrides
- [ ] Enter fixtures (5), check installation → note calculated installation cost
- [ ] Enter custom installation fee → verify overrides calculation
- [ ] Enter custom per-visit price → verify overrides calculated fixture + non-bathroom cost
- [ ] Enter custom monthly recurring → verify overrides frequency-based calculation

## 🏠 Carpet Cleaning - Specific Tests

### **Calculation Methods**
**Test**: Exact vs Block pricing
- [ ] Enter 1000 sq ft, check "Use Exact Sq Ft" → verify exact calculation
- [ ] Uncheck "Use Exact Sq Ft" → verify block-based calculation (ceiling function)
- [ ] Compare results → block pricing should be higher for non-multiples of 500

### **Editable Rate Fields**
**Test**: Unit pricing rates
- [ ] Verify "First Unit Rate" (500 sq ft) field shows backend value
- [ ] Verify "Additional Unit Rate" field shows backend value
- [ ] Verify "Per Visit Minimum" field shows backend value
- [ ] Edit any rate → verify per-visit calculation updates immediately

### **Installation-Based Pricing**
**Test**: Installation rules by frequency
- [ ] Set "Quarterly" frequency, 1000 sq ft, check installation
- [ ] Verify contract total = installation + (3 × service cost)
- [ ] Set "Bi-Monthly" frequency → verify = installation + (5 × service cost)
- [ ] Set "Annual" frequency → verify = installation only

### **Hierarchical Overrides**
**Test**: Override priority system
- [ ] Enter area (1000 sq ft) → note calculated per-visit cost
- [ ] Enter custom per-visit price → verify overrides calculation
- [ ] Enter custom monthly recurring → verify overrides frequency calculation
- [ ] Enter custom contract total → verify overrides contract calculation

## 🔄 Cross-Service Consistency Tests

### **Installation Multiplier Consistency**
**Test**: Same behavior across all services
- [ ] All services: Verify dirty multiplier defaults to backend value (typically 3)
- [ ] All services: Verify clean multiplier defaults to 1
- [ ] All services: Edit multipliers → verify calculations update
- [ ] All services: Verify installation cost = base cost × multiplier

### **Custom Override Consistency**
**Test**: Same override fields available
- [ ] All services: Verify customInstallationFee field available
- [ ] All services: Verify customPerVisitPrice field available
- [ ] All services: Verify customMonthlyRecurring field available
- [ ] All services: Verify customContractTotal field available
- [ ] All services: Test clear field (empty) → returns to calculated value

### **Backend Integration Consistency**
**Test**: Same fallback behavior
- [ ] All services: Active config loads from serviceConfigApi.getActive()
- [ ] All services: Fallback to ServicesContext.getBackendPricingForService()
- [ ] All services: Final fallback to static local config
- [ ] All services: Form fields update when backend config loads

## 🐛 Error Handling Tests

### **Invalid Input Handling**
- [ ] Enter negative numbers in rate fields → verify handled gracefully
- [ ] Enter non-numeric values → verify falls back to 0 or previous value
- [ ] Clear required fields → verify calculations handle empty/undefined values

### **Backend Failure Scenarios**
- [ ] Simulate API failure → verify fallback to context pricing
- [ ] Simulate missing backend config → verify fallback to static config
- [ ] Test with malformed backend data → verify error handling

## 📊 Performance Tests

### **Calculation Efficiency**
- [ ] Edit rate fields rapidly → verify no lag in calculations
- [ ] Toggle custom overrides → verify immediate UI updates
- [ ] Change frequency multiple times → verify consistent performance

## ✅ Test Completion Criteria

**All tests pass when:**
1. **Backend Integration**: All services load backend config and update form fields
2. **Frequency Rules**: RPM Windows special frequency mapping works correctly
3. **Editable Fields**: All rate fields and multipliers are editable across all services
4. **Hierarchical Overrides**: Custom values override calculations in correct priority order
5. **Installation Logic**: Installation-based pricing follows documented rules
6. **Cross-Service Consistency**: Same override behavior across all services
7. **Error Handling**: Invalid inputs handled gracefully without breaking calculations
8. **Performance**: Real-time calculations without lag or delays

## 🚀 Manual Testing Sequence

**Recommended testing order:**
1. **RPM Windows**: Test frequency rules and new installation multipliers
2. **SaniScrub**: Test fixture rates and 2×/month discount logic
3. **Carpet Cleaning**: Test exact vs block pricing and installation rules
4. **Cross-Service**: Test same scenarios across all services for consistency
5. **Error Cases**: Test edge cases and invalid inputs
6. **Backend Scenarios**: Test with different backend configuration states

This comprehensive test plan ensures the pricing override system works correctly across all services with proper hierarchical behavior and error handling.