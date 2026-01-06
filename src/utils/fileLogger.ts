// src/utils/fileLogger.ts
// Simple global logging system for version changes

import { pdfApi } from "../backendservice/api/pdfApi";

interface FieldChange {
  productKey: string;
  productName: string;
  productType: 'product' | 'dispenser' | 'service' | 'agreement_text';
  fieldType: string;
  fieldDisplayName: string;
  changeType?: 'numeric' | 'text'; // ✅ NEW: Distinguish change types
  // Numeric changes
  originalValue?: number;
  newValue?: number;
  changeAmount?: number;
  changePercentage?: number;
  // ✅ NEW: Text changes
  originalText?: string;
  newText?: string;
  quantity?: number;
  frequency?: string;
  timestamp: string;
}

interface LogData {
  agreementId: string;
  versionId: string;
  versionNumber: number;
  salespersonId: string;
  salespersonName: string;
  saveAction: 'save_draft' | 'generate_pdf' | 'manual_save';
  documentTitle: string;
  changes: FieldChange[];
}

// Global logging state
class FileLogger {
  private changes: Map<string, FieldChange> = new Map(); // ✅ Use Map to keep only ONE change per field
  private sessionId: string;
    constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    console.log('📝 [FILE-LOGGER] Initialized with session:', this.sessionId);
  }

  // Add or update a change (replaces previous change for same field)
  addChange(change: Omit<FieldChange, 'changeAmount' | 'changePercentage' | 'timestamp'>): void {
    const key = `${change.productKey}_${change.fieldType}`;
    const existingEntry = this.changes.get(key);

    // ✅ NEW: Handle text changes differently from numeric changes
    if (change.changeType === 'text') {
      // For text changes, preserve original text from first change
      const resolvedOriginalText = existingEntry && existingEntry.originalText
        ? existingEntry.originalText
        : change.originalText || '';

      const fullChange: FieldChange = {
        ...change,
        originalText: resolvedOriginalText,
        changeAmount: 0,
        changePercentage: 0,
        timestamp: new Date().toISOString()
      };

      if (existingEntry) {
        console.log(`🔄 [FILE-LOGGER] REPLACING text change for ${change.productName} - ${change.fieldDisplayName}:`, {
          oldChange: `"${existingEntry.originalText}" → "${existingEntry.newText}"`,
          newChange: `"${change.originalText}" → "${change.newText}"`,
          note: 'Keeping baseline originalText'
        });
      }

      this.changes.set(key, fullChange);

      console.log(`📝 [FILE-LOGGER] ${existingEntry ? 'Updated' : 'Added'} text change: ${change.productName} - ${change.fieldType}`, {
        from: `"${resolvedOriginalText}"`,
        to: `"${change.newText}"`
      });
    } else {
      // Handle numeric changes (existing logic)
      const resolvedOriginalValue = existingEntry && existingEntry.originalValue !== undefined
        ? existingEntry.originalValue
        : change.originalValue || 0;

      const newValue = change.newValue || 0;
      const changeAmount = newValue - resolvedOriginalValue;
      const changePercentage = resolvedOriginalValue !== 0
        ? (changeAmount / resolvedOriginalValue) * 100
        : 0;

      const fullChange: FieldChange = {
        ...change,
        changeType: 'numeric',
        originalValue: resolvedOriginalValue,
        newValue,
        changeAmount,
        changePercentage,
        timestamp: new Date().toISOString()
      };

      if (existingEntry) {
        console.log(`🔄 [FILE-LOGGER] REPLACING change for ${change.productName} - ${change.fieldDisplayName}:`, {
          oldChange: `${existingEntry.originalValue} → ${existingEntry.newValue}`,
          newChange: `${change.originalValue} → ${newValue}`,
          note: 'Keeping baseline originalValue'
        });
      }

      this.changes.set(key, fullChange);

      console.log(`📝 [FILE-LOGGER] ${existingEntry ? 'Updated' : 'Added'} change: ${change.productName} - ${change.fieldType}`, {
        from: resolvedOriginalValue,
        to: newValue,
        change: changeAmount,
        changePercent: changePercentage.toFixed(2) + '%'
      });
    }

    console.log(`📝 [FILE-LOGGER] Total unique fields changed: ${this.changes.size}`);
  }

  // Remove a specific change
  removeChange(productKey: string, fieldType: string): void {
    const key = `${productKey}_${fieldType}`;
    const removed = this.changes.delete(key);

    if (removed) {
      console.log(`🗑️ [FILE-LOGGER] Removed change: ${productKey} - ${fieldType}`);
    } else {
      console.log(`⚠️ [FILE-LOGGER] No change found to remove: ${productKey} - ${fieldType}`);
    }
  }

  // Get all changes as array
  getChanges(): FieldChange[] {
    return Array.from(this.changes.values()); // Convert Map to Array
  }

  // Check if there are changes
  hasChanges(): boolean {
    return this.changes.size > 0;
  }

  // Clear all changes
  clearChanges(): void {
    console.log(`🧹 [FILE-LOGGER] Clearing ${this.changes.size} changes`);
    this.changes = new Map();
  }

  // Get changes count
  getChangeCount(): number {
    return this.changes.size;
  }

  // ✅ NEW: Create or overwrite log via API with cumulative change history
  async createLogFile(logData: Omit<LogData, 'changes'>, options: {
    overwriteExisting?: boolean;
    overwriteReason?: 'draft_update' | 'version_update' | 'replace_version';
  } = {}): Promise<any> {
    const currentChanges = this.getChanges();

    if (currentChanges.length === 0) {
      console.log('ℹ️ [FILE-LOGGER] No changes to log');
      return {
        success: true,
        message: 'No changes to log',
        log: null
      };
    }

    console.log(`📦 [FILE-LOGGER] Creating log with ${currentChanges.length} unique field changes for version ${logData.versionNumber}`);

    if (options.overwriteExisting) {
      console.log(`🔄 [FILE-LOGGER] Overwrite mode enabled - reason: ${options.overwriteReason}`);
    }

    try {
      // ✅ STEP 1: Fetch ALL logs for this agreement (including same version)
      let previousChanges: FieldChange[] = [];

      console.log(`🔍 [FILE-LOGGER] Fetching previous logs for agreement: ${logData.agreementId}`);

      try {
        const previousLogs = await pdfApi.getVersionLogs(logData.agreementId);

        if (previousLogs.success && previousLogs.logs.length > 0) {
          console.log(`📚 [FILE-LOGGER] Found ${previousLogs.logs.length} total log(s) for this agreement`);

          // ✅ STEP 2: Include changes from:
          // 1. All logs from previous versions (versionNumber < current)
          // 2. All logs from SAME version that were created before now (for multiple edits of same version)
          previousLogs.logs.forEach(log => {
            const isFromPreviousVersion = log.versionNumber < logData.versionNumber;
            const isFromSameVersionButEarlier = log.versionNumber === logData.versionNumber;

            if (isFromPreviousVersion || isFromSameVersionButEarlier) {
              // Prefer currentChanges, fallback to changes for backward compatibility
              const logChanges = log.currentChanges && log.currentChanges.length > 0
                ? log.currentChanges
                : log.changes || [];

              if (logChanges.length > 0) {
                console.log(`📋 [FILE-LOGGER] Including ${logChanges.length} changes from version ${log.versionNumber} (${isFromPreviousVersion ? 'previous version' : 'same version, earlier save'})`);
                previousChanges.push(...logChanges);
              }
            }
          });

          console.log(`✅ [FILE-LOGGER] Total previous changes collected: ${previousChanges.length}`);
        } else {
          console.log(`ℹ️ [FILE-LOGGER] No previous logs found - this is the first log for this agreement`);
        }
      } catch (error) {
        console.warn(`⚠️ [FILE-LOGGER] Failed to fetch previous logs, continuing without history:`, error);
        // Continue without previous changes rather than failing
      }

      // ✅ STEP 3: Structure the log data with TWO sections
      const structuredLogData = {
        ...logData,
        currentChanges, // ✅ NEW: Current save changes only
        allPreviousChanges: previousChanges, // ✅ NEW: All changes from previous logs (including earlier saves of same version)
        changes: currentChanges, // Keep for backward compatibility
        // ✅ NEW: Pass overwriting options to backend
        overwriteExisting: options.overwriteExisting || false,
        overwriteReason: options.overwriteReason,
      };

      console.log(`📝 [FILE-LOGGER] Log structure:`, {
        versionNumber: logData.versionNumber,
        currentChangesCount: currentChanges.length,
        previousChangesCount: previousChanges.length,
        totalChangesInHistory: currentChanges.length + previousChanges.length
      });

      // ✅ STEP 4: Create the log via API
      const result = await pdfApi.createVersionLog(structuredLogData);

      console.log(`✅ [FILE-LOGGER] Log created successfully:`, {
        logId: result.log?.logId,
        fileName: result.log?.fileName,
        currentChanges: result.log?.totalChanges,
        historicalChanges: previousChanges.length,
        totalPriceImpact: result.log?.totalPriceImpact,
        hasSignificantChanges: result.log?.hasSignificantChanges
      });

      // Clear changes after successful logging
      this.clearChanges();

      return result;

    } catch (error) {
      console.error('❌ [FILE-LOGGER] Failed to create log:', error);
      throw error;
    }
  }

  // Debug method to inspect current state
  debug(): void {
    console.log('🔍 [FILE-LOGGER] Debug Info:', {
      sessionId: this.sessionId,
      changesCount: this.changes.size,
      changes: Array.from(this.changes.entries()).map(([key, change]) => ({
        key,
        product: change.productName,
        field: change.fieldType,
        change: `${change.originalValue} → ${change.newValue} (${change.changeAmount >= 0 ? '+' : ''}${change.changeAmount})`
      }))
    });
  }

  // Update frequency label for pending service changes
  updateServiceChangeFrequency(
    areaName: string,
    frequency: string
  ): void {
    const prefix = `refreshPowerScrub_${areaName}_`;
    let updated = false;
    this.changes.forEach((change, key) => {
      if (key.startsWith(prefix)) {
        change.frequency = frequency;
        updated = true;
      }
    });
    if (updated) {
      console.log(`ĐY"" [FILE-LOGGER] Updated frequency for ${areaName} changes to ${frequency}`);
    }
  }
}

