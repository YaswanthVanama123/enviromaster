# Installation-Based Pricing Rules Implementation

## Overview
Both SaniScrub and Carpet Cleaning services now implement the new installation-based pricing calculation rules. The key principle is that **with installation, the first visit is charged as an installation, and subsequent visits are normal service visits**.

## Backend Configuration Integration

### Dynamic Values from Backend
Both services now pull the following values from backend configuration instead of using hardcoded values:

#### **Frequency Multipliers**
- **Weekly**: `monthlyVisits` (e.g., 4.33 visits per month)
- **Bi-Weekly**: `monthlyVisits` (e.g., 2.165 visits per month)
- **2×/Month**: `monthlyVisits` (e.g., 2 visits per month)
- **Monthly**: `monthlyVisits` (1 visit per month)
- **Bi-Monthly**: Calculated as `contractMonths / 2` visits
- **Quarterly**: Calculated as `contractMonths / 3` visits
- **Bi-Annual**: Calculated as `(contractMonths / 12) × 2` visits
- **Annual**: Calculated as `contractMonths / 12` visits

#### **Installation Multipliers**
- **Dirty Installation**: `installMultipliers.dirty` (typically 3×)
- **Clean Installation**: `installMultipliers.clean` (typically 1×)

#### **Configuration Priority**
1. **Backend Config** (from database/API) - First priority
2. **Local Config** (fallback) - Used if backend unavailable
3. **Hardcoded Values** - Final fallback

### Backend Config Sources
- **Active Services**: Loaded via `serviceConfigApi.getActive()`
- **Services Context**: Fallback pricing data for inactive services
- **Local Static Config**: Ultimate fallback when backend unavailable

## Implementation Details

### Key Changes Made:

1. **Updated Pricing Types** (`src/pricing/pricingTypes.ts`)
   - Added `includeInstallation?: boolean` to `PriceFormulaInput`
   - Added `contractMonths?: number` for contract length calculations
   - Enhanced `ComputedPrice` with installation-specific fields
   - Added `hasInstallationScenarios?: boolean` to `PriceRow`

2. **Updated Service Calculation Logic**
   - **SaniScrub**: `src/components/services/saniscrub/useSaniscrubCalc.ts`
   - **Carpet Cleaning**: `src/components/services/carpetCleaning/useCarpetCalc.ts`

3. **Updated Admin Interface** (`src/components/admin/AdminPricingTable.tsx`)
   - Added columns for "Install $" and "Has Install?" checkboxes

## Pricing Rules by Frequency

### 1. One-Time Frequency
- **With Installation**: Total Price = Installation Cost (no service cost added)
- **Without Installation**: Total Price = Service Cost × 1

### 2. Weekly Frequency (4.33 visits/month)
- **First Month**:
  - With Installation: Installation Cost + (3.33 × Service Cost)
  - Without Installation: 4.33 × Service Cost
- **Subsequent Months**: 4.33 × Service Cost

### 3. Bi-Weekly Frequency (2.165 visits/month)
- **First Month**:
  - With Installation: Installation Cost + (1.165 × Service Cost)
  - Without Installation: 2.165 × Service Cost
- **Subsequent Months**: 2.165 × Service Cost

### 4. Monthly Frequency
- **First Month**:
  - With Installation: Installation Cost only
  - Without Installation: Service Cost × 1
- **Subsequent Months**: Service Cost × 1

### 5. Bi-Monthly Frequency (Every 2 Months)
- **Total visits in 12-month contract**: 6 (1 visit every 2 months)
- **With Installation**:
  - First visit: Installation Cost only
  - Remaining 5 visits: Service Cost each
- **Total for 12-month contract**: Installation + (Service Cost × 5)
- **Without Installation**: Service Cost × 6

### 6. Quarterly Frequency
- **Total visits in 12-month contract**: 4 (1 visit every 3 months)
- **With Installation**:
  - First visit: Installation Cost only
  - Remaining 3 visits: Service Cost each
- **Total for 12-month contract**: Installation + (Service Cost × 3)
- **Without Installation**: Service Cost × 4

### 7. Bi-Annual Frequency
- **Two services per year**
- **First Service**: Installation Cost (if included)
- **Second Service**: Normal Service Cost
- **Total**: Installation + Service Cost

### 8. Annual Frequency
- **One service per year**
- **With Installation**: Total = Installation Cost only
- **Without Installation**: Total = Service Cost

## Example Calculations (Using Backend Values)

### SaniScrub Example (5 fixtures, weekly frequency, 12-month contract)
*Assumes backend config: monthlyVisits = 4.33, installMultipliers.dirty = 3*

- **Service Cost per visit**: 5 × $25 = $125 (before minimum)
- **Minimum applied**: $175 (SaniScrub minimum)
- **Installation Cost** (3× dirty from backend): $175 × 3 = $525

**With Installation:**
- First Month: $525 + (3.33 × $175) = $525 + $582.75 = $1,107.75
- Months 2-12: $175 × 4.33 × 11 = $8,332.75
- **Total Contract**: $1,107.75 + $8,332.75 = $9,440.50

**Without Installation:**
- All 12 months: $175 × 4.33 × 12 = $9,081
- **Total Contract**: $9,081

### Carpet Cleaning Example (1000 sqft, quarterly frequency, 12-month contract)
*Assumes backend config: installMultipliers.dirty = 3*

- **Service Cost per visit**: $250 (first 500) + $250 (second 500) = $500
- **Installation Cost** (3× dirty from backend): $500 × 3 = $1,500
- **Total visits in 12 months**: 4 (quarterly = every 3 months)

**With Installation:**
- First visit: $1,500 (installation only)
- Remaining 3 visits: $500 × 3 = $1,500
- **Total Contract**: $1,500 + $1,500 = $3,000

**Without Installation:**
- All 4 visits: $500 × 4 = $2,000
- **Total Contract**: $2,000

## File Locations

### Updated Files:
1. `src/pricing/pricingTypes.ts` - Enhanced type definitions
2. `src/pricing/defaultData.ts` - Updated SaniScrub and added Carpet Cleaning configs
3. `src/components/admin/AdminPricingTable.tsx` - Added installation fields to admin interface
4. `src/components/services/saniscrub/useSaniscrubCalc.ts` - New calculation logic
5. `src/components/services/carpetCleaning/useCarpetCalc.ts` - New calculation logic
6. `src/components/services/carpetCleaning/carpetConfig.ts` - Complete frequency metadata

### Key Functions Updated:
- **First Month Calculation**: Implements installation-based rules per frequency
- **Contract Total Calculation**: Handles installation + service visits correctly
- **Frequency Support**: All 9 frequencies (OneTime, Weekly, Biweekly, TwicePerMonth, Monthly, Bimonthly, Quarterly, Bi-Annual, Annual)

## Testing
The calculations have been implemented and are ready for testing in the form filling interface. Both services now follow the exact installation-based pricing rules as specified.