import React, { useState, useEffect } from 'react';
import {
  faMoneyBill,
  faBox,
  faCog,
  faChartBar,
  faCheckCircle,
  faExclamationTriangle,
  faClipboard,
  faFile,
  faDatabase,
  faWrench,
  faSync,
  faFolder,
  faHdd,
  faEdit,
  faRocket,
  faChartLine,
  faArchive,
  faFileAlt,
  faSearch,
  faCaretRight,
  faTags,
  faInfo,
  faWarning
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { backupUtils } from '../../backendservice/api/pricingBackupApi';
import { usePricingBackupDetails } from '../../backendservice/hooks/usePricingBackups';
import type { PricingBackup } from '../../backendservice/types/pricingBackup.types';

interface BackupDetailsModalProps {
  backup: PricingBackup;
  onClose: () => void;
}

export const BackupDetailsModal: React.FC<BackupDetailsModalProps> = ({
  backup,
  onClose
}) => {
  const { backup: detailedBackup, snapshot, loading: snapshotLoading, error: snapshotError } = usePricingBackupDetails(backup.changeDayId);
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'metadata'>('overview');

  // Expandable tree state management
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Simple helper function to extract all pricing from service configs using direct mapping
  const extractAllPricingFromConfig = (config: any) => {
    if (!config || typeof config !== 'object') return [];

    const pricingData: Array<{
      name: string;
      price: number;
      unit?: string;
      description?: string;
      category?: string;
    }> = [];

    // Recursively find all numeric pricing values in the config
    const findPricingValues = (obj: any, path: string = '', depth: number = 0) => {
      if (depth > 4 || !obj || typeof obj !== 'object') return;

      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof value === 'number' && value > 0) {
          // Check if this looks like a pricing field
          const lowerKey = key.toLowerCase();
          const lowerPath = currentPath.toLowerCase();

          if (lowerKey.includes('rate') ||
              lowerKey.includes('price') ||
              lowerKey.includes('charge') ||
              lowerKey.includes('cost') ||
              lowerKey.includes('fee') ||
              lowerKey.includes('minimum') ||
              lowerKey.includes('discount') ||
              lowerPath.includes('pricing')) {

            // Determine unit based on key name
            let unit = 'per service';
            if (lowerKey.includes('sqft') || lowerKey.includes('sq')) unit = 'per sq ft';
            else if (lowerKey.includes('hour')) unit = 'per hour';
            else if (lowerKey.includes('fixture')) unit = 'per fixture';
            else if (lowerKey.includes('unit')) unit = 'per unit';
            else if (lowerKey.includes('room')) unit = 'per room';
            else if (lowerKey.includes('window')) unit = 'per window';
            else if (lowerKey.includes('drain')) unit = 'per drain';
            else if (lowerKey.includes('trap')) unit = 'per trap';
            else if (lowerKey.includes('bathroom')) unit = 'per bathroom';
            else if (lowerKey.includes('minimum')) unit = 'minimum charge';
            else if (lowerKey.includes('discount')) unit = 'discount rate';
            else if (lowerKey.includes('week')) unit = 'per week';
            else if (lowerKey.includes('visit')) unit = 'per visit';
            else if (lowerKey.includes('install')) unit = 'installation';

            // Create readable name from path
            const nameParts = currentPath.split('.');
            const readableName = nameParts
              .map(part => part.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))
              .join(' - ');

            // Determine category from path
            let category = 'Service Pricing';
            if (currentPath.includes('geographic')) category = 'Geographic Pricing';
            else if (currentPath.includes('frequency') || currentPath.includes('fixture')) category = 'Frequency Rates';
            else if (currentPath.includes('minimum')) category = 'Minimum Charges';
            else if (currentPath.includes('install')) category = 'Installation Fees';
            else if (currentPath.includes('trip')) category = 'Trip Charges';
            else if (currentPath.includes('volume')) category = 'Volume Pricing';
            else if (currentPath.includes('addon') || currentPath.includes('additional')) category = 'Additional Services';
            else if (currentPath.includes('window')) category = 'Window Pricing';
            else if (currentPath.includes('area')) category = 'Area Pricing';
            else if (currentPath.includes('core')) category = 'Base Rates';

            pricingData.push({
              name: readableName,
              price: value,
              unit,
              category
            });
          }
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          findPricingValues(value, currentPath, depth + 1);
        }
      });
    };

    findPricingValues(config);
    return pricingData;
  };

  // Legacy function for compatibility - now uses the generic extraction
  const extractServicePricing = (config: any, serviceId: string) => {
    return extractAllPricingFromConfig(config);
  };

  // Use detailed backup if available, fallback to prop backup
  const displayBackup = detailedBackup || backup;

  // Derive document counts from snapshot if available
  const documentCounts = snapshot ? {
    priceFixCount: snapshot.dataTypes?.priceFix?.count || 0,
    productCatalogCount: snapshot.dataTypes?.productCatalog?.totalCount || 0,
    serviceConfigCount: snapshot.dataTypes?.serviceConfigs?.count || 0
  } : (displayBackup.snapshotMetadata?.documentCounts || { priceFixCount: 0, productCatalogCount: 0, serviceConfigCount: 0 });

  // Calculate sizes from detailed backup metadata (always prefer this over snapshot)
  const sizeInfo = {
    compressedSize: displayBackup.snapshotMetadata?.compressedSize || 0,
    originalSize: displayBackup.snapshotMetadata?.originalSize || 0,
    compressionRatio: displayBackup.snapshotMetadata?.compressionRatio || 0
  };

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '0',
      minWidth: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      overflow: 'hidden',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '24px',
      borderBottom: '1px solid #e5e7eb'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1f2937',
      margin: 0
    },
    subtitle: {
      fontSize: '14px',
      color: '#6b7280',
      marginTop: '4px'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#6b7280',
      padding: '0',
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px'
    },
    tabContainer: {
      display: 'flex',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb'
    },
    tab: {
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: '500',
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      borderBottom: '2px solid transparent',
      transition: 'all 0.2s ease'
    },
    activeTab: {
      color: '#3b82f6',
      borderBottom: '2px solid #3b82f6',
      backgroundColor: 'white'
    },
    inactiveTab: {
      color: '#6b7280',
      borderBottom: '2px solid transparent'
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: '24px'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    infoCard: {
      padding: '16px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    },
    infoLabel: {
      fontSize: '12px',
      fontWeight: '500',
      color: '#6b7280',
      textTransform: 'uppercase',
      marginBottom: '4px'
    },
    infoValue: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1f2937'
    },
    infoSubvalue: {
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '2px'
    },
    section: {
      marginBottom: '32px'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    dataTypeCard: {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '16px'
    },
    dataTypeHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px'
    },
    dataTypeTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1f2937',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    dataTypeCount: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#3b82f6',
      backgroundColor: '#dbeafe',
      padding: '4px 8px',
      borderRadius: '12px'
    },
    dataPreview: {
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      padding: '12px',
      fontSize: '12px',
      fontFamily: 'Monaco, "Lucida Console", monospace',
      color: '#475569',
      maxHeight: '200px',
      overflow: 'auto',
      whiteSpace: 'pre-wrap'
    },
    loadingState: {
      textAlign: 'center',
      padding: '48px 24px',
      color: '#6b7280'
    },
    errorState: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '6px',
      padding: '16px',
      color: '#dc2626',
      marginBottom: '16px'
    },
    warningBox: {
      backgroundColor: '#fef3c7',
      border: '1px solid #fde68a',
      borderRadius: '6px',
      padding: '12px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    warningText: {
      fontSize: '14px',
      color: '#92400e'
    },
    metadataTable: {
      width: '100%',
      borderCollapse: 'collapse',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden'
    },
    metadataRow: {
      borderBottom: '1px solid #f3f4f6'
    },
    metadataLabel: {
      padding: '12px 16px',
      backgroundColor: '#f9fafb',
      fontWeight: '500',
      fontSize: '14px',
      color: '#374151',
      width: '200px',
      borderRight: '1px solid #e5e7eb'
    },
    metadataValue: {
      padding: '12px 16px',
      fontSize: '14px',
      color: '#1f2937'
    },
    compressionBar: {
      width: '100%',
      height: '8px',
      backgroundColor: '#f3f4f6',
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '8px'
    },
    compressionFill: {
      height: '100%',
      backgroundColor: '#10b981',
      borderRadius: '4px'
    },
    // Hierarchical tree styles
    treeItem: {
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      marginBottom: '8px',
      backgroundColor: 'white'
    },
    treeItemHeader: {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      borderRadius: '6px'
    },
    treeItemContent: {
      padding: '0 16px 16px 40px',
      borderTop: '1px solid #f3f4f6'
    },
    expandIcon: {
      marginRight: '8px',
      fontSize: '12px',
      transition: 'transform 0.2s ease',
      color: '#6b7280'
    },
    expandIconExpanded: {
      transform: 'rotate(90deg)'
    },
    hierarchyLevel1: {
      paddingLeft: '0px'
    },
    hierarchyLevel2: {
      paddingLeft: '20px'
    },
    hierarchyLevel3: {
      paddingLeft: '40px'
    },
    priceTag: {
      backgroundColor: '#dcfce7',
      color: '#166534',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
      marginLeft: '8px'
    },
    serviceStatusActive: {
      color: '#166534',
      fontWeight: 'bold'
    },
    serviceStatusInactive: {
      color: '#6b7280',
      fontWeight: 'normal'
    },
    badge: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500'
    }
  };

  const renderOverview = () => (
    <div>
      {/* Key Information Grid */}
      <div style={styles.infoGrid}>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>Change Day</div>
          <div style={styles.infoValue}>{backupUtils.formatChangeDay(displayBackup.changeDay)}</div>
          <div style={styles.infoSubvalue}>{backupUtils.getDaysAgo(displayBackup.changeDay)} days ago</div>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>Backup Size</div>
          <div style={styles.infoValue}>{backupUtils.formatFileSize(sizeInfo.compressedSize)}</div>
          <div style={styles.infoSubvalue}>
            {sizeInfo.compressionRatio > 0 ? backupUtils.formatCompressionRatio(sizeInfo.compressionRatio) : 'No compression data'}
          </div>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>Trigger</div>
          <div style={styles.infoValue}>{backupUtils.formatBackupTrigger(displayBackup.backupTrigger)}</div>
          <div style={styles.infoSubvalue}>
            Created: {displayBackup.createdAt ? backupUtils.formatDate(displayBackup.createdAt) : 'Unknown'}
          </div>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>Status</div>
          <div style={styles.infoValue}>
            {displayBackup.restorationInfo?.hasBeenRestored ? <><FontAwesomeIcon icon={faSync} /> Restored</> : <><FontAwesomeIcon icon={faCheckCircle} /> Available</>}
          </div>
          <div style={styles.infoSubvalue}>
            {displayBackup.restorationInfo?.hasBeenRestored && displayBackup.restorationInfo?.lastRestoredAt ?
              `Last restored: ${backupUtils.formatDate(displayBackup.restorationInfo.lastRestoredAt)}` :
              'Ready for restoration'
            }
          </div>
        </div>
      </div>

      {/* Document Counts */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}><FontAwesomeIcon icon={faChartBar} /> Document Summary</h3>
        <div style={styles.infoGrid}>
          <div style={styles.infoCard}>
            <div style={styles.infoLabel}>PriceFix Records</div>
            <div style={styles.infoValue}>{documentCounts.priceFixCount}</div>
            <div style={styles.infoSubvalue}>Service pricing configurations</div>
          </div>
          <div style={styles.infoCard}>
            <div style={styles.infoLabel}>Product Catalog</div>
            <div style={styles.infoValue}>{documentCounts.productCatalogCount}</div>
            <div style={styles.infoSubvalue}>Product families and items</div>
          </div>
          <div style={styles.infoCard}>
            <div style={styles.infoLabel}>Service Configs</div>
            <div style={styles.infoValue}>{documentCounts.serviceConfigCount}</div>
            <div style={styles.infoSubvalue}>Service configuration templates</div>
          </div>
        </div>
      </div>

      {/* Change Context */}
      {displayBackup.changeContext && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}><FontAwesomeIcon icon={faEdit} /> Change Information</h3>
          <div style={styles.dataTypeCard}>
            <table style={styles.metadataTable}>
              <tbody>
                <tr style={styles.metadataRow}>
                  <td style={styles.metadataLabel}>Description</td>
                  <td style={styles.metadataValue}>
                    {displayBackup.changeContext?.changeDescription || 'No description provided'}
                  </td>
                </tr>
                <tr style={styles.metadataRow}>
                  <td style={styles.metadataLabel}>Areas Changed</td>
                  <td style={styles.metadataValue}>
                    {displayBackup.changeContext?.changedAreas?.join(', ') || 'Not specified'}
                  </td>
                </tr>
                <tr style={styles.metadataRow}>
                  <td style={styles.metadataLabel}>Change Count</td>
                  <td style={styles.metadataValue}>{displayBackup.changeContext?.changeCount || 1} changes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Storage Efficiency */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}><FontAwesomeIcon icon={faHdd} /> Storage Efficiency</h3>
        <div style={styles.dataTypeCard}>
          <table style={styles.metadataTable}>
            <tbody>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>Original Size</td>
                <td style={styles.metadataValue}>
                  {backupUtils.formatFileSize(sizeInfo.originalSize)}
                </td>
              </tr>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>Compressed Size</td>
                <td style={styles.metadataValue}>
                  {backupUtils.formatFileSize(sizeInfo.compressedSize)}
                  {sizeInfo.originalSize > 0 && (
                    <div style={styles.compressionBar}>
                      <div
                        style={{
                          ...styles.compressionFill,
                          width: `${(sizeInfo.compressedSize / sizeInfo.originalSize) * 100}%`
                        }}
                      />
                    </div>
                  )}
                </td>
              </tr>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>Space Saved</td>
                <td style={styles.metadataValue}>
                  {sizeInfo.originalSize > 0 ? (
                    <>
                      {backupUtils.formatFileSize(sizeInfo.originalSize - sizeInfo.compressedSize)} ({Math.round((1 - sizeInfo.compressionRatio) * 100)}%)
                    </>
                  ) : 'No size data available'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (snapshotLoading) {
      return (
        <div style={styles.loadingState}>
          <div>Loading backup content preview...</div>
        </div>
      );
    }

    if (snapshotError) {
      return (
        <div style={styles.errorState}>
          <strong>Error loading content:</strong> {snapshotError}
        </div>
      );
    }

    if (!snapshot) {
      return (
        <div style={styles.loadingState}>
          <div>No content preview available</div>
        </div>
      );
    }

    return (
      <div>
        <div style={styles.warningBox}>
          <FontAwesomeIcon icon={faExclamationTriangle} />
          <span style={styles.warningText}>
            Click on items below to expand and view detailed business data. This shows the complete backup contents.
          </span>
        </div>

        {/* Pricing Summary Section - Show pricing status prominently */}
        <div style={styles.section}>
          <div style={styles.dataTypeCard}>
            <div style={styles.dataTypeHeader}>
              <h4 style={styles.dataTypeTitle}>
                <FontAwesomeIcon icon={faMoneyBill} /> Pricing Overview Summary
              </h4>
            </div>

            <div style={{ padding: '16px' }}>
              {/* Product Pricing Status */}
              {snapshot.dataTypes?.productCatalog?.active && (
                <div style={{ marginBottom: '16px' }}>
                  {(() => {
                    const allProducts = snapshot.dataTypes.productCatalog.active.families?.flatMap(f => f.products || []) || [];
                    const pricedProducts = allProducts.filter(p => p.basePrice?.amount);
                    const totalProducts = allProducts.length;

                    return (
                      <div style={{
                        backgroundColor: pricedProducts.length > 0 ? '#f0fdf4' : '#fef3c7',
                        border: `2px solid ${pricedProducts.length > 0 ? '#10b981' : '#f59e0b'}`,
                        borderRadius: '8px',
                        padding: '16px'
                      }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>
                          <FontAwesomeIcon icon={faBox} /> Product Catalog Pricing:
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: pricedProducts.length > 0 ? '#166534' : '#92400e' }}>
                          {pricedProducts.length > 0 ? (
                            <><FontAwesomeIcon icon={faCheckCircle} /> {pricedProducts.length} of {totalProducts} products have prices set</>
                          ) : (
                            <><FontAwesomeIcon icon={faExclamationTriangle} /> No product prices configured ({totalProducts} products without pricing)</>
                          )}
                        </div>
                        {pricedProducts.length > 0 && (
                          <div style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
                            Products are ready for customer pricing
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Service Pricing Status */}
              <div style={{
                backgroundColor: (() => {
                  // Use the same calculation as in the detailed breakdown
                  const servicesPricingBreakdown = snapshot.dataTypes?.serviceConfigs?.documents?.map(config => {
                    const hasStandardPricing = config.pricing && Object.keys(config.pricing).length > 0 &&
                      Object.values(config.pricing).some(tier => tier?.basePrice?.amount || tier?.price);
                    const servicePricing = extractServicePricing(config, config.serviceId);
                    const hasServicePricing = servicePricing && servicePricing.length > 0;
                    return hasStandardPricing || hasServicePricing;
                  }) || [];

                  const servicesWithAnyPricing = servicesPricingBreakdown.filter(Boolean);
                  const pricingFixCount = snapshot.dataTypes?.priceFix?.count || 0;
                  const hasServicePricing = servicesWithAnyPricing.length > 0 || pricingFixCount > 0;
                  return hasServicePricing ? '#f0fdf4' : '#fef3c7';
                })(),
                border: `2px solid ${(() => {
                  const servicesPricingBreakdown = snapshot.dataTypes?.serviceConfigs?.documents?.map(config => {
                    const hasStandardPricing = config.pricing && Object.keys(config.pricing).length > 0 &&
                      Object.values(config.pricing).some(tier => tier?.basePrice?.amount || tier?.price);
                    const servicePricing = extractServicePricing(config, config.serviceId);
                    const hasServicePricing = servicePricing && servicePricing.length > 0;
                    return hasStandardPricing || hasServicePricing;
                  }) || [];

                  const servicesWithAnyPricing = servicesPricingBreakdown.filter(Boolean);
                  const pricingFixCount = snapshot.dataTypes?.priceFix?.count || 0;
                  const hasServicePricing = servicesWithAnyPricing.length > 0 || pricingFixCount > 0;
                  return hasServicePricing ? '#10b981' : '#f59e0b';
                })()}`,
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>
                  <FontAwesomeIcon icon={faWrench} /> Service Pricing Configuration:
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: (() => {
                    const servicesPricingBreakdown = snapshot.dataTypes?.serviceConfigs?.documents?.map(config => {
                      const hasStandardPricing = config.pricing && Object.keys(config.pricing).length > 0 &&
                        Object.values(config.pricing).some(tier => tier?.basePrice?.amount || tier?.price);
                      const servicePricing = extractServicePricing(config, config.serviceId);
                      const hasServicePricing = servicePricing && servicePricing.length > 0;
                      return hasStandardPricing || hasServicePricing;
                    }) || [];

                    const servicesWithAnyPricing = servicesPricingBreakdown.filter(Boolean);
                    const pricingFixCount = snapshot.dataTypes?.priceFix?.count || 0;
                    const hasServicePricing = servicesWithAnyPricing.length > 0 || pricingFixCount > 0;
                    return hasServicePricing ? '#166534' : '#92400e';
                  })()
                }}>
                  {(() => {
                    // Calculate service pricing more comprehensively
                    const servicesPricingBreakdown = snapshot.dataTypes?.serviceConfigs?.documents?.map(config => {
                      const hasStandardPricing = config.pricing && Object.keys(config.pricing).length > 0 &&
                        Object.values(config.pricing).some(tier => tier?.basePrice?.amount || tier?.price);
                      const servicePricing = extractServicePricing(config, config.serviceId);
                      const hasServicePricing = servicePricing && servicePricing.length > 0;

                      return {
                        serviceId: config.serviceId,
                        hasStandardPricing,
                        hasServicePricing,
                        serviceRateCount: servicePricing?.length || 0,
                        standardTierCount: hasStandardPricing ? Object.keys(config.pricing).length : 0,
                        hasAnyPricing: hasStandardPricing || hasServicePricing
                      };
                    }) || [];

                    const servicesWithAnyPricing = servicesPricingBreakdown.filter(s => s.hasAnyPricing);
                    const pricingFixCount = snapshot.dataTypes?.priceFix?.count || 0;
                    const totalServices = snapshot.dataTypes?.serviceConfigs?.count || 0;

                    if (servicesWithAnyPricing.length > 0 || pricingFixCount > 0) { 
                      return (
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#166534', marginBottom: '8px' }}>
                            <FontAwesomeIcon icon={faCheckCircle} /> {servicesWithAnyPricing.length} services have pricing configured{pricingFixCount > 0 ? ` + ${pricingFixCount} PriceFix services` : ''}
                          </div>
                          <div style={{ fontSize: '14px', color: '#374151' }}>
                            <strong>Service Pricing Details:</strong>
                            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                              {servicesWithAnyPricing.map(service => (
                                <li key={service.serviceId} style={{ marginBottom: '4px' }}>
                                  <strong>{service.serviceId}</strong>:
                                  {service.hasServicePricing && ` ${service.serviceRateCount} rate${service.serviceRateCount !== 1 ? 's' : ''}`}
                                  {service.hasServicePricing && service.hasStandardPricing && ' + '}
                                  {service.hasStandardPricing && ` ${service.standardTierCount} tier${service.standardTierCount !== 1 ? 's' : ''}`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#92400e' }}>
                          <FontAwesomeIcon icon={faExclamationTriangle} /> No service pricing configured - {totalServices} services may not be billable
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hierarchical Product Catalog */}
        {snapshot.dataTypes?.productCatalog && (
          <div style={styles.section}>
            <div style={styles.dataTypeCard}>
              <div style={styles.dataTypeHeader}>
                <h4 style={styles.dataTypeTitle}>
                  <FontAwesomeIcon icon={faBox} /> Product Catalog Hierarchy
                </h4>
                <span style={styles.dataTypeCount}>
                  {snapshot.dataTypes.productCatalog.totalCount} catalogs
                </span>
              </div>

              {snapshot.dataTypes.productCatalog.active ? (
                <div style={styles.hierarchyLevel1}>
                  {/* Main Catalog Level */}
                  <div style={styles.treeItem}>
                    <div
                      style={{
                        ...styles.treeItemHeader,
                        backgroundColor: expandedItems.has('catalog-main') ? '#f8fafc' : 'transparent'
                      }}
                      onClick={() => toggleExpanded('catalog-main')}
                    >
                      <span style={{
                        ...styles.expandIcon,
                        ...(expandedItems.has('catalog-main') ? styles.expandIconExpanded : {})
                      }}>
                        ▶
                      </span>
                      <strong><FontAwesomeIcon icon={faClipboard} /> {snapshot.dataTypes.productCatalog.active.version}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                        <span style={{...styles.badge, backgroundColor: '#dbeafe', color: '#1e40af'}}>
                          {snapshot.dataTypes.productCatalog.active.families?.length || 0} Families
                        </span>
                        {(() => {
                          const allProducts = snapshot.dataTypes.productCatalog.active.families?.flatMap(f => f.products || []) || [];
                          const pricedProducts = allProducts.filter(p => p.basePrice?.amount);
                          const totalProducts = allProducts.length;

                          return pricedProducts.length > 0 ? (
                            <span style={{
                              backgroundColor: '#166534',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>
                              <FontAwesomeIcon icon={faMoneyBill} /> {pricedProducts.length}/{totalProducts} Products Priced
                            </span>
                          ) : (
                            <span style={{
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>
                              <FontAwesomeIcon icon={faExclamationTriangle} /> No Prices Set
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {expandedItems.has('catalog-main') && (
                      <div style={styles.treeItemContent}>
                        <div style={styles.hierarchyLevel2}>
                          <div style={{ marginBottom: '16px', fontSize: '14px', color: '#374151' }}>
                            <div><strong>Catalog ID:</strong> {snapshot.dataTypes.productCatalog.active._id}</div>
                            <div><strong>Version:</strong> {snapshot.dataTypes.productCatalog.active.version}</div>
                            <div><strong>Last Updated:</strong> {new Date(snapshot.dataTypes.productCatalog.active.lastUpdated).toLocaleDateString()}</div>
                          </div>

                          {/* Product Families Level */}
                          {snapshot.dataTypes.productCatalog.active.families?.map((family, familyIndex) => (
                            <div key={familyIndex} style={styles.treeItem}>
                              <div
                                style={{
                                  ...styles.treeItemHeader,
                                  backgroundColor: expandedItems.has(`family-${familyIndex}`) ? '#f0f9ff' : 'transparent'
                                }}
                                onClick={() => toggleExpanded(`family-${familyIndex}`)}
                              >
                                <span style={{
                                  ...styles.expandIcon,
                                  ...(expandedItems.has(`family-${familyIndex}`) ? styles.expandIconExpanded : {})
                                }}>
                                  ▶
                                </span>
                                <strong><FontAwesomeIcon icon={faFolder} /> {family.familyName || family.name || `Family ${familyIndex + 1}`}</strong>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                                  <span style={{...styles.badge, backgroundColor: '#fef3c7', color: '#92400e'}}>
                                    {family.products?.length || 0} Products
                                  </span>
                                  {family.products && family.products.some(p => p.basePrice?.amount) && (
                                    <span style={{
                                      backgroundColor: '#166534',
                                      color: 'white',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      fontWeight: '500'
                                    }}>
                                      <FontAwesomeIcon icon={faMoneyBill} /> Priced Items: {family.products.filter(p => p.basePrice?.amount).length}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {expandedItems.has(`family-${familyIndex}`) && (
                                <div style={styles.treeItemContent}>
                                  <div style={styles.hierarchyLevel3}>
                                    {family.description && (
                                      <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                                        <strong>Description:</strong> {family.description}
                                      </div>
                                    )}

                                    {/* Products Level */}
                                    {family.products?.map((product, productIndex) => (
                                      <div key={productIndex} style={styles.treeItem}>
                                        <div
                                          style={{
                                            ...styles.treeItemHeader,
                                            backgroundColor: expandedItems.has(`product-${familyIndex}-${productIndex}`) ? '#f0fdf4' : 'transparent'
                                          }}
                                          onClick={() => toggleExpanded(`product-${familyIndex}-${productIndex}`)}
                                        >
                                          <span style={{
                                            ...styles.expandIcon,
                                            ...(expandedItems.has(`product-${familyIndex}-${productIndex}`) ? styles.expandIconExpanded : {})
                                          }}>
                                            ▶
                                          </span>
                                          <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'space-between' }}>
                                            <strong><FontAwesomeIcon icon={faBox} /> {product.name || product.productName || `Product ${productIndex + 1}`}</strong>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              {product.basePrice?.amount ? (
                                                <span style={{
                                                  ...styles.priceTag,
                                                  fontSize: '14px',
                                                  fontWeight: 'bold',
                                                  backgroundColor: '#166534',
                                                  color: 'white'
                                                }}>
                                                  <FontAwesomeIcon icon={faMoneyBill} /> ${product.basePrice.amount}/{product.basePrice.uom || 'unit'}
                                                </span>
                                              ) : (
                                                <span style={{
                                                  backgroundColor: '#fef3c7',
                                                  color: '#92400e',
                                                  padding: '4px 8px',
                                                  borderRadius: '4px',
                                                  fontSize: '12px',
                                                  fontWeight: '500'
                                                }}>
                                                  No Price Set
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {expandedItems.has(`product-${familyIndex}-${productIndex}`) && (
                                          <div style={styles.treeItemContent}>
                                            {/* Price prominently displayed at top */}
                                            {product.basePrice?.amount ? (
                                              <div style={{
                                                backgroundColor: '#166534',
                                                color: 'white',
                                                padding: '16px',
                                                borderRadius: '8px',
                                                marginBottom: '16px',
                                                textAlign: 'center',
                                                fontSize: '20px',
                                                fontWeight: 'bold'
                                              }}>
                                                <FontAwesomeIcon icon={faMoneyBill} /> PRICE: ${product.basePrice.amount} {product.basePrice.currency || 'USD'}
                                                <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '4px' }}>
                                                  Per {product.basePrice.uom || 'unit'}
                                                </div>
                                              </div>
                                            ) : (
                                              <div style={{
                                                backgroundColor: '#fef3c7',
                                                color: '#92400e',
                                                padding: '16px',
                                                borderRadius: '8px',
                                                marginBottom: '16px',
                                                textAlign: 'center',
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                border: '2px dashed #f59e0b'
                                              }}>
                                                <FontAwesomeIcon icon={faExclamationTriangle} /> NO PRICE CONFIGURED FOR THIS PRODUCT
                                              </div>
                                            )}

                                            <div style={{ fontSize: '14px', color: '#374151' }}>
                                              {product.description && (
                                                <div style={{ marginBottom: '8px' }}>
                                                  <strong>Description:</strong> {product.description}
                                                </div>
                                              )}
                                              {product.key && (
                                                <div style={{ marginBottom: '8px' }}>
                                                  <strong>Product Key:</strong> {product.key}
                                                </div>
                                              )}
                                              {product.kind && (
                                                <div style={{ marginBottom: '8px' }}>
                                                  <strong>Product Kind:</strong> {product.kind}
                                                </div>
                                              )}
                                              {product.familyKey && (
                                                <div style={{ marginBottom: '8px' }}>
                                                  <strong>Family:</strong> {product.familyKey}
                                                </div>
                                              )}
                                              {product.frequency && (
                                                <div style={{ marginBottom: '8px' }}>
                                                  <strong>Frequency:</strong> {product.frequency}
                                                </div>
                                              )}
                                              {product.basePrice && (
                                                <div style={{ marginBottom: '8px' }}>
                                                  <strong>Pricing Details:</strong>
                                                  <div style={{ marginTop: '4px', fontSize: '13px', color: '#6b7280' }}>
                                                    • Currency: {product.basePrice.currency || 'USD'}
                                                    • Unit of Measure: {product.basePrice.uom || 'unit'}
                                                    {product.basePrice.amount && `• Base Amount: $${product.basePrice.amount}`}
                                                  </div>
                                                </div>
                                              )}
                                              <div style={{ marginBottom: '8px' }}>
                                                <strong>Admin Display:</strong> {product.displayByAdmin ? 'Yes' : 'No'}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  No active product catalog found in this backup.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hierarchical Service Configurations */}
        {snapshot.dataTypes?.serviceConfigs && (
          <div style={styles.section}>
            <div style={styles.dataTypeCard}>
              <div style={styles.dataTypeHeader}>
                <h4 style={styles.dataTypeTitle}>
                  <FontAwesomeIcon icon={faCog} /> Service Configuration Hierarchy
                </h4>
                <span style={styles.dataTypeCount}>
                  {snapshot.dataTypes.serviceConfigs.count} services
                </span>
              </div>

              <div style={{ marginBottom: '16px', fontSize: '14px', color: '#374151' }}>
                <strong>Active Services:</strong> {snapshot.dataTypes.serviceConfigs.activeCount} of {snapshot.dataTypes.serviceConfigs.count} total
              </div>

              {snapshot.dataTypes.serviceConfigs.documents && snapshot.dataTypes.serviceConfigs.documents.length > 0 ? (
                <div style={styles.hierarchyLevel1}>
                  {snapshot.dataTypes.serviceConfigs.documents.map((config, configIndex) => (
                    <div key={configIndex} style={styles.treeItem}>
                      <div
                        style={{
                          ...styles.treeItemHeader,
                          backgroundColor: expandedItems.has(`service-${configIndex}`) ? '#f8fafc' : 'transparent',
                          borderLeft: `4px solid ${config.isActive ? '#10b981' : '#6b7280'}`
                        }}
                        onClick={() => toggleExpanded(`service-${configIndex}`)}
                      >
                        <span style={{
                          ...styles.expandIcon,
                          ...(expandedItems.has(`service-${configIndex}`) ? styles.expandIconExpanded : {})
                        }}>
                          ▶
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <strong style={config.isActive ? styles.serviceStatusActive : styles.serviceStatusInactive}>
                            <FontAwesomeIcon icon={faWrench} /> {config.serviceId}
                          </strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              backgroundColor: config.isActive ? '#dcfce7' : '#f3f4f6',
                              color: config.isActive ? '#166534' : '#6b7280'
                            }}>
                              {config.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                            {(() => {
                              const servicePricing = extractServicePricing(config, config.serviceId);
                              const hasStandardPricing = config.pricing && Object.keys(config.pricing).length > 0;
                              const hasServicePricing = servicePricing && servicePricing.length > 0;

                              if (hasServicePricing || hasStandardPricing) {
                                return (
                                  <span style={{
                                    backgroundColor: '#166534',
                                    color: 'white',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                  }}>
                                    <FontAwesomeIcon icon={faMoneyBill} /> {hasServicePricing ? `${servicePricing.length} Rate${servicePricing.length !== 1 ? 's' : ''}` : ''}{hasServicePricing && hasStandardPricing ? ' + ' : ''}{hasStandardPricing ? `${Object.keys(config.pricing).length} Tier${Object.keys(config.pricing).length !== 1 ? 's' : ''}` : ''}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6b7280' }}>
                            {config.version || 'No version'}
                          </span>
                        </div>
                      </div>

                      {expandedItems.has(`service-${configIndex}`) && (
                        <div style={styles.treeItemContent}>
                          <div style={styles.hierarchyLevel2}>
                            {/* Service Details */}
                            <div style={{ marginBottom: '16px', fontSize: '14px', color: '#374151' }}>
                              {config.description && (
                                <div style={{ marginBottom: '8px' }}>
                                  <strong>Description:</strong> {config.description}
                                </div>
                              )}
                              {config.category && (
                                <div style={{ marginBottom: '8px' }}>
                                  <strong>Category:</strong> {config.category}
                                </div>
                              )}
                              {config.lastUpdated && (
                                <div style={{ marginBottom: '8px' }}>
                                  <strong>Last Updated:</strong> {new Date(config.lastUpdated).toLocaleDateString()}
                                </div>
                              )}
                            </div>

                            {/* Configuration Settings */}
                            {config.settings && Object.keys(config.settings).length > 0 && (
                              <div style={styles.treeItem}>
                                <div
                                  style={{
                                    ...styles.treeItemHeader,
                                    backgroundColor: expandedItems.has(`settings-${configIndex}`) ? '#f0f9ff' : 'transparent'
                                  }}
                                  onClick={() => toggleExpanded(`settings-${configIndex}`)}
                                >
                                  <span style={{
                                    ...styles.expandIcon,
                                    ...(expandedItems.has(`settings-${configIndex}`) ? styles.expandIconExpanded : {})
                                  }}>
                                    ▶
                                  </span>
                                  <strong><FontAwesomeIcon icon={faCog} /> Configuration Settings</strong>
                                  <span style={{...styles.badge, backgroundColor: '#e0e7ff', color: '#3730a3', marginLeft: '12px'}}>
                                    {Object.keys(config.settings).length} Settings
                                  </span>
                                </div>

                                {expandedItems.has(`settings-${configIndex}`) && (
                                  <div style={styles.treeItemContent}>
                                    <div style={styles.hierarchyLevel3}>
                                      {Object.entries(config.settings).map(([key, value]) => (
                                        <div key={key} style={{
                                          padding: '8px 12px',
                                          margin: '4px 0',
                                          backgroundColor: '#f8fafc',
                                          border: '1px solid #e2e8f0',
                                          borderRadius: '4px',
                                          fontSize: '13px'
                                        }}>
                                          <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Service-Specific Pricing Information */}
                            {(() => {
                              const servicePricing = extractServicePricing(config, config.serviceId);
                              const hasStandardPricing = config.pricing && Object.keys(config.pricing).length > 0;
                              const hasServicePricing = servicePricing && servicePricing.length > 0;

                              return (hasStandardPricing || hasServicePricing) && (
                                <div style={styles.treeItem}>
                                  <div
                                    style={{
                                      ...styles.treeItemHeader,
                                      backgroundColor: expandedItems.has(`pricing-${configIndex}`) ? '#f0fdf4' : 'transparent'
                                    }}
                                    onClick={() => toggleExpanded(`pricing-${configIndex}`)}
                                  >
                                    <span style={{
                                      ...styles.expandIcon,
                                      ...(expandedItems.has(`pricing-${configIndex}`) ? styles.expandIconExpanded : {})
                                    }}>
                                      ▶
                                    </span>
                                    <strong><FontAwesomeIcon icon={faMoneyBill} /> Service Pricing Details</strong>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                                      {hasServicePricing && (
                                        <span style={{...styles.badge, backgroundColor: '#dcfce7', color: '#166534'}}>
                                          {servicePricing.length} Rate{servicePricing.length !== 1 ? 's' : ''}
                                        </span>
                                      )}
                                      {hasStandardPricing && (
                                        <span style={{...styles.badge, backgroundColor: '#e0e7ff', color: '#3730a3'}}>
                                          {Object.keys(config.pricing).length} Tier{Object.keys(config.pricing).length !== 1 ? 's' : ''}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {expandedItems.has(`pricing-${configIndex}`) && (
                                    <div style={styles.treeItemContent}>
                                      <div style={styles.hierarchyLevel3}>
                                        {/* Service-Specific Pricing (extracted from config) */}
                                        {hasServicePricing && (
                                          <div style={{ marginBottom: '20px' }}>
                                            <h4 style={{
                                              fontSize: '16px',
                                              fontWeight: '600',
                                              color: '#166534',
                                              marginBottom: '12px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px'
                                            }}>
                                              <FontAwesomeIcon icon={faTags} /> Current Service Rates
                                            </h4>
                                            {(() => {
                                              // Group pricing by category for better organization
                                              const groupedPricing = servicePricing.reduce((groups, item) => {
                                                const category = item.category || 'General Pricing';
                                                if (!groups[category]) groups[category] = [];
                                                groups[category].push(item);
                                                return groups;
                                              }, {} as Record<string, typeof servicePricing>);

                                              return Object.entries(groupedPricing).map(([category, items]) => (
                                                <div key={category} style={{ marginBottom: '16px' }}>
                                                  <div style={{
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    color: '#374151',
                                                    marginBottom: '8px',
                                                    borderBottom: '1px solid #e5e7eb',
                                                    paddingBottom: '4px'
                                                  }}>
                                                    {category}
                                                  </div>
                                                  {items.map((item, index) => (
                                                    <div key={index} style={{
                                                      padding: '16px',
                                                      margin: '6px 0',
                                                      backgroundColor: '#166534',
                                                      color: 'white',
                                                      borderRadius: '8px',
                                                      display: 'flex',
                                                      justifyContent: 'space-between',
                                                      alignItems: 'center',
                                                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                                                    }}>
                                                      <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '15px', fontWeight: 'bold' }}>
                                                          {item.name}
                                                        </div>
                                                        {item.unit && (
                                                          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                                                            {item.unit}
                                                          </div>
                                                        )}
                                                        {item.description && (
                                                          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                                                            {item.description}
                                                          </div>
                                                        )}
                                                      </div>
                                                      <div style={{
                                                        fontSize: '20px',
                                                        fontWeight: 'bold',
                                                        textAlign: 'right',
                                                        marginLeft: '16px'
                                                      }}>
                                                        <FontAwesomeIcon icon={faMoneyBill} /> ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              ));
                                            })()}
                                          </div>
                                        )}

                                        {/* Standard Pricing Tiers (if any) */}
                                        {hasStandardPricing && (
                                          <div>
                                            <h4 style={{
                                              fontSize: '16px',
                                              fontWeight: '600',
                                              color: '#3730a3',
                                              marginBottom: '12px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px'
                                            }}>
                                              <FontAwesomeIcon icon={faClipboard} /> Pricing Tiers
                                            </h4>
                                            {Object.entries(config.pricing).map(([tierKey, tierData]) => (
                                              <div key={tierKey} style={{
                                                padding: '16px',
                                                margin: '6px 0',
                                                backgroundColor: '#3730a3',
                                                color: 'white',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                                              }}>
                                                <div>
                                                  <div style={{ fontSize: '15px', fontWeight: 'bold' }}>
                                                    {tierData?.name || tierKey} Tier
                                                  </div>
                                                  <div style={{ fontSize: '12px', opacity: 0.9 }}>
                                                    {tierData?.basePrice?.uom ? `Per ${tierData.basePrice.uom}` : 'Per service call'}
                                                  </div>
                                                  {tierData?.description && (
                                                    <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                                                      {tierData.description}
                                                    </div>
                                                  )}
                                                </div>
                                                <div style={{
                                                  fontSize: '20px',
                                                  fontWeight: 'bold'
                                                }}>
                                                  <FontAwesomeIcon icon={faMoneyBill} /> ${tierData?.basePrice?.amount || tierData?.price || 'N/A'}
                                                  {tierData?.basePrice?.currency && tierData.basePrice.currency !== 'USD' && (
                                                    <span style={{ fontSize: '14px', marginLeft: '4px' }}>
                                                      {tierData.basePrice.currency}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* No Pricing Available */}
                                        {!hasServicePricing && !hasStandardPricing && (
                                          <div style={{
                                            backgroundColor: '#fef3c7',
                                            border: '2px dashed #f59e0b',
                                            borderRadius: '8px',
                                            padding: '20px',
                                            textAlign: 'center',
                                            color: '#92400e',
                                            fontWeight: 'bold'
                                          }}>
                                            <FontAwesomeIcon icon={faExclamationTriangle} /> No pricing information configured for this service
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  No service configuration details available.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pricing Information */}
        {snapshot.dataTypes?.priceFix && snapshot.dataTypes.priceFix.documents && snapshot.dataTypes.priceFix.documents.length > 0 && (
          <div style={styles.section}>
            <div style={styles.dataTypeCard}>
              <div style={styles.dataTypeHeader}>
                <h4 style={styles.dataTypeTitle}>
                  <FontAwesomeIcon icon={faMoneyBill} /> Service Pricing Information
                </h4>
                <span style={styles.dataTypeCount}>
                  {snapshot.dataTypes.priceFix.count} pricing records
                </span>
              </div>

              <div style={styles.hierarchyLevel1}>
                {snapshot.dataTypes.priceFix.documents.map((pricing, pricingIndex) => (
                  <div key={pricingIndex} style={styles.treeItem}>
                    <div
                      style={{
                        ...styles.treeItemHeader,
                        backgroundColor: expandedItems.has(`pricing-${pricingIndex}`) ? '#f0fdf4' : 'transparent'
                      }}
                      onClick={() => toggleExpanded(`pricing-${pricingIndex}`)}
                    >
                      <span style={{
                        ...styles.expandIcon,
                        ...(expandedItems.has(`pricing-${pricingIndex}`) ? styles.expandIconExpanded : {})
                      }}>
                        ▶
                      </span>
                      <strong><FontAwesomeIcon icon={faMoneyBill} /> {pricing.serviceId || 'Unknown Service'}</strong>
                      {pricing.pricing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                          <span style={{...styles.badge, backgroundColor: '#dcfce7', color: '#166534'}}>
                            {Object.keys(pricing.pricing).length} Pricing Tiers
                          </span>
                          {(() => {
                            const hasValidPricing = Object.values(pricing.pricing).some(tier =>
                              tier?.basePrice?.amount || tier?.price
                            );
                            return hasValidPricing ? (
                              <span style={{
                                backgroundColor: '#166534',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>
                                <FontAwesomeIcon icon={faMoneyBill} /> Prices Configured
                              </span>
                            ) : (
                              <span style={{
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>
                                <FontAwesomeIcon icon={faExclamationTriangle} /> No Prices Set
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {expandedItems.has(`pricing-${pricingIndex}`) && (
                      <div style={styles.treeItemContent}>
                        {pricing.pricing && (
                          <div style={styles.hierarchyLevel2}>
                            {Object.entries(pricing.pricing).map(([tierKey, tierData]) => (
                              <div key={tierKey} style={{
                                padding: '20px',
                                margin: '8px 0',
                                backgroundColor: '#166534',
                                color: 'white',
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                              }}>
                                <div>
                                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                                    {tierData?.name || tierKey} Pricing Tier
                                  </div>
                                  <div style={{ fontSize: '14px', opacity: 0.9 }}>
                                    Service: {pricing.serviceId}
                                  </div>
                                  {tierData?.basePrice?.uom && (
                                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                      Per {tierData.basePrice.uom}
                                    </div>
                                  )}
                                  {tierData?.description && (
                                    <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                                      {tierData.description}
                                    </div>
                                  )}
                                </div>
                                <div style={{
                                  fontSize: '28px',
                                  fontWeight: 'bold'
                                }}>
                                  <FontAwesomeIcon icon={faMoneyBill} /> ${tierData?.basePrice?.amount || tierData?.price || 'N/A'}
                                  {tierData?.basePrice?.currency && tierData.basePrice.currency !== 'USD' && (
                                    <div style={{ fontSize: '14px', marginTop: '4px' }}>
                                      {tierData.basePrice.currency}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMetadata = () => (
    <div>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}><FontAwesomeIcon icon={faWrench} /> Technical Metadata</h3>
        <div style={styles.dataTypeCard}>
          <table style={styles.metadataTable}>
            <tbody>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>Backup ID</td>
                <td style={styles.metadataValue}>{displayBackup.changeDayId}</td>
              </tr>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>Change Day</td>
                <td style={styles.metadataValue}>{displayBackup.changeDay}</td>
              </tr>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>First Change Timestamp</td>
                <td style={styles.metadataValue}>
                  {displayBackup.firstChangeTimestamp ? backupUtils.formatDate(displayBackup.firstChangeTimestamp) : 'Unknown'}
                </td>
              </tr>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>Backup Created</td>
                <td style={styles.metadataValue}>
                  {displayBackup.createdAt ? backupUtils.formatDate(displayBackup.createdAt) : 'Unknown'}
                </td>
              </tr>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>Last Modified</td>
                <td style={styles.metadataValue}>
                  {displayBackup.updatedAt ? backupUtils.formatDate(displayBackup.updatedAt) : 'Unknown'}
                </td>
              </tr>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>Compression Ratio</td>
                <td style={styles.metadataValue}>
                  {sizeInfo.compressionRatio > 0 ? sizeInfo.compressionRatio.toFixed(3) : 'N/A'}
                </td>
              </tr>
              <tr style={styles.metadataRow}>
                <td style={styles.metadataLabel}>Data Types Included</td>
                <td style={styles.metadataValue}>
                  {displayBackup.snapshotMetadata?.includedDataTypes ?
                    Object.entries(displayBackup.snapshotMetadata.includedDataTypes)
                      .filter(([, included]) => included)
                      .map(([type]) => type)
                      .join(', ') || 'None specified'
                    : 'PriceFix, Product Catalog, Service Configs' // Default fallback
                  }
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {displayBackup.restorationInfo?.hasBeenRestored && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}><FontAwesomeIcon icon={faSync} /> Restoration History</h3>
          <div style={styles.dataTypeCard}>
            <table style={styles.metadataTable}>
              <tbody>
                <tr style={styles.metadataRow}>
                  <td style={styles.metadataLabel}>Restoration Status</td>
                  <td style={styles.metadataValue}><FontAwesomeIcon icon={faCheckCircle} /> Previously Restored</td>
                </tr>
                <tr style={styles.metadataRow}>
                  <td style={styles.metadataLabel}>Last Restored Date</td>
                  <td style={styles.metadataValue}>
                    {displayBackup.restorationInfo?.lastRestoredAt ?
                      backupUtils.formatDate(displayBackup.restorationInfo.lastRestoredAt) :
                      'Not available'
                    }
                  </td>
                </tr>
                {displayBackup.restorationInfo?.restorationNotes && (
                  <tr style={styles.metadataRow}>
                    <td style={styles.metadataLabel}>Restoration Notes</td>
                    <td style={styles.metadataValue}>{displayBackup.restorationInfo.restorationNotes}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Backup Details</h2>
            <div style={styles.subtitle}>
              {backupUtils.formatChangeDay(displayBackup.changeDay)} - {backupUtils.formatFileSize(sizeInfo.compressedSize)}
            </div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={styles.tabContainer}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'overview' ? styles.activeTab : styles.inactiveTab)
            }}
            onClick={() => setActiveTab('overview')}
          >
            <FontAwesomeIcon icon={faClipboard} /> Overview
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'content' ? styles.activeTab : styles.inactiveTab)
            }}
            onClick={() => setActiveTab('content')}
          >
            <FontAwesomeIcon icon={faFile} /> Content Preview
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'metadata' ? styles.activeTab : styles.inactiveTab)
            }}
            onClick={() => setActiveTab('metadata')}
          >
            <FontAwesomeIcon icon={faWrench} /> Technical Info
          </button>
        </div>

        <div style={styles.content}>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'content' && renderContent()}
          {activeTab === 'metadata' && renderMetadata()}
        </div>
      </div>
    </div>
  );
};