// Global singleton instance
const fileLogger = new FileLogger();

// Export the singleton and helper functions
export { fileLogger };

// Helper functions for easier access
export const addPriceChange = (change: Omit<FieldChange, 'changeAmount' | 'changePercentage' | 'timestamp'>) => {
  fileLogger.addChange(change);
};

// ✅ NEW: Helper function for adding text changes (agreement text, descriptions, etc.)
export const addTextChange = (change: Omit<FieldChange, 'changeAmount' | 'changePercentage' | 'timestamp'>) => {
  fileLogger.addChange({
    ...change,
    changeType: 'text'
  });
};

export const clearPriceChanges = () => {
  fileLogger.clearChanges();
};

export const hasPriceChanges = (): boolean => {
  return fileLogger.hasChanges();
};

export const getPriceChangeCount = (): number => {
  return fileLogger.getChangeCount();
};

export const createVersionLogFile = async (
  logData: Omit<LogData, 'changes'>,
  options: {
    overwriteExisting?: boolean;
    overwriteReason?: 'draft_update' | 'version_update' | 'replace_version';
  } = {}
) => {
  return await fileLogger.createLogFile(logData, options);
};

export const debugFileLogger = () => {
  fileLogger.debug();
};

export const updateRefreshPowerScrubFrequency = (areaName: string, frequency: string) => {
  fileLogger.updateServiceChangeFrequency(areaName, frequency);
};

// ✅ SIMPLIFIED: Helper function to get all version logs for testing (uses Logs collection)
export const getAllVersionLogsForTesting = async (params?: {
  page?: number;
  limit?: number;
  agreementId?: string;
}) => {
  try {
    const { pdfApi } = await import('../backendservice/api/pdfApi');
    const result = await pdfApi.getAllVersionLogs(params);

    console.log('📋 [ALL-VERSION-LOGS] Results:', {
      totalLogs: result.pagination.totalLogs,
      currentPage: result.pagination.currentPage,
      totalPages: result.pagination.totalPages,
      logs: result.logs.length
    });

    console.table(result.logs.map(log => ({
      logId: log._id,
      fileName: log.fileName,
      agreementId: log.agreementId,
      agreementTitle: log.agreementTitle || 'N/A',
      versionNumber: log.versionNumber,
      totalChanges: log.totalChanges,
      priceImpact: `$${log.totalPriceImpact}`,
      createdAt: new Date(log.createdAt).toLocaleString(),
      salesperson: log.salespersonName
    })));

    return result;
  } catch (error) {
    console.error('❌ Failed to fetch all version logs:', error);
    return null;
  }
};

// Utility function to get product type from family key
export const getProductTypeFromFamily = (familyKey: string): 'product' | 'dispenser' | 'service' | 'agreement_text' => {
  if (familyKey === 'dispensers') return 'dispenser';
  if (familyKey.includes('service') || familyKey.includes('Service')) return 'service';
  if (familyKey === 'agreement_text' || familyKey.includes('agreement') || familyKey.includes('terms')) return 'agreement_text';
  return 'product';
};

// Utility function to determine field type from the field being overridden
export const getFieldType = (fieldName: string): string => {
  switch (fieldName) {
    case 'unitPriceOverride':
      return 'unitPrice';
    case 'amountOverride':
      return 'amount';
    case 'warrantyPriceOverride':
      return 'warrantyPrice';
    case 'replacementPriceOverride':
      return 'replacementPrice';
    case 'totalOverride':
      return 'total';
    // Service-specific field types
    case 'hourlyRate':
      return 'hourlyRate';
    case 'minimumVisit':
      return 'minimumVisit';
    case 'customPerVisitTotal':
      return 'customPerVisitTotal';
    case 'workers':
      return 'workers';
    case 'hours':
      return 'hours';
    case 'customAmount':
      return 'customAmount';
    case 'insideSqFt':
      return 'insideSqFt';
    case 'outsideSqFt':
      return 'outsideSqFt';
    case 'insideRate':
      return 'insideRate';
    case 'outsideRate':
      return 'outsideRate';
    case 'sqFtFixedFee':
      return 'sqFtFixedFee';
    default:
      return fieldName; // Return the field name as-is if not recognized
  }
};

// Utility function to get field display name from field type
export const getFieldDisplayName = (fieldType: string): string => {
  const displayNames: Record<string, string> = {
    // Product/Dispenser fields
    'unitPrice': 'Unit Price',
    'amount': 'Amount',
    'warrantyPrice': 'Warranty Price',
    'replacementPrice': 'Replacement Price',
    'total': 'Total',

    // Service fields - SaniClean
    'customBaseService': 'Base Service Cost',
    'customTripCharge': 'Trip Charge',
    'customFacilityComponents': 'Facility Components',
    'customSoapUpgrade': 'Soap Upgrade',
    'customExcessSoap': 'Excess Soap',
    'customMicrofiberMopping': 'Microfiber Mopping',
    'customWarrantyFees': 'Warranty Fees',
    'customPaperOverage': 'Paper Overage',
    'customWeeklyTotal': 'Weekly Total',
    'customMonthlyTotal': 'Monthly Total',
    'customContractTotal': 'Contract Total',

    // Service fields - Microfiber Mopping
    'includedBathroomRate': 'Included Bathroom Rate',
    'hugeBathroomRatePerSqFt': 'Huge Bathroom Rate per Sq Ft',
    'extraAreaRatePerUnit': 'Extra Area Rate per Unit',
    'standaloneRatePerUnit': 'Standalone Rate per Unit',
    'dailyChemicalPerGallon': 'Daily Chemical per Gallon',
    'customStandardBathroomTotal': 'Standard Bathroom Total',
    'customHugeBathroomTotal': 'Huge Bathroom Total',
    'customExtraAreaTotal': 'Extra Area Total',
    'customStandaloneTotal': 'Standalone Total',
    'customChemicalTotal': 'Chemical Total',
    'customPerVisitPrice': 'Per Visit Price',
    'customMonthlyRecurring': 'Monthly Recurring',
    'customFirstMonthPrice': 'First Month Price',
    'workerRate': 'Worker Rate',
    'presetRate': 'Preset Rate',
    'smallMediumRate': 'Small/Medium Rate',
    'largeRate': 'Large Rate',

    // Service fields - SaniScrub
    'customBathroomTotal': 'Bathroom Total',
    'customNonBathroomTotal': 'Non-Bathroom Total',
    'customInstallationTotal': 'Installation Total',
    'customPerVisitTotal': 'Per Visit Total',
    'customMonthlyTotal': 'Monthly Total',
    'customFirstMonthTotal': 'First Month Total',
    'customContractTotal': 'Contract Total',
    'bathroomRatePerFixture': 'Bathroom Rate per Fixture',
    'nonBathroomFirstUnitRate': 'Non-Bathroom First Unit Rate',
    'nonBathroomAdditionalRate': 'Non-Bathroom Additional Rate',

    // Service fields - Foaming Drain
    'standardDrainRate': 'Standard Drain Rate',
    'altBaseCharge': 'Alt Base Charge',
    'altExtraPerDrain': 'Alt Extra Per Drain',
    'volumeWeeklyRate': 'Volume Weekly Rate',
    'volumeBimonthlyRate': 'Volume Bimonthly Rate',
    'greaseWeeklyRate': 'Grease Weekly Rate',
    'greaseInstallRate': 'Grease Install Rate',
    'greenWeeklyRate': 'Green Weekly Rate',
    'greenInstallRate': 'Green Install Rate',
    'plumbingAddonRate': 'Plumbing Addon Rate',
    'filthyMultiplier': 'Filthy Multiplier',
    'customWeeklyService': 'Weekly Service',

    // Service fields - Refresh Power Scrub
    'global_hourlyRate': 'Global Hourly Rate',
    'global_minimumVisit': 'Global Minimum Visit',
    'global_customPerVisitTotal': 'Custom Per Visit Total',
    'Dumpster_workers': 'Dumpster Workers',
    'Dumpster_hours': 'Dumpster Hours',
    'Dumpster_hourlyRate': 'Dumpster Hourly Rate',
    'Dumpster_insideSqFt': 'Dumpster Inside Sq Ft',
    'Dumpster_outsideSqFt': 'Dumpster Outside Sq Ft',
    'Dumpster_insideRate': 'Dumpster Inside Rate',
    'Dumpster_outsideRate': 'Dumpster Outside Rate',
    'Dumpster_sqFtFixedFee': 'Dumpster Sq Ft Fixed Fee',
    'Dumpster_customAmount': 'Dumpster Custom Amount',
    'Patio_workers': 'Patio Workers',
    'Patio_hours': 'Patio Hours',
    'Patio_hourlyRate': 'Patio Hourly Rate',
    'Patio_customAmount': 'Patio Custom Amount',
    'Walkway_workers': 'Walkway Workers',
    'Walkway_hours': 'Walkway Hours',
    'Walkway_customAmount': 'Walkway Custom Amount',
    'Front of House_workers': 'Front of House Workers',
    'Front of House_hours': 'Front of House Hours',
    'Front of House_customAmount': 'Front of House Custom Amount',
    'Back of House_workers': 'Back of House Workers',
    'Back of House_hours': 'Back of House Hours',
    'Back of House_customAmount': 'Back of House Custom Amount',
    'Other_workers': 'Other Workers',
    'Other_hours': 'Other Hours',
    'Other_customAmount': 'Other Custom Amount',

    // Service fields - Strip Wax
    'floorAreaSqFt': 'Floor Area Sq Ft',
    'ratePerSqFt': 'Rate Per Sq Ft',
    'minCharge': 'Minimum Charge',
    'weeksPerMonth': 'Weeks Per Month',
    'standardFullRatePerSqFt': 'Standard Full Rate Per Sq Ft',
    'standardFullMinCharge': 'Standard Full Minimum Charge',
    'noSealantRatePerSqFt': 'No Sealant Rate Per Sq Ft',
    'noSealantMinCharge': 'No Sealant Minimum Charge',
    'wellMaintainedRatePerSqFt': 'Well Maintained Rate Per Sq Ft',
    'wellMaintainedMinCharge': 'Well Maintained Minimum Charge',
    'redRateMultiplier': 'Red Rate Multiplier',
    'greenRateMultiplier': 'Green Rate Multiplier',
    'customPerVisit': 'Custom Per Visit',
    'customMonthly': 'Custom Monthly',
    'customOngoingMonthly': 'Custom Ongoing Monthly',
    'customContractTotal': 'Custom Contract Total',

    // Service fields - Electrostatic Spray
    'ratePerRoom': 'Rate Per Room',
    'ratePerThousandSqFt': 'Rate Per Thousand Sq Ft',
    'tripChargePerVisit': 'Trip Charge Per Visit',
    'customServiceCharge': 'Custom Service Charge',
    'customPerVisitPrice': 'Custom Per Visit Price',
    'customMonthlyRecurring': 'Custom Monthly Recurring',
    'customFirstMonthTotal': 'Custom First Month Total',

    // Service fields - Carpet Cleaning
    'firstUnitRate': 'First 500 sq ft Rate',
    'additionalUnitRate': 'Additional 500 sq ft Rate',
    'perVisitMinimum': 'Per Visit Minimum',
    'customFirstUnitRate': 'Custom First Unit Rate',
    'customAdditionalUnitRate': 'Custom Additional Unit Rate',
    'customPerVisitMinimum': 'Custom Per Visit Minimum',
    'customInstallationFee': 'Custom Installation Fee',

    // Service fields - Janitorial
    'recurringServiceRate': 'Recurring Service Rate',
    'oneTimeServiceRate': 'One Time Service Rate',
    'vacuumingRatePerHour': 'Vacuuming Rate Per Hour',
    'dustingRatePerHour': 'Dusting Rate Per Hour',
    'perVisitMinimum': 'Per Visit Minimum',
    'recurringContractMinimum': 'Recurring Contract Minimum',
    'standardTripCharge': 'Standard Trip Charge',
    'beltwayTripCharge': 'Beltway Trip Charge',
    'paidParkingTripCharge': 'Paid Parking Trip Charge',
    'parkingCost': 'Parking Cost',
    'baseHours': 'Base Hours',
    'vacuumingHours': 'Vacuuming Hours',
    'dustingHours': 'Dusting Hours',

    // Service fields - Pure Janitorial
    'baseHourlyRate': 'Base Hourly Rate',
    'shortJobHourlyRate': 'Short Job Hourly Rate',
    'minHoursPerVisit': 'Minimum Hours Per Visit',
    'weeksPerMonth': 'Weeks Per Month',
    'dirtyInitialMultiplier': 'Dirty Initial Multiplier',
    'infrequentMultiplier': 'Infrequent Multiplier',
    'dustingPlacesPerHour': 'Dusting Places Per Hour',
    'dustingPricePerPlace': 'Dusting Price Per Place',
    'vacuumingDefaultHours': 'Vacuuming Default Hours',
    'redRateMultiplier': 'Red Rate Multiplier',
    'greenRateMultiplier': 'Green Rate Multiplier',
    'customPerVisit': 'Custom Per Visit',
    'customFirstVisit': 'Custom First Visit',
    'customMonthly': 'Custom Monthly',
    'customOngoingMonthly': 'Custom Ongoing Monthly',
    'customContractTotal': 'Custom Contract Total',

    // Service fields - Grease Trap
    'perTrapRate': 'Per Trap Rate',
    'perGallonRate': 'Per Gallon Rate',

    // Service fields - RPM Windows
    'smallWindowRate': 'Small Window Rate',
    'mediumWindowRate': 'Medium Window Rate',
    'largeWindowRate': 'Large Window Rate',
    'tripCharge': 'Trip Charge',
    'customSmallTotal': 'Custom Small Total',
    'customMediumTotal': 'Custom Medium Total',
    'customLargeTotal': 'Custom Large Total',
    'customPerVisitPrice': 'Custom Per Visit Price',
    'customMonthlyRecurring': 'Custom Monthly Recurring',
    'customAnnualPrice': 'Custom Annual Price',
    'customInstallationFee': 'Custom Installation Fee',

    // ✅ NEW: Agreement text fields
    'agreementTerms': 'Agreement Terms',
    'serviceDescription': 'Service Description',
    'specialConditions': 'Special Conditions',
    'paymentTerms': 'Payment Terms',
    'cancellationPolicy': 'Cancellation Policy',
    'warrantyInfo': 'Warranty Information',
    'customNotes': 'Custom Notes',
    'legalDisclaimer': 'Legal Disclaimer',
    'contractClause': 'Contract Clause',
    'serviceScope': 'Service Scope',

    // Add more service fields as needed...
  };

  if (displayNames[fieldType]) {
    return displayNames[fieldType];
  }

  const underscoreIndex = fieldType.indexOf('_');
  if (underscoreIndex > 0) {
    const areaName = fieldType.slice(0, underscoreIndex);
    const rawField = fieldType.slice(underscoreIndex + 1);
    const rawDisplay = displayNames[rawField] || rawField;
    return `${areaName} ${rawDisplay}`;
  }

  return fieldType;
};
