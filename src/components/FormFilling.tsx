import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faChartLine,
  faCalendarDays,
  faCar,
  faSquareParking,
  faExclamationTriangle,
  faCheckCircle,
  faStar,
  faCircle,
  faCalendarCheck
} from "@fortawesome/free-solid-svg-icons";
import CustomerSection from "./CustomerSection";
import ProductsSection from "./products/ProductsSection";
import type { ProductsSectionHandle } from "./products/ProductsSection";
import "./FormFilling.css";
import { ServicesSection } from "./services/ServicesSection";
import ServicesDataCollector from "./services/ServicesDataCollector";
import type{ ServicesDataHandle } from "./services/ServicesDataCollector";
import { ServicesProvider, useServicesContext } from "./services/ServicesContext";
import ConfirmationModal from "./ConfirmationModal";
import { VersionDialog } from "./VersionDialog";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { pdfApi } from "../backendservice/api";
import { versionApi } from "../backendservice/api/versionApi";
import type { VersionStatus } from "../backendservice/api/versionApi";
import { zohoApi } from "../backendservice/api/zohoApi";
import { useAllServicePricing } from "../backendservice/hooks";
import { createVersionLogFile, hasPriceChanges, getPriceChangeCount, clearPriceChanges, debugFileLogger, getAllVersionLogsForTesting } from "../utils/fileLogger";
import { ServiceAgreement } from "./ServiceAgreement";
import type { ServiceAgreementData } from "./ServiceAgreement/ServiceAgreement";
import type { ServiceAgreementTemplate } from "../backendservice/api/serviceAgreementTemplateApi";
import { REFRESH_POWER_SCRUB_DRAFT_CUSTOM_FIELD_ID } from "./services/refreshPowerScrub/refreshPowerScrubDraftPayload";

type HeaderRow = {
  labelLeft: string;
  valueLeft: string;
  labelRight: string;
  valueRight: string;
};

type ProductsPayload = {
  headers: string[];
  rows: string[][];
  smallProducts?: any[];
  dispensers?: any[];
  bigProducts?: any[];
};

type ProductTotals = {
  monthlyTotal: number;
  contractTotal: number;
};

type GlobalSummary = {
  contractMonths: number;
  tripCharge: number;
  tripChargeFrequency: number;
  parkingCharge: number;
  parkingChargeFrequency: number;
  serviceAgreementTotal: number;
  productMonthlyTotal: number;
  productContractTotal: number;
};

type ServiceLine = {
  type: "line" | "bold" | "atCharge";
  label: string;
  value?: string;
  v1?: string;
  v2?: string;
  v3?: string;
};

type ServiceBlock = {
  heading: string;
  rows: ServiceLine[];
};

type ServicesPayload = {
  topRow: ServiceBlock[];
  bottomRow: ServiceBlock[];
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
};

type PaymentOption = "online" | "cash" | "others";

type AgreementPayload = {
  enviroOf: string;
  customerExecutedOn: string;
  additionalMonths: string;
  paymentOption?: PaymentOption;
  paymentNote?: string;
  startDate?: string; 
};

const PAYMENT_OPTION_DETAILS: { value: PaymentOption; label: string; description: string }[] = [
  {
    value: "online",
    label: "Online Payment",
    description: "Card or portal payment keeps the document on auto-approved Green Line pricing."
  },
  {
    value: "cash",
    label: "Cash Payment",
    description: "Customer will pay cash/check in the field on scheduled visits."
  },
  {
    value: "others",
    label: "Other Payment",
    description: "Custom payment terms require approval and will send this document to Pending Approval."
  },
];

export type FormPayload = {
  headerTitle: string;
  headerRows: HeaderRow[];
  products: ProductsPayload;
  services: ServicesPayload;
  agreement: AgreementPayload;
  summary?: GlobalSummary;
  customColumns?: {
    products: { id: string; label: string }[];
    dispensers: { id: string; label: string }[];
  };
  serviceAgreement?: any; 
};

type LocationState = {
  editing?: boolean;
  id?: string;
  returnPath?: string;
  returnState?: any;
  fromPdfViewer?: boolean; 

  editingVersionId?: string;
  editingVersionFile?: string;
};


const CUSTOMER_FALLBACK_ID = "6918cecbf0b2846a9c562fd6";

const ADMIN_TEMPLATE_ID = "692dc43b3811afcdae0d5547";


type ContractSummaryProps = {
  productTotals?: ProductTotals;
  initialStartDate?: string; 
  onStartDateChange?: (startDate: string) => void; 
};

function ContractSummary({ productTotals, initialStartDate, onStartDateChange }: ContractSummaryProps) {
  const {
    servicesState,
    globalContractMonths,
    setGlobalContractMonths,
    getTotalAgreementAmount,
    getTotalOriginalContractTotal,
    getTotalPerVisitAmount,
    allServicesOneTime,
    globalTripCharge,
    setGlobalTripCharge,
    globalParkingCharge,
    setGlobalParkingCharge,
    globalTripChargeFrequency,
    setGlobalTripChargeFrequency,
    globalParkingChargeFrequency,
    setGlobalParkingChargeFrequency,
  } = useServicesContext();

  const { monthlyTotal: productMonthlyTotal = 0, contractTotal: productContractTotal = 0 } =
    productTotals || {
      monthlyTotal: 0,
      contractTotal: 0,
    };

  const totalAmount = getTotalAgreementAmount();
  const totalCurrentContract = getTotalAgreementAmount();
  const totalOriginalContract = getTotalOriginalContractTotal();
  const totalPerVisit = getTotalPerVisitAmount();
  const CROSS_SERVICE_MIN_PER_VISIT = 50;
  const effectiveTotalAmount = totalAmount > 0 ? Math.max(totalAmount, CROSS_SERVICE_MIN_PER_VISIT) : 0;
  const perVisitMeetsMinimum = totalPerVisit >= CROSS_SERVICE_MIN_PER_VISIT;

  const [pricingIndicator, setpricingIndicator] = useState<'red' | 'green'>('red');
  const [greenLineThreshold, setGreenLineThreshold] = useState(0);
  const [isMonthsDropdownOpen, setIsMonthsDropdownOpen] = useState(false);
  const [isTripFreqDropdownOpen, setIsTripFreqDropdownOpen] = useState(false);
  const [isParkingFreqDropdownOpen, setIsParkingFreqDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tripFreqDropdownRef = useRef<HTMLDivElement>(null);
  const parkingFreqDropdownRef = useRef<HTMLDivElement>(null);


  const [agreementStartDate, setAgreementStartDate] = useState<string>(() => {

    if (initialStartDate) {
      return initialStartDate;
    }
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [expiryStatus, setExpiryStatus] = useState<'yet-to-start' | 'safe' | 'warning' | 'critical' | 'expired'>('safe');


  const handleStartDateChange = (newDate: string) => {
    setAgreementStartDate(newDate);
    onStartDateChange?.(newDate);
  };


  useEffect(() => {
    if (initialStartDate) {
      console.log('📅 [CONTRACT-SUMMARY] Syncing start date from prop:', initialStartDate);
      setAgreementStartDate(initialStartDate);
    }
  }, [initialStartDate]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMonthsDropdownOpen(false);
      }
      if (tripFreqDropdownRef.current && !tripFreqDropdownRef.current.contains(event.target as Node)) {
        setIsTripFreqDropdownOpen(false);
      }
      if (parkingFreqDropdownRef.current && !parkingFreqDropdownRef.current.contains(event.target as Node)) {
        setIsParkingFreqDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  useEffect(() => {
    const threshold = totalOriginalContract * 1.30;
    setGreenLineThreshold(threshold);
    setpricingIndicator(totalCurrentContract > threshold ? 'green' : 'red');
  }, [totalCurrentContract, totalOriginalContract]);


  useEffect(() => {
    if (!agreementStartDate || !globalContractMonths || globalContractMonths <= 0) {
      setExpiryDate(null);
      setDaysRemaining(null);
      setExpiryStatus('safe');
      return;
    }


    const startDate = new Date(agreementStartDate);
    const calculatedExpiryDate = new Date(startDate);
    calculatedExpiryDate.setMonth(calculatedExpiryDate.getMonth() + globalContractMonths);
    setExpiryDate(calculatedExpiryDate);


    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const startDateMidnight = new Date(startDate);
    startDateMidnight.setHours(0, 0, 0, 0);
    const expiryDateMidnight = new Date(calculatedExpiryDate);
    expiryDateMidnight.setHours(0, 0, 0, 0);


    const daysUntilStart = Math.ceil((startDateMidnight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilStart > 0) {

      setDaysRemaining(daysUntilStart);
      setExpiryStatus('yet-to-start' as any);

      console.log('📅 [AGREEMENT TIMELINE] Yet to Start:', {
        startDate: agreementStartDate,
        daysUntilStart,
        status: 'yet-to-start'
      });
      return;
    }


    const timeDiff = expiryDateMidnight.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    setDaysRemaining(daysDiff);


    if (daysDiff < 0) {
      setExpiryStatus('expired'); 
    } else if (daysDiff <= 30) {
      setExpiryStatus('critical'); 
    } else if (daysDiff <= 90) {
      setExpiryStatus('warning'); 
    } else {
      setExpiryStatus('safe'); 
    }

    console.log('📅 [AGREEMENT TIMELINE] Active Agreement:', {
      startDate: agreementStartDate,
      contractMonths: globalContractMonths,
      expiryDate: calculatedExpiryDate.toISOString().split('T')[0],
      daysRemaining: daysDiff,
      status: daysDiff < 0 ? 'expired' : daysDiff <= 30 ? 'critical' : daysDiff <= 90 ? 'warning' : 'safe'
    });
  }, [agreementStartDate, globalContractMonths]);

  const handleContractMonthsChange = (months: number) => {
    setGlobalContractMonths(months);
    setIsMonthsDropdownOpen(false);
  };

  const handleTripChargeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setGlobalTripCharge(value);
    } else if (e.target.value === '') {
      setGlobalTripCharge(0);
    }
  };

  const handleParkingChargeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setGlobalParkingCharge(value);
    } else if (e.target.value === '') {
      setGlobalParkingCharge(0);
    }
  };

  return (
    <div className="contract-summary-section">
      <div className="contract-summary-header">
        <h2>Contract Summary</h2>
      </div>

      {}
      <div className={`pricing-status-banner ${pricingIndicator}-line-banner`}>
        <div className="status-banner-content">
          {pricingIndicator === 'red' ? (
            <>
              <span className="status-icon">
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </span>
              <div className="status-info">
                <div className="status-title">Red Line Pricing</div>
                <div className="status-subtitle">Below 30% above original — requires approval</div>
              </div>
              <div className="status-values">
                <div className="status-value-item">
                  <span className="value-label">Current Contract</span>
                  <span className="value-amount">${totalCurrentContract.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div className="status-divider">≤</div>
                <div className="status-value-item">
                  <span className="value-label">Target (Original ×1.30)</span>
                  <span className="value-amount">${greenLineThreshold.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="status-icon">
                <FontAwesomeIcon icon={faCheckCircle} />
              </span>
              <div className="status-info">
                <div className="status-title">Green Line Pricing</div>
                <div className="status-subtitle">30%+ above original — auto approved</div>
              </div>
              <div className="status-values">
                <div className="status-value-item">
                  <span className="value-label">Current Contract</span>
                  <span className="value-amount">${totalCurrentContract.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div className="status-divider">≥</div>
                <div className="status-value-item">
                  <span className="value-label">Target (Original ×1.30)</span>
                  <span className="value-amount">${greenLineThreshold.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="contract-summary-grid">
        {}
        <div className="contract-card">
          <h3 className="card-title">Contract Details</h3>

          {}
          {!allServicesOneTime && (
          <div className="contract-field-group" ref={dropdownRef}>
            <label htmlFor="global-contract-months" className="contract-label">
              <span className="label-icon">
                <FontAwesomeIcon icon={faCalendarDays} />
              </span>
              Contract Duration
            </label>
            <div className="custom-dropdown">
              <button
                type="button"
                className="custom-dropdown-trigger"
                onClick={() => setIsMonthsDropdownOpen(!isMonthsDropdownOpen)}
                aria-expanded={isMonthsDropdownOpen}
              >
                <span className="dropdown-value">{globalContractMonths} Months</span>
                <svg
                  className={`dropdown-arrow ${isMonthsDropdownOpen ? 'open' : ''}`}
                  width="12"
                  height="8"
                  viewBox="0 0 12 8"
                  fill="none"
                >
                  <path
                    d="M1 1L6 6L11 1"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isMonthsDropdownOpen && (
                <div className="custom-dropdown-menu">
                  <div className="dropdown-options">
                    {Array.from({ length: 35 }, (_, i) => i + 2).map((months) => (
                      <button
                        key={months}
                        type="button"
                        className={`dropdown-option ${globalContractMonths === months ? 'selected' : ''}`}
                        onClick={() => handleContractMonthsChange(months)}
                      >
                        {months} {months === 1 ? 'Month' : 'Months'}
                        {months === 36 && (
                          <span className="recommended-badge">
                            <FontAwesomeIcon icon={faStar} style={{ marginRight: '4px' }} />
                            Recommended
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          {}
          <div className="contract-field-group">
            <label htmlFor="agreement-start-date" className="contract-label">
              <span className="label-icon">
                <FontAwesomeIcon icon={faCalendarDays} />
              </span>
              Agreement Start Date
            </label>
            <input
              id="agreement-start-date"
              type="date"
              value={agreementStartDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="contract-input"
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                width: '100%'
              }}
            />
          </div>

          {}
          {!allServicesOneTime && expiryDate && daysRemaining !== null && (
            <div className="contract-field-group">
              <div className="agreement-timeline-section">
                <div className="timeline-header">
                  <label className="contract-label">
                    <span className="label-icon">
                      <FontAwesomeIcon icon={faCalendarDays} />
                    </span>
                    Agreement Timeline
                  </label>
                </div>

                {}
                <div className={`expiry-status-badge expiry-status-${expiryStatus}`}>
                  <div className="badge-content">
                    <div className="badge-icon">
                      {expiryStatus === 'yet-to-start' && <FontAwesomeIcon icon={faCalendarCheck} />}
                      {expiryStatus === 'expired' && <FontAwesomeIcon icon={faCircle} />}
                      {expiryStatus === 'critical' && <FontAwesomeIcon icon={faCircle} />}
                      {expiryStatus === 'warning' && <FontAwesomeIcon icon={faExclamationTriangle} />}
                      {expiryStatus === 'safe' && <FontAwesomeIcon icon={faCheckCircle} />}
                    </div>
                    <div className="badge-info">
                      <div className="badge-title">
                        {expiryStatus === 'yet-to-start' && 'Yet to Start'}
                        {expiryStatus === 'expired' && 'Inactive'}
                        {expiryStatus === 'critical' && 'Expiring Soon'}
                        {expiryStatus === 'warning' && 'Renewal Approaching'}
                        {expiryStatus === 'safe' && 'Active Agreement'}
                      </div>
                      <div className="badge-subtitle">
                        {expiryStatus === 'yet-to-start'
                          ? `Starts in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`
                          : expiryStatus === 'expired'
                          ? `Inactive from ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? 'day' : 'days'}`
                          : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {}
                <div className="timeline-bar-container">
                  <div className="timeline-bar">
                    <div
                      className={`timeline-progress timeline-progress-${expiryStatus}`}
                      style={{
                        width: expiryStatus === 'yet-to-start'
                          ? '0%'
                          : expiryStatus === 'expired'
                          ? '100%'
                          : `${Math.max(0, Math.min(100, ((globalContractMonths * 30 - daysRemaining) / (globalContractMonths * 30)) * 100))}%`
                      }}
                    />
                  </div>
                  <div className="timeline-labels">
                    <span className="timeline-start">Start: {new Date(agreementStartDate).toLocaleDateString()}</span>
                    <span className="timeline-end">Expires: {expiryDate.toLocaleDateString()}</span>
                  </div>
                </div>

                {}
                <div className="timeline-stats">
                  <div className="timeline-stat">
                    <span className="stat-labels">Total Duration</span>
                    <span className="stat-values">{globalContractMonths} months</span>
                  </div>
                  <div className="timeline-stat">
                    <span className="stat-labels">Days Passed</span>
                    <span className="stat-values">
                      {Math.max(0, (globalContractMonths * 30) - (daysRemaining >= 0 ? daysRemaining : 0))} days
                    </span>
                  </div>
                  <div className="timeline-stat">
                    <span className="stat-labels">Days Remaining</span>
                    <span className={`stat-values stat-${expiryStatus}`}>
                      {daysRemaining >= 0 ? `${daysRemaining} days` : `Expired`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {}
          <div className="contract-field-group">
            <label htmlFor="global-trip-charge" className="contract-label">
              <span className="label-icon">
                <FontAwesomeIcon icon={faCar} />
              </span>
              Trip Charge <span className="label-hint">(per visit)</span>
            </label>
            <div className="charge-input-row">
              <div className="contract-input-with-prefix">
                <span className="input-prefix">$</span>
                <input
                  id="global-trip-charge"
                  type="number"
                  min="0"
                  step="0.01"
                  value={globalTripCharge || ''}
                  onChange={handleTripChargeChange}
                  className="contract-input"
                  placeholder="0.00"
                />
              </div>
              <div className="frequency-dropdown-wrapper" ref={tripFreqDropdownRef}>
                <button
                  type="button"
                  className="frequency-dropdown-trigger"
                  onClick={() => setIsTripFreqDropdownOpen(!isTripFreqDropdownOpen)}
                  aria-expanded={isTripFreqDropdownOpen}
                >
                  <span className="frequency-value">
                    {globalTripChargeFrequency === 0 ? 'One-time' :
                     globalTripChargeFrequency === 4 ? 'Weekly' :
                     globalTripChargeFrequency === 2 ? 'Bi-weekly' :
                     globalTripChargeFrequency === 1 ? 'Monthly' :
                     globalTripChargeFrequency === 0.5 ? 'Every 2 Mo' :
                     globalTripChargeFrequency === 0.33 ? 'Quarterly' :
                     globalTripChargeFrequency === 0.17 ? 'Bi-annually' :
                     globalTripChargeFrequency === 0.08 ? 'Annually' : `${globalTripChargeFrequency}×`}
                  </span>
                  <svg
                    className={`dropdown-arrow ${isTripFreqDropdownOpen ? 'open' : ''}`}
                    width="10"
                    height="6"
                    viewBox="0 0 12 8"
                    fill="none"
                  >
                    <path
                      d="M1 1L6 6L11 1"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {isTripFreqDropdownOpen && (
                  <div className="frequency-dropdown-menu">
                    <div className="frequency-options">
                      {[
                        { value: 0, label: 'One-time', description: 'Single charge' },
                        { value: 4, label: 'Weekly', description: '4× per month' },
                        { value: 2, label: 'Bi-weekly', description: '2× per month' },
                        { value: 1, label: 'Monthly', description: '1× per month' },
                        { value: 0.5, label: 'Every 2 Months', description: '6× per year' },
                        { value: 0.33, label: 'Quarterly', description: '4× per year' },
                        { value: 0.17, label: 'Bi-annually', description: '2× per year' },
                        { value: 0.08, label: 'Annually', description: '1× per year' },
                      ].map((freq) => (
                        <button
                          key={freq.value}
                          type="button"
                          className={`frequency-option ${globalTripChargeFrequency === freq.value ? 'selected' : ''}`}
                          onClick={() => {
                            setGlobalTripChargeFrequency(freq.value);
                            setIsTripFreqDropdownOpen(false);
                          }}
                        >
                          <span className="freq-label">{freq.label}</span>
                          <span className="freq-description">{freq.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {}
          <div className="contract-field-group">
            <label htmlFor="global-parking-charge" className="contract-label">
              <span className="label-icon">
                <FontAwesomeIcon icon={faSquareParking} />
              </span>
              Parking Charge <span className="label-hint">(per visit)</span>
            </label>
            <div className="charge-input-row">
              <div className="contract-input-with-prefix">
                <span className="input-prefix">$</span>
                <input
                  id="global-parking-charge"
                  type="number"
                  min="0"
                  step="0.01"
                  value={globalParkingCharge || ''}
                  onChange={handleParkingChargeChange}
                  className="contract-input"
                  placeholder="0.00"
                />
              </div>
              <div className="frequency-dropdown-wrapper" ref={parkingFreqDropdownRef}>
                <button
                  type="button"
                  className="frequency-dropdown-trigger"
                  onClick={() => setIsParkingFreqDropdownOpen(!isParkingFreqDropdownOpen)}
                  aria-expanded={isParkingFreqDropdownOpen}
                >
                  <span className="frequency-value">
                    {globalParkingChargeFrequency === 0 ? 'One-time' :
                     globalParkingChargeFrequency === 4 ? 'Weekly' :
                     globalParkingChargeFrequency === 2 ? 'Bi-weekly' :
                     globalParkingChargeFrequency === 1 ? 'Monthly' :
                     globalParkingChargeFrequency === 0.5 ? 'Every 2 Mo' :
                     globalParkingChargeFrequency === 0.33 ? 'Quarterly' :
                     globalParkingChargeFrequency === 0.17 ? 'Bi-annually' :
                     globalParkingChargeFrequency === 0.08 ? 'Annually' : `${globalParkingChargeFrequency}×`}
                  </span>
                  <svg
                    className={`dropdown-arrow ${isParkingFreqDropdownOpen ? 'open' : ''}`}
                    width="10"
                    height="6"
                    viewBox="0 0 12 8"
                    fill="none"
                  >
                    <path
                      d="M1 1L6 6L11 1"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {isParkingFreqDropdownOpen && (
                  <div className="frequency-dropdown-menu">
                    <div className="frequency-options">
                      {[
                        { value: 0, label: 'One-time', description: 'Single charge' },
                        { value: 4, label: 'Weekly', description: '4× per month' },
                        { value: 2, label: 'Bi-weekly', description: '2× per month' },
                        { value: 1, label: 'Monthly', description: '1× per month' },
                        { value: 0.5, label: 'Every 2 Months', description: '6× per year' },
                        { value: 0.33, label: 'Quarterly', description: '4× per year' },
                        { value: 0.17, label: 'Bi-annually', description: '2× per year' },
                        { value: 0.08, label: 'Annually', description: '1× per year' },
                      ].map((freq) => (
                        <button
                          key={freq.value}
                          type="button"
                          className={`frequency-option ${globalParkingChargeFrequency === freq.value ? 'selected' : ''}`}
                          onClick={() => {
                            setGlobalParkingChargeFrequency(freq.value);
                            setIsParkingFreqDropdownOpen(false);
                          }}
                        >
                          <span className="freq-label">{freq.label}</span>
                          <span className="freq-description">{freq.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="contract-card">
          <h3 className="card-title">Pricing Breakdown</h3>

          <div className="pricing-breakdown">
            <div className="breakdown-row">
              <span className="breakdown-label">Original Contract Total</span>
              <span className="breakdown-value original">${totalOriginalContract.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Current Contract Total</span>
              <span className="breakdown-value minimum">${totalCurrentContract.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Green Line Target (+30%)</span>
              <span className="breakdown-value target">${greenLineThreshold.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>

            {}
            <div className="breakdown-divider"></div>
            <div className="breakdown-row highlight">
              <span className="breakdown-label">Price Change</span>
              <span className={`breakdown-value profit ${pricingIndicator}`}>
                {totalOriginalContract > 0
                  ? `${(((totalCurrentContract - totalOriginalContract) / totalOriginalContract) * 100).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>

            {}
            {!allServicesOneTime && totalPerVisit > 0 && (
              <>
                <div className="breakdown-divider"></div>
                <div className={`cross-service-minimum-banner ${perVisitMeetsMinimum ? 'meets-minimum' : 'below-minimum'}`}>
                  <div className="cross-min-header">
                    <FontAwesomeIcon
                      icon={perVisitMeetsMinimum ? faCheckCircle : faExclamationTriangle}
                      className="cross-min-icon"
                    />
                    <span className="cross-min-title">Cross-Service Per Visit Minimum</span>
                  </div>
                  <div className="cross-min-rows">
                    <div className="cross-min-row">
                      <span className="cross-min-label">Total Per Visit (all services)</span>
                      <span className={`cross-min-value ${perVisitMeetsMinimum ? 'value-ok' : 'value-warn'}`}>
                        ${totalPerVisit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>
                    <div className="cross-min-row">
                      <span className="cross-min-label">Required Minimum Per Visit</span>
                      <span className="cross-min-value value-target">$50.00</span>
                    </div>
                  </div>
                  <div className={`cross-min-status ${perVisitMeetsMinimum ? 'status-ok' : 'status-warn'}`}>
                    {perVisitMeetsMinimum
                      ? `Meets minimum — $${(totalPerVisit - CROSS_SERVICE_MIN_PER_VISIT).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} above $50.00`
                      : `Below minimum — $${(CROSS_SERVICE_MIN_PER_VISIT - totalPerVisit).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} short of $50.00`
                    }
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {}
      <div className="contract-total-section">
        <div className="total-label">Total Service Agreement Total</div>
        <div className="total-amount">${effectiveTotalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        <div className="total-breakdown">
          Sum of all active service contract totals (includes Refresh Power Scrub cost){!allServicesOneTime && <> across {globalContractMonths} month agreement</>}
          {(globalTripCharge > 0 || globalParkingCharge > 0) && (
            <span className="charges-included">
              {globalTripCharge > 0 && (() => {
                const freqLabel = globalTripChargeFrequency === 0 ? 'One-time' :
                                 globalTripChargeFrequency === 4 ? 'Weekly' :
                                 globalTripChargeFrequency === 2 ? 'Bi-weekly' :
                                 globalTripChargeFrequency === 1 ? 'Monthly' :
                                 globalTripChargeFrequency === 0.5 ? 'Every 2 Mo' :
                                 globalTripChargeFrequency === 0.33 ? 'Quarterly' :
                                 globalTripChargeFrequency === 0.17 ? 'Bi-annually' :
                                 globalTripChargeFrequency === 0.08 ? 'Annually' :
                                 `${globalTripChargeFrequency}×/mo`;
                return globalTripChargeFrequency === 0
                  ? ` + Trip ($${globalTripCharge.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} - ${freqLabel})`
                  : ` + Trip ($${globalTripCharge.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} × ${freqLabel})`;
              })()}
              {globalParkingCharge > 0 && (() => {
                const freqLabel = globalParkingChargeFrequency === 0 ? 'One-time' :
                                 globalParkingChargeFrequency === 4 ? 'Weekly' :
                                 globalParkingChargeFrequency === 2 ? 'Bi-weekly' :
                                 globalParkingChargeFrequency === 1 ? 'Monthly' :
                                 globalParkingChargeFrequency === 0.5 ? 'Every 2 Mo' :
                                 globalParkingChargeFrequency === 0.33 ? 'Quarterly' :
                                 globalParkingChargeFrequency === 0.17 ? 'Bi-annually' :
                                 globalParkingChargeFrequency === 0.08 ? 'Annually' :
                                 `${globalParkingChargeFrequency}×/mo`;
                return globalParkingChargeFrequency === 0
                  ? ` + Parking ($${globalParkingCharge.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} - ${freqLabel})`
                  : ` + Parking ($${globalParkingCharge.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} × ${freqLabel})`;
              })()}
            </span>
          )}
        </div>
      </div>
      <div className="contract-card">
        <h3 className="card-title">Product Totals</h3>

        <div className="pricing-breakdown">
          <div className="breakdown-row">
            <span className="breakdown-label">Monthly Product Total</span>
            <span className="breakdown-value product-monthly">${productMonthlyTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
          {!allServicesOneTime && (
          <div className="breakdown-row">
            <span className="breakdown-label">Products × {globalContractMonths} Months</span>
            <span className="breakdown-value product-contract">${productContractTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}


function FormFillingContent({
  serviceAgreementTemplate,
  templateLoading,
}: {
  serviceAgreementTemplate: ServiceAgreementTemplate | null;
  templateLoading: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: urlId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();


  const locationState = useMemo(() => (location.state ?? {}) as LocationState, [
    location.state?.editing,
    location.state?.id,
    location.state?.returnPath,
    location.state?.fromPdfViewer,
    location.state?.editingVersionId,
    location.state?.editingVersionFile
  ]);

  const [payload, setPayload] = useState<FormPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);


  useEffect(() => {
    console.log("🔄 [LOADING STATE CHANGED]", { loading });
  }, [loading]);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false); 
  const [agreementData, setAgreementData] = useState<ServiceAgreementData | null>(null); 
  const [paymentOption, setPaymentOption] = useState<PaymentOption>("online");
  const [paymentNote, setPaymentNote] = useState<string>("");
  const [includeProductsTable, setIncludeProductsTable] = useState<boolean>(true);


  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versionStatus, setVersionStatus] = useState<VersionStatus | null>(null);
  const [isCheckingVersions, setIsCheckingVersions] = useState(false);
  const [productTotals, setProductTotals] = useState<ProductTotals>({
    monthlyTotal: 0,
    contractTotal: 0,
  });


  const [agreementStartDate, setAgreementStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });


  const {
    servicesState,
    getTotalAgreementAmount,
    getTotalPerVisitAmount,
    getTotalOriginalContractTotal,
    globalContractMonths,
    globalTripCharge,
    globalParkingCharge,
    globalTripChargeFrequency,
    globalParkingChargeFrequency,
    setGlobalContractMonths,
    setGlobalTripCharge,
    setGlobalTripChargeFrequency,
    setGlobalParkingCharge,
    setGlobalParkingChargeFrequency,
  } = useServicesContext();

  const totalCurrentContract = getTotalAgreementAmount();
  const totalOriginalContract = getTotalOriginalContractTotal();

  useEffect(() => {
    if (!payload) return;
    const option = payload.agreement?.paymentOption as PaymentOption | undefined;
    setPaymentOption(option ?? "online");
    setPaymentNote(payload.agreement?.paymentNote ?? "");
    setIncludeProductsTable((payload as any).includeProductsTable !== false);


    if (payload.agreement?.startDate) {
      setAgreementStartDate(payload.agreement.startDate);
    }
  }, [payload]);

  const currentPaymentLabel = PAYMENT_OPTION_DETAILS.find((entry) => entry.value === paymentOption)?.label ?? "Payment Option";


  const calculatePricingStatus = useCallback((): 'red' | 'green' | 'neutral' => {
    const threshold = totalOriginalContract * 1.30;

    if (totalCurrentContract > threshold) {
      return 'green';
    } else {
      return 'red';
    }
  }, [totalCurrentContract, totalOriginalContract]);

  const handleProductTotalsChange = useCallback((totals: ProductTotals) => {
    setProductTotals((prev) => {
      if (
        prev.monthlyTotal === totals.monthlyTotal &&
        prev.contractTotal === totals.contractTotal
      ) {
        return prev;
      }
      return totals;
    });
  }, []);


  useEffect(() => {
    if (!payload?.summary) return;

    const {
      contractMonths,
      tripCharge,
      tripChargeFrequency,
      parkingCharge,
      parkingChargeFrequency,
      productMonthlyTotal,
      productContractTotal,
    } = payload.summary;

    if (contractMonths !== undefined && contractMonths !== null) {
      setGlobalContractMonths(contractMonths);
    }
    if (tripCharge !== undefined && tripCharge !== null) {
      setGlobalTripCharge(tripCharge);
    }
    if (tripChargeFrequency !== undefined && tripChargeFrequency !== null) {
      setGlobalTripChargeFrequency(tripChargeFrequency);
    }
    if (parkingCharge !== undefined && parkingCharge !== null) {
      setGlobalParkingCharge(parkingCharge);
    }
    if (parkingChargeFrequency !== undefined && parkingChargeFrequency !== null) {
      setGlobalParkingChargeFrequency(parkingChargeFrequency);
    }

    setProductTotals((prev) => {
      const monthlyValue = productMonthlyTotal ?? prev.monthlyTotal;
      const contractValue = productContractTotal ?? prev.contractTotal;
      if (monthlyValue === prev.monthlyTotal && contractValue === prev.contractTotal) {
        return prev;
      }
      return {
        monthlyTotal: monthlyValue,
        contractTotal: contractValue,
      };
    });
  }, [
    payload?.summary,
    setGlobalContractMonths,
    setGlobalTripCharge,
    setGlobalTripChargeFrequency,
    setGlobalParkingCharge,
    setGlobalParkingChargeFrequency,
    setProductTotals,
  ]);


  const getDocumentStatus = useCallback((): 'saved' | 'pending_approval' => {
    const pricingStatus = calculatePricingStatus();


    const hasServiceNotes = Object.values(servicesState).some((sd: any) =>
      sd?.isActive && typeof sd.notes === 'string' && sd.notes.trim().length > 0
    );


    const hasCustomFields = Object.values(servicesState).some((sd: any) =>
      sd?.isActive && Array.isArray(sd.customFields) && sd.customFields.length > 0
    );

    const requiresApproval =
      paymentOption === "others" ||
      pricingStatus === 'red' ||
      pricingStatus === 'neutral' ||
      hasServiceNotes ||
      hasCustomFields;

    const status = requiresApproval ? 'pending_approval' : 'saved';
    const reason = paymentOption === "others"
      ? "Payment option requires approval"
      : hasCustomFields
        ? "Custom fields added to service(s)"
        : hasServiceNotes
          ? "Manual notes added to service(s)"
          : pricingStatus === 'red'
            ? "Red Line pricing"
            : pricingStatus === 'neutral'
              ? "Neutral (below green line)"
              : "Green Line pricing";

    console.log(`📋 [STATUS-CALC] Pricing: ${pricingStatus} | Payment: ${paymentOption} → Document Status: ${status} (${reason})`);

    return status;
  }, [calculatePricingStatus, paymentOption, servicesState]);


  const hasChanges = hasPriceChanges();
  const changesCount = getPriceChangeCount();


  console.log(`🔍 [FORMFILLING] File logger status:`, {
    hasChanges,
    changesCount
  });


  debugFileLogger();


  const isInEditMode = location.pathname.startsWith('/edit/pdf');


  const productTab = searchParams.get('productTab') || undefined;
  const serviceTab = searchParams.get('serviceTab') || undefined;


  const productsRef = useRef<ProductsSectionHandle>(null);
  const servicesRef = useRef<ServicesDataHandle>(null);


  const hasInitiallyFetched = useRef(false);
  const previousDocId = useRef<string | null>(null); 


  const handleBack = () => {
    console.log('📍 Edit Form: Handling back navigation', {
      fromPdfViewer: locationState.fromPdfViewer,
      returnPath: locationState.returnPath,
      hasReturnState: !!locationState.returnState
    });


    if (locationState.fromPdfViewer && locationState.returnPath && locationState.returnState) {
      console.log('📍 Edit Form: Returning to PDF viewer with original context');
      navigate('/pdf-viewer', {
        state: {
          ...locationState.returnState,
          fromEdit: true,
          originalReturnPath: locationState.returnPath,
          originalReturnState: locationState.returnState,
        }
      });
      return;
    }


    if (locationState.returnPath && locationState.returnState) {
      console.log('📍 Edit Form: Using return path:', locationState.returnPath);
      navigate(locationState.returnPath, { state: locationState.returnState });
      return;
    }


    if (locationState.returnPath) {
      console.log('📍 Edit Form: Using return path without state:', locationState.returnPath);
      navigate(locationState.returnPath);
      return;
    }


    console.log('📍 Edit Form: Using intelligent fallback navigation');
    const currentUrl = window.location.href;

    if (currentUrl.includes('admin')) {
      navigate('/admin-panel');
    } else {
      navigate('/saved-pdfs');
    }
  };

  useEffect(() => {


    const currentDocId = urlId || locationState.id;


    if (previousDocId.current !== currentDocId) {
      hasInitiallyFetched.current = false;
      previousDocId.current = currentDocId;
      console.log("🔄 [FETCH RESET] Document ID changed, reset hasInitiallyFetched for new document:", currentDocId);
    } else {
      console.log("⏭️ [FETCH SKIP] Same document ID, keeping hasInitiallyFetched:", currentDocId);
    }


    const { editing = false, id } = locationState;

    console.log("🔍 [FORMFILLING DEBUG] Location state values:", {
      editing,
      id,
      locationState,
      urlId,
      currentDocId,
      hasInitiallyFetched: hasInitiallyFetched.current,

      editingVersionId: locationState.editingVersionId,
      editingVersionFile: locationState.editingVersionFile,
      hasVersionInfo: !!(locationState.editingVersionId)
    });


    const agreementId = urlId || id;


    setDocumentId(agreementId || null);
    console.log("🔍 [DOCUMENT ID] Set to agreement ID:", agreementId);

    setIsEditMode(editing || isInEditMode); 


    const useCustomerDoc = (editing || isInEditMode) && !!agreementId;

    const fetchHeaders = async () => {

      if (hasInitiallyFetched.current) {
        console.log('⏭️ [FETCH HEADERS] Skipping duplicate fetch (already loaded)');
        return;
      }

      console.log('🔄 [FETCH HEADERS] Loading document data (should only happen on document change, NOT tab switches):', {
        useCustomerDoc,
        agreementId,
        urlId,
        editing: locationState.editing
      });

      hasInitiallyFetched.current = true; 
      console.log("🔄 [LOADING] Setting loading to TRUE - starting data fetch");
      setLoading(true);
      try {
        let json;

        if (useCustomerDoc) {

          console.log("🔍 [ENDPOINT DEBUG] Loading agreement document for editing:", {
            useCustomerDoc,
            agreementId,
            note: "Always load main agreement - versions are just PDF snapshots"
          });

          console.log("📝 [AGREEMENT EDIT] Loading agreement for editing:", agreementId);
          json = await pdfApi.getCustomerHeaderForEdit(agreementId!);
        } else {

          json = await pdfApi.getAdminHeaderById(ADMIN_TEMPLATE_ID);
        }

        const fromBackend = json.payload ?? json;

        console.log("📋 [FormFilling] Loaded from backend:", {
          isEditMode: useCustomerDoc,
          agreementId,
          endpoint: useCustomerDoc ? 'edit-format' : 'admin-template',
          hasServices: !!fromBackend.services,
          services: fromBackend.services,
          servicesKeys: fromBackend.services ? Object.keys(fromBackend.services) : [],
          hasProducts: !!fromBackend.products,
          productsStructure: fromBackend.products ? Object.keys(fromBackend.products) : []
        });


        const generateTitleFromCustomerName = (headerRows: HeaderRow[]): string => {
          console.log("🔍 [TITLE DEBUG] Searching for customer name in headerRows:", headerRows);


          for (const row of headerRows) {
            console.log("🔍 [TITLE DEBUG] Checking row:", { labelLeft: row.labelLeft, valueLeft: row.valueLeft, labelRight: row.labelRight, valueRight: row.valueRight });


            if (row.labelLeft) {
              const leftLabel = row.labelLeft.toUpperCase();
              if (leftLabel.includes("CUSTOMER NAME") || leftLabel.includes("CUSTOMER") || leftLabel.includes("CLIENT NAME") || leftLabel.includes("COMPANY NAME")) {
                const customerName = row.valueLeft?.trim();
                if (customerName && customerName.length > 0) {
                  console.log("✅ [TITLE DEBUG] Found customer name on left side:", customerName);
                  return customerName;
                }
              }
            }


            if (row.labelRight) {
              const rightLabel = row.labelRight.toUpperCase();
              if (rightLabel.includes("CUSTOMER NAME") || rightLabel.includes("CUSTOMER") || rightLabel.includes("CLIENT NAME") || rightLabel.includes("COMPANY NAME")) {
                const customerName = row.valueRight?.trim();
                if (customerName && customerName.length > 0) {
                  console.log("✅ [TITLE DEBUG] Found customer name on right side:", customerName);
                  return customerName;
                }
              }
            }
          }

          console.log("⚠️ [TITLE DEBUG] No customer name found in headerRows, using fallback");

          return "Customer Update Addendum";
        };


        const dynamicTitle = generateTitleFromCustomerName(fromBackend.headerRows || []);
        const shouldUseBackendTitle = dynamicTitle === "Customer Update Addendum" && fromBackend.headerTitle && fromBackend.headerTitle !== "Customer Update Addendum";
        const finalTitle = shouldUseBackendTitle ? fromBackend.headerTitle : dynamicTitle;

        console.log("🎯 [TITLE DEBUG] Title selection logic:", {
          fromBackendTitle: fromBackend.headerTitle,
          dynamicTitle: dynamicTitle,
          finalTitle: finalTitle
        });

        const cleanPayload: FormPayload = {
          headerTitle: finalTitle,
          headerRows: fromBackend.headerRows ?? [],
          products: fromBackend.products ?? {
            headers: [],
            rows: [],
          },
          services: fromBackend.services ?? {},
          agreement: {
            enviroOf: fromBackend.agreement?.enviroOf ?? "",
            customerExecutedOn:
              fromBackend.agreement?.customerExecutedOn ?? "",
            additionalMonths:
              fromBackend.agreement?.additionalMonths ?? "",
            paymentOption: fromBackend.agreement?.paymentOption, 
            paymentNote: fromBackend.agreement?.paymentNote ?? "",  
            startDate: fromBackend.agreement?.startDate, 
          },
          customColumns: fromBackend.customColumns ?? { products: [], dispensers: [] }, 
          includeProductsTable: (fromBackend as any).includeProductsTable !== false,
          serviceAgreement: fromBackend.serviceAgreement, 
          summary: fromBackend.summary,
        };

        setPayload(cleanPayload);
      } catch (err) {
        console.error("Error fetching headers:", err);
      } finally {
        console.log("🔄 [LOADING] Setting loading to FALSE - data fetch complete");
        setLoading(false);
      }
    };

    fetchHeaders();
  }, [urlId, locationState.editing, locationState.id]); 

  const handleHeaderRowsChange = (rows: HeaderRow[]) => {
    console.log('📝 [HEADER CHANGE] Customer header data updated:', rows);
    setPayload((prev) => (prev ? { ...prev, headerRows: rows } : prev));
  };


  const transformProductsToBackendFormat = (productsData: any) => {
    const { smallProducts, dispensers, bigProducts } = productsData;


    const mergedProducts = [

      ...smallProducts.map((p: any) => ({
        displayName: p.displayName || "",
        qty: p.qty || 0,
        unitPrice: p.unitPrice || 0,
        frequency: p.frequency || "",
        total: p.total || 0,
        customFields: p.customFields || {}, 
      })),

      ...bigProducts.map((b: any) => ({
        displayName: b.displayName || "",
        qty: b.qty || 0,
        amount: b.amount || 0,
        frequency: b.frequency || "",
        total: b.total || 0,
        customFields: b.customFields || {}, 
      }))
    ];

    const transformedDispensers = dispensers.map((d: any) => ({
      displayName: d.displayName || "",
      qty: d.qty || 0,
      warrantyRate: d.warrantyRate || 0,
      replacementRate: d.replacementRate || 0,
      frequency: d.frequency || "",
      total: d.total || 0,
      costType: d.costType || "productCost",
      customFields: d.customFields || {},
    }));


    return {
      products: mergedProducts,  
      dispensers: transformedDispensers,
    };
  };


  const collectFormData = () => {

    const productsData = productsRef.current?.getData() as any || {
      smallProducts: [],
      dispensers: [],
      bigProducts: [],
      customColumns: { products: [], dispensers: [] },
    };

    console.log("📦 Products data from ProductsSection:", productsData);


    const productsForBackend = transformProductsToBackendFormat(productsData);

    console.log("📦 Products transformed for backend (2-category):", productsForBackend);
    console.log("📦 Merged products count:", productsForBackend.products.length);
    console.log("📦 Dispensers count:", productsForBackend.dispensers.length);


    const servicesData = servicesRef.current?.getData() || {
      saniclean: null,
      foamingDrain: null,
      saniscrub: null,
      microfiberMopping: null,
      rpmWindows: null,
      refreshPowerScrub: null,
      sanipod: null,
      carpetclean: null,
      pureJanitorial: null,
      stripwax: null,
    };


    const customerName = extractCustomerName(payload?.headerRows || []);


    const titleForSave = customerName !== "Unnamed_Customer" ? customerName : (payload?.headerTitle || "Customer Update Addendum");

    console.log("💾 [SAVE DEBUG] Title selection for save:", {
      extractedCustomerName: customerName,
      currentPayloadTitle: payload?.headerTitle,
      finalTitleForSave: titleForSave,
      isUsingCustomerName: customerName !== "Unnamed_Customer"
    });

    const servicesWithDraftField = attachRefreshPowerScrubDraftCustomField(servicesData);

    const summary: GlobalSummary = {
      contractMonths: globalContractMonths,
      tripCharge: globalTripCharge,
      tripChargeFrequency: globalTripChargeFrequency,
      parkingCharge: globalParkingCharge,
      parkingChargeFrequency: globalParkingChargeFrequency,
      serviceAgreementTotal: getTotalAgreementAmount(),
      productMonthlyTotal: productTotals.monthlyTotal,
      productContractTotal: productTotals.contractTotal,
    };

    const agreementBase = payload?.agreement || {
      enviroOf: "",
      customerExecutedOn: "",
      additionalMonths: "",
    };

    return {
      headerTitle: titleForSave,
      headerRows: payload?.headerRows || [],
      products: {
        ...productsForBackend,
        smallProducts: productsData.smallProducts,
        bigProducts: productsData.bigProducts,
      },
      services: servicesWithDraftField,
      agreement: {
        ...agreementBase,
        paymentOption,
        paymentNote,
        startDate: agreementStartDate, 
      },
      serviceAgreement: agreementData, 
      customerName, 
      includeProductsTable,
      customColumns: (productsData as any).customColumns || { products: [], dispensers: [] }, 
      summary,
    };
  };

const replaceRefreshPowerScrubWithDraftPayload = (services?: Record<string, any>) => {
  if (!services?.refreshPowerScrub?.draftPayload) return services;
  const { draftPayload, customFields } = services.refreshPowerScrub;
  return {
    ...services,
    refreshPowerScrub: {
      ...draftPayload,
      customFields: customFields ?? [],
    },
  };
};

const stripRefreshPowerScrubDraftMetadata = (services?: Record<string, any>) => {
  if (!services?.refreshPowerScrub?.draftPayload) return services;
  const { draftPayload, ...cleaned } = services.refreshPowerScrub;
  return {
    ...services,
    refreshPowerScrub: cleaned,
  };
};

const attachRefreshPowerScrubDraftCustomField = (services?: Record<string, any>) => {
  const service = services?.refreshPowerScrub;
  if (!service?.draftPayload) return services;

  const draftField = {
    id: REFRESH_POWER_SCRUB_DRAFT_CUSTOM_FIELD_ID,
    name: REFRESH_POWER_SCRUB_DRAFT_CUSTOM_FIELD_ID,
    type: "text",
    value: JSON.stringify(service.draftPayload),
    isInternal: true,
  };

  const customFields = Array.isArray(service.customFields)
    ? [...service.customFields]
    : [];

  const existingIndex = customFields.findIndex(
    (field: any) =>
      field.id === REFRESH_POWER_SCRUB_DRAFT_CUSTOM_FIELD_ID ||
      field.name === REFRESH_POWER_SCRUB_DRAFT_CUSTOM_FIELD_ID
  );

  if (existingIndex >= 0) {
    customFields[existingIndex] = draftField;
  } else {
    customFields.push(draftField);
  }

  return {
    ...services,
    refreshPowerScrub: {
      ...service,
      customFields,
    },
  };
};


  const extractCustomerName = (headerRows: HeaderRow[]): string => {
    for (const row of headerRows) {

      if (row.labelLeft && row.labelLeft.toUpperCase().includes("CUSTOMER NAME")) {
        return row.valueLeft?.trim() || "Unnamed_Customer";
      }

      if (row.labelRight && row.labelRight.toUpperCase().includes("CUSTOMER NAME")) {
        return row.valueRight?.trim() || "Unnamed_Customer";
      }
    }
    return "Unnamed_Customer";
  };


  const handleDraft = async () => {
    if (!payload) return;

    setIsSaving(true);


    const pricingStatus = calculatePricingStatus();
    console.log(`💾 [DRAFT] Pricing status: ${pricingStatus} (Red/Green Line check - drafts always use "draft" status)`);

    const currentFormData = collectFormData();
    const payloadToSend = {
      ...currentFormData, 
      services: replaceRefreshPowerScrubWithDraftPayload(currentFormData.services),
      status: "draft", 

      versionContext: locationState.editingVersionId ? {
        editingVersionId: locationState.editingVersionId,
        editingVersionFile: locationState.editingVersionFile,
        updateVersionStatus: true
      } : undefined
    };

    try {

      if (documentId) {

        await pdfApi.updateCustomerHeader(documentId, payloadToSend);
        console.log("Draft updated successfully for agreement:", documentId);


        if (locationState.editingVersionId) {
          try {
            console.log(`🔄 Attempting to update version PDF status for ID: ${locationState.editingVersionId}`);
            console.log(`🔄 Using proper MVC API: /api/versions/${locationState.editingVersionId}/status`);

            await pdfApi.updateVersionStatus(locationState.editingVersionId, "draft");
            console.log("✅ Version PDF status updated to draft for:", locationState.editingVersionId);
          } catch (statusError) {
            console.error("❌ Failed to update version PDF status:", statusError);
            console.error("❌ Version ID used:", locationState.editingVersionId);
            console.error("❌ Full error:", statusError.response || statusError);

          }
        }

        setToastMessage({ message: "Draft saved successfully!", type: "success" });


        console.log(`📝 [DEBUG] Checking changes before draft save:`, {
          hasChanges,
          changesCount
        });

        const currentHasChanges = hasPriceChanges();
        const currentChangesCount = getPriceChangeCount();
        if (currentHasChanges) {
          try {
            const documentTitle = payloadToSend.headerTitle || 'Untitled Document';
            console.log(`📝 [DRAFT-SAVE] Creating NEW log file with ${currentChangesCount} changes for draft save`);


            await createVersionLogFile({
              agreementId: documentId,
              versionId: locationState.editingVersionId || documentId, 
              versionNumber: locationState.editingVersionId ? undefined : 1, 
              salespersonId: 'salesperson_001', 
              salespersonName: 'Sales Person', 
              saveAction: 'save_draft',
              documentTitle,
            }, {
              overwriteExisting: false, 
              overwriteReason: undefined 
            });

            console.log(`✅ [DRAFT-SAVE] Successfully created NEW log file and cleared changes`);
          } catch (logError) {
            console.error('❌ [DRAFT-SAVE] Failed to create log file:', logError);

          }
        }
      } else {

        const result = await pdfApi.createCustomerHeader(payloadToSend);
        const newId = result.data?._id || result.data?.id || result.headers["x-customerheaderdoc-id"];
        setDocumentId(newId);
        console.log("Draft created successfully with ID:", newId);
        setToastMessage({ message: "Draft saved successfully!", type: "success" });


        const currentHasChanges = hasPriceChanges();
        const currentChangesCount = getPriceChangeCount();
        if (currentHasChanges && newId) {
          try {
            const documentTitle = payloadToSend.headerTitle || 'Untitled Document';
            console.log(`📝 [DRAFT-CREATE] Creating NEW log file with ${currentChangesCount} changes for new draft`);


            await createVersionLogFile({
              agreementId: newId,
              versionId: newId, 
              versionNumber: 1, 
              salespersonId: 'salesperson_001', 
              salespersonName: 'Sales Person', 
              saveAction: 'save_draft',
              documentTitle,
            }, {
              overwriteExisting: false, 
              overwriteReason: undefined 
            });

            console.log(`✅ [DRAFT-CREATE] Successfully created NEW log file and cleared changes`);
          } catch (logError) {
            console.error('❌ [DRAFT-CREATE] Failed to create log file:', logError);

          }
        } else {
          console.log(`ℹ️ [DRAFT-CREATE] No changes to log (hasChanges: ${currentHasChanges}, newId: ${newId})`);
        }
      }
    } catch (err) {
      console.error("Error saving draft:", err);
      setToastMessage({ message: "Failed to save draft. Please try again.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };


  const handleSave = async () => {
    if (!payload) return;

    setIsSaving(true);
    setShowSaveModal(false);


    if (!documentId) {
      console.log("💾 [SAVE] New document - delegating to handleNormalSave");
      await handleNormalSave();
      return;
    }

    console.log("💾 [SAVE] Starting save process for agreement:", documentId);

    try {

      const documentStatus = getDocumentStatus();
      const pricingStatus = calculatePricingStatus();

      console.log(`💰 [PRICING-CHECK] Pricing: ${pricingStatus.toUpperCase()}, Status: ${documentStatus}`);
      if (documentStatus === 'pending_approval') {
        console.log(`⚠️ [APPROVAL-REQUIRED] Red Line pricing detected - document will require approval`);
      } else {
        console.log(`✅ [AUTO-APPROVED] Green Line pricing - document auto-approved`);
      }


      const currentFormData = collectFormData();
      const payloadToSend = {
        ...currentFormData,
        services: stripRefreshPowerScrubDraftMetadata(currentFormData.services),
        status: documentStatus, 
      };

      console.log(`📤 [UPDATE-PAYLOAD] Sending to backend:`, {
        status: payloadToSend.status,
        headerTitle: payloadToSend.headerTitle,
        documentId,
        fullPayload: payloadToSend
      });


      const updateResponse = await pdfApi.updateCustomerHeader(documentId, payloadToSend);
      console.log("✅ [SAVE] Agreement data updated successfully:", {
        response: updateResponse,
        sentStatus: payloadToSend.status,
        responseStatus: updateResponse?.data?.status || updateResponse?.status
      });


      setIsCheckingVersions(true);
      const status = await versionApi.checkVersionStatus(documentId);
      setVersionStatus(status);
      setIsCheckingVersions(false);


      if (status.isFirstTime) {

        console.log("🎯 [FIRST TIME] Auto-creating v1");
        await handleCreateFirstVersion();
      } else {

        console.log("📋 [SUBSEQUENT] Showing version dialog for user choice");

        setIsSaving(false);
        setShowVersionDialog(true);
      }

    } catch (err: any) {
      console.error("❌ [SAVE ERROR] Failed to save agreement:", err);
      setToastMessage({
        message: err.response?.data?.message || "Failed to save agreement. Please try again.",
        type: "error"
      });
      setIsSaving(false);
      setIsCheckingVersions(false);
    }
  };


  const handleCreateFirstVersion = async () => {
    if (!documentId) return;

    try {
      setIsSaving(true);


      console.log("📝 [FIRST VERSION] Creating v1 PDF for agreement:", documentId);


      const result = await versionApi.createVersion(documentId, {
        changeNotes: "Initial version",
        replaceRecent: false,
        isFirstTime: true
      });

      console.log("✅ [FIRST VERSION SUCCESS] v1 created successfully:", result);


      const currentHasChanges = hasPriceChanges();
      const currentChangesCount = getPriceChangeCount();
      if (currentHasChanges && result.version?.id) {
        try {
          console.log(`📝 [FIRST-VERSION-PDF] Creating log file with ${currentChangesCount} changes for first version PDF`);

          await createVersionLogFile({
            agreementId: documentId,
            versionId: result.version.id,
            versionNumber: result.version.versionNumber || 1,
            salespersonId: 'salesperson_001', 
            salespersonName: 'Sales Person', 
            saveAction: 'generate_pdf',
            documentTitle: payload?.headerTitle || 'Untitled Document',
          });

          console.log(`✅ [FIRST-VERSION-PDF] Successfully created log file and cleared changes`);
        } catch (logError) {
          console.error('❌ [FIRST-VERSION-PDF] Failed to create log file:', logError);

        }
      }


      const documentStatus = getDocumentStatus();
      const pricingStatus = calculatePricingStatus();

      if (documentStatus === 'pending_approval') {
        setToastMessage({
          message: `PDF created successfully! ${pricingStatus === 'red' ? '⚠️ Red Line pricing' : '⚠️ Pricing below threshold'} - pending approval before finalization.`,
          type: "warning"
        });
        zohoApi.createAutoApprovalTask(documentId, payload?.headerTitle || 'Agreement').catch(() => {});
      } else {
        setToastMessage({
          message: "First version (v1) created and approved successfully! ✅ Green Line pricing.",
          type: "success"
        });
      }


      setTimeout(() => {
        navigate("/saved-pdfs");
      }, 1500);

    } catch (err: any) {
      console.error("❌ [FIRST VERSION ERROR] Failed to create v1:", err);
      setToastMessage({
        message: err.response?.data?.message || "Failed to create first version. Please try again.",
        type: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };


  const handleNormalSave = async () => {

    const documentStatus = getDocumentStatus();
    const pricingStatus = calculatePricingStatus();

    console.log(`💰 [NEW-DOC-PRICING] Pricing: ${pricingStatus.toUpperCase()}, Status: ${documentStatus}`);
    if (documentStatus === 'pending_approval') {
      console.log(`⚠️ [NEW-DOC-APPROVAL] Red/Neutral Line pricing - document will require approval`);
    } else {
      console.log(`✅ [NEW-DOC-APPROVED] Green Line pricing - document auto-approved`);
    }

    const currentFormData = collectFormData();
    const payloadToSend = {
      ...currentFormData,
      services: stripRefreshPowerScrubDraftMetadata(currentFormData.services),
      status: documentStatus, 
    };


    console.log("📤 [FormFilling] COMPLETE PAYLOAD BEING SENT TO BACKEND:");
    console.log(JSON.stringify(payloadToSend, null, 2));

    try {
      if (documentId) {


        console.log("⚠️ [SAVE] Existing document should use version system, not normal save");
        await handleSave(); 
        return;
      } else {

        const result = await pdfApi.createCustomerHeader(payloadToSend);

        console.log("🔍 [NEW DOCUMENT] Full createCustomerHeader response:", result);


        const newId = result.data?._id ||
                     result.data?.id ||
                     result.headers["x-customerheaderdoc-id"] ||
                     result.headers["X-CustomerHeaderDoc-Id"];

        console.log("🔍 [NEW DOCUMENT] Extracted ID:", newId);
        console.log("🔍 [NEW DOCUMENT] Response data:", result.data);

        if (!newId) {
          console.error("❌ [NEW DOCUMENT] Failed to extract document ID from response");
          throw new Error("Failed to get document ID from server response.");
        }

        setDocumentId(newId);

        console.log("✅ [NEW DOCUMENT] Agreement created successfully:", newId);
        console.log("🎯 [NEW DOCUMENT] Now auto-creating v1...");


        const versionResult = await versionApi.createVersion(newId, {
          changeNotes: "Initial version",
          replaceRecent: false,
          isFirstTime: true
        });

        console.log("✅ [NEW DOCUMENT] v1 created successfully:", versionResult);


        const currentHasChanges = hasPriceChanges();
        const currentChangesCount = getPriceChangeCount();
        if (currentHasChanges && versionResult.version?.id) {
          try {
            const documentTitle = payloadToSend.headerTitle || 'Untitled Document';
            console.log(`📝 [NEW-DOCUMENT-PDF] Creating log file with ${currentChangesCount} changes for new document first version`);

            await createVersionLogFile({
              agreementId: newId,
              versionId: versionResult.version.id,
              versionNumber: versionResult.version.versionNumber || 1,
              salespersonId: 'salesperson_001', 
              salespersonName: 'Sales Person', 
              saveAction: 'generate_pdf',
              documentTitle,
            });

            console.log(`✅ [NEW-DOCUMENT-PDF] Successfully created log file and cleared changes`);
          } catch (logError) {
            console.error('❌ [NEW-DOCUMENT-PDF] Failed to create log file:', logError);

          }
        }


        if (documentStatus === 'pending_approval') {
          setToastMessage({
            message: `Agreement created! ${pricingStatus === 'red' ? '⚠️ Red Line pricing' : '⚠️ Pricing below threshold'} - pending approval before finalization.`,
            type: "warning"
          });
          zohoApi.createAutoApprovalTask(newId, payloadToSend.headerTitle || 'Agreement').catch(() => {});
        } else {
          setToastMessage({
            message: "Agreement created and approved successfully! ✅ Green Line pricing.",
            type: "success"
          });
        }


        setTimeout(() => {
          navigate("/saved-pdfs");
        }, 1500);
      }
    } catch (err: any) {
      console.error("❌ [SAVE ERROR] Error saving document:", err);


      setToastMessage({
        message: err.response?.data?.message || "Failed to save document. Please try again.",
        type: "error"
      });
    }
  };


  const handleCreateVersion = async (replaceRecent: boolean, changeNotes: string) => {
    if (!documentId) return;

    try {
      setIsSaving(true);

      console.log("📝 [VERSION CREATE] Creating PDF version for agreement:", documentId);


      const result = await versionApi.createVersion(documentId, {
        changeNotes,
        replaceRecent, 
        isFirstTime: false
      });

      console.log("✅ [VERSION SUCCESS] Version created successfully:", result);


      const currentHasChanges = hasPriceChanges();
      const currentChangesCount = getPriceChangeCount();
      if (currentHasChanges && result.version?.id) {
        try {
          console.log(`📝 [VERSION-PDF] Creating log file with ${currentChangesCount} changes for version ${result.version.versionNumber}`);

          await createVersionLogFile({
            agreementId: documentId,
            versionId: result.version.id,
            versionNumber: result.version.versionNumber || 1,
            salespersonId: 'salesperson_001', 
            salespersonName: 'Sales Person', 
            saveAction: 'generate_pdf',
            documentTitle: payload?.headerTitle || 'Untitled Document',
          });

          console.log(`✅ [VERSION-PDF] Successfully created log file and cleared changes`);
        } catch (logError) {
          console.error('❌ [VERSION-PDF] Failed to create log file:', logError);

        }
      }


      const documentStatus = getDocumentStatus();
      const pricingStatus = calculatePricingStatus();

      if (documentStatus === 'pending_approval') {
        setToastMessage({
          message: replaceRecent
            ? `Current version replaced! ${pricingStatus === 'red' ? '⚠️ Red Line pricing' : '⚠️ Pricing below threshold'} - pending approval.`
            : `Version ${result.version?.versionNumber} created! ${pricingStatus === 'red' ? '⚠️ Red Line pricing' : '⚠️ Pricing below threshold'} - pending approval.`,
          type: "warning"
        });
        zohoApi.createAutoApprovalTask(documentId, payload?.headerTitle || 'Agreement').catch(() => {});
      } else {
        setToastMessage({
          message: replaceRecent
            ? `Current version replaced and approved successfully! ✅ Green Line pricing.`
            : `Version ${result.version?.versionNumber} created and approved successfully! ✅ Green Line pricing.`,
          type: "success"
        });
      }

      setShowVersionDialog(false);
      setVersionStatus(null);


      setTimeout(() => {
        navigate("/saved-pdfs");
      }, 1500);

    } catch (err: any) {
      console.error("❌ [VERSION ERROR] Failed to create version:", err);
      setToastMessage({
        message: err.response?.data?.message || "Failed to create version. Please try again.",
        type: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };


  const safeParseFloat = (value: string | undefined): number | undefined => {
    if (!value || value.trim() === "") return undefined;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  };

  const safeParseInt = (value: string | undefined): number | undefined => {
    if (!value || value.trim() === "") return undefined;
    const parsed = parseInt(value);
    return isNaN(parsed) ? undefined : parsed;
  };


  const extractProductsFromBackend = () => {
    const products = payload?.products;
    if (!products) {
      return {
        smallProducts: undefined,
        dispensers: undefined,
        bigProducts: undefined,
      };
    }

    console.log("🔍 [extractProductsFromBackend] Raw products data:", products);


    if (products.products && products.dispensers) {
      console.log("✅ [extractProductsFromBackend] Using edit-format structure");


      const extractedProducts = products.products.map((p: any) => {
        const name = p.displayName || p.customName || p.productName || p.productKey || "";
        const productType = p._productType || (p.unitPrice ? 'small' : 'big');

        if (productType === 'small') {
          return {
            name,
            unitPrice: safeParseFloat(String(p.unitPrice || "")),
            qty: safeParseInt(String(p.qty || "")),
            frequency: p.frequency || "", 
            total: safeParseFloat(String(p.total || "")),
            customFields: p.customFields || {}, 
          };
        } else {
          return {
            name,
            qty: safeParseInt(String(p.qty || "")),
            amount: safeParseFloat(String(p.amount || "")),
            frequency: p.frequency || "", 
            total: safeParseFloat(String(p.total || "")),
            customFields: p.customFields || {}, 
          };
        }
      });


      const smallProducts = extractedProducts.filter(p => 'unitPrice' in p);
      const bigProducts = extractedProducts.filter(p => 'amount' in p);


      const extractedDispensers = products.dispensers.map((d: any) => {
        const name = d.displayName || d.customName || d.productName || d.productKey || "";
        return {
          name,
          qty: safeParseInt(String(d.qty || "")),
          warrantyRate: safeParseFloat(String(d.warrantyRate || "")),
          replacementRate: safeParseFloat(String(d.replacementRate || "")),
          frequency: d.frequency || "",
          costType: d.costType || "productCost",
          total: safeParseFloat(String(d.total || "")),
          customFields: d.customFields || {},
        };
      });

      console.log("✅ [extractProductsFromBackend] Extracted data:", {
        smallProducts: smallProducts.length,
        bigProducts: bigProducts.length,
        dispensers: extractedDispensers.length,
        dispenserFrequencies: extractedDispensers.map(d => ({ name: d.name, frequency: d.frequency })),
        customFieldsDebug: {
          smallProductsWithCustomFields: smallProducts.filter(p => p.customFields && Object.keys(p.customFields).length > 0),
          bigProductsWithCustomFields: bigProducts.filter(p => p.customFields && Object.keys(p.customFields).length > 0),
          dispensersWithCustomFields: extractedDispensers.filter(d => d.customFields && Object.keys(d.customFields).length > 0)
        }
      });

      return {
        smallProducts: smallProducts.length > 0 ? smallProducts : undefined,
        dispensers: extractedDispensers.length > 0 ? extractedDispensers : undefined,
        bigProducts: bigProducts.length > 0 ? bigProducts : undefined,
      };
    }


    if (products.smallProducts || products.dispensers || products.bigProducts) {
      console.log("⚠️ [extractProductsFromBackend] Using legacy 3-array structure");


      const extractProductData = (productArray: any[], type: 'small' | 'dispenser' | 'big') => {
        return productArray.map((p: any) => {

          const name = p.displayName || p.productName || p.customName || p.productKey || "";

          if (type === 'small') {
            return {
              name,
              unitPrice: safeParseFloat(String(p.unitPrice || p.unitPriceOverride || p.amountPerUnit || p.amount || "")),
              qty: safeParseInt(String(p.qty || p.quantity || "")),
              frequency: p.frequency || "",
              total: safeParseFloat(String(p.total || p.totalOverride || p.lineTotal || p.extPrice || "")),
            };
          } else if (type === 'dispenser') {
            return {
              name,
              qty: safeParseInt(String(p.qty || p.quantity || "")),
              warrantyRate: safeParseFloat(String(p.warrantyRate || p.warrantyPriceOverride || p.warranty || "")),
              replacementRate: safeParseFloat(String(p.replacementRate || p.replacementPriceOverride || p.replacement || "")),
              frequency: p.frequency || "",
              costType: p.costType || "productCost",
              total: safeParseFloat(String(p.total || p.totalOverride || p.lineTotal || p.extPrice || "")),
            };
          } else { 
            return {
              name,
              qty: safeParseInt(String(p.qty || p.quantity || "")),
              amount: safeParseFloat(String(p.amount || p.amountPerUnit || p.unitPriceOverride || p.unitPrice || "")),
              frequency: p.frequency || "",
              total: safeParseFloat(String(p.total || p.totalOverride || p.lineTotal || p.extPrice || "")),
            };
          }
        });
      };

      return {
        smallProducts: products.smallProducts ? extractProductData(products.smallProducts, 'small') : undefined,
        dispensers: products.dispensers ? extractProductData(products.dispensers, 'dispenser') : undefined,
        bigProducts: products.bigProducts ? extractProductData(products.bigProducts, 'big') : undefined,
      };
    }


    const rows = products.rows;
    if (!rows || rows.length === 0) {
      return {
        smallProducts: undefined,
        dispensers: undefined,
        bigProducts: undefined,
      };
    }

    const smallProducts: any[] = [];
    const dispensers: any[] = [];
    const bigProducts: any[] = [];

    rows.forEach((row: string[]) => {

      if (row[0] && row[0].trim() !== "") {
        smallProducts.push({
          name: row[0],
          unitPrice: safeParseFloat(row[1]),
          frequency: row[2] || "",
          qty: safeParseInt(row[3]),
          total: safeParseFloat(row[4]),
        });
      }


      if (row[5] && row[5].trim() !== "") {
        dispensers.push({
          name: row[5],
          qty: safeParseInt(row[6]),
          warrantyRate: safeParseFloat(row[7]),
          replacementRate: safeParseFloat(row[8]),
          frequency: row[9] || "",
          total: safeParseFloat(row[10]),
        });
      }


      if (row[11] && row[11].trim() !== "") {
        bigProducts.push({
          name: row[11],
          qty: safeParseInt(row[12]),
          amount: safeParseFloat(row[13]),
          frequency: row[14] || "",
          total: safeParseFloat(row[15]),
        });
      }
    });

    return {
      smallProducts: smallProducts.length > 0 ? smallProducts : undefined,
      dispensers: dispensers.length > 0 ? dispensers : undefined,
      bigProducts: bigProducts.length > 0 ? bigProducts : undefined,
    };
  };


  const extractedProducts = useMemo(() => {

    if (!isEditMode) {
      return { smallProducts: undefined, dispensers: undefined, bigProducts: undefined };
    }


    if (!payload?.products) return { smallProducts: undefined, dispensers: undefined, bigProducts: undefined };
    return extractProductsFromBackend();
  }, [payload?.products, isEditMode]);

  console.log("📦 Initial products extracted from payload:", {
    isEditMode,
    extractedProducts,
    rawProductRows: payload?.products?.rows
  });

  console.log("🔧 Services being passed to ServicesSection:", {
    hasPayload: !!payload,
    servicesData: payload?.services,
    servicesKeys: payload?.services ? Object.keys(payload.services) : []
  });

  return (
    <div className={`center-align ${isInEditMode ? 'edit-mode-container' : ''}`}>
      {isInEditMode && (
        <div className="edit-mode-header">
          <button
            type="button"
            className="edit-back-button"
            onClick={handleBack}
            title="Go back"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back</span>
          </button>
        </div>
      )}

        {}
        {loading && (
          <div className="formfilling__loading-overlay" role="status" aria-live="polite">
            {console.log("🎨 [RENDERING] Loading overlay is being rendered - loading state is TRUE")}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
              <div className="formfilling__spinner">
                <span className="formfilling__sr-only">Loading form data…</span>
              </div>
              <div style={{
                color: 'white',
                fontSize: '20px',
                fontWeight: '600',
                textAlign: 'center',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}>
                Loading Agreement Data...
              </div>
            </div>
          </div>
        )}
        {console.log("🎨 [RENDERING] Loading overlay check - loading state:", loading)}

        {}
        {loading && (
          <div className="formfilling__skeleton" style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '28px',
            minHeight: '2600px'
          }}>
            {}
            <div style={{
              minHeight: '250px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px',
              display: 'flex',
              gap: '20px'
            }}>
              <div style={{
                width: '150px',
                height: '100px',
                background: '#e5e7eb',
                borderRadius: '8px',
                flexShrink: 0
              }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{
                    height: '32px',
                    background: '#e5e7eb',
                    borderRadius: '4px'
                  }} />
                ))}
              </div>
            </div>

            {}
            <div style={{
              minHeight: '600px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px'
            }}>
              <div style={{
                height: '40px',
                background: '#c00000',
                marginBottom: '20px',
                borderRadius: '4px'
              }} />
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} style={{
                    height: '40px',
                    background: '#e5e7eb',
                    borderRadius: '4px'
                  }} />
                ))}
              </div>
            </div>

            {}
            <div style={{
              minHeight: '700px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px'
            }}>
              <div style={{
                height: '40px',
                background: '#c00000',
                marginBottom: '20px',
                borderRadius: '4px'
              }} />
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {Array.from({ length: 15 }).map((_, i) => (
                  <div key={i} style={{
                    height: '40px',
                    background: '#e5e7eb',
                    borderRadius: '4px'
                  }} />
                ))}
              </div>
            </div>

            {}
            <div style={{
              minHeight: '300px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px'
            }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{
                  height: '48px',
                  background: '#e5e7eb',
                  borderRadius: '4px',
                  marginBottom: '12px'
                }} />
              ))}
            </div>

            {}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              marginTop: '20px'
            }}>
              <div style={{
                width: '150px',
                height: '48px',
                background: '#e5e7eb',
                borderRadius: '8px'
              }} />
              <div style={{
                width: '200px',
                height: '48px',
                background: '#e5e7eb',
                borderRadius: '8px'
              }} />
            </div>
          </div>
        )}

        {isSaving && (
          <div className="formfilling__saving-overlay" role="status" aria-live="polite">
            <div className="formfilling__spinner">
              <span className="formfilling__sr-only">Saving agreement data…</span>
            </div>
          </div>
        )}

        {payload && (
          <div style={{

            minHeight: '2600px',

            padding: '20px'
          }}>
            <CustomerSection
              headerTitle={payload.headerTitle}
              headerRows={payload.headerRows}
              onHeaderRowsChange={handleHeaderRowsChange}
            />

            <ProductsSection
              ref={productsRef}
              initialSmallProducts={extractedProducts.smallProducts}
              initialDispensers={extractedProducts.dispensers}
              initialBigProducts={extractedProducts.bigProducts}
              initialCustomColumns={payload?.products?.customColumns}
              activeTab={productTab}
              onTabChange={(tab) => {
                const newParams = new URLSearchParams(searchParams);
                if (tab) {
                  newParams.set('productTab', tab);
                } else {
                  newParams.delete('productTab');
                }
                setSearchParams(newParams, { replace: true });
              }}
              onTotalsChange={handleProductTotalsChange}
            />

            <label className="formfilling__include-checkbox">
              <input
                type="checkbox"
                checked={includeProductsTable}
                onChange={(e) => setIncludeProductsTable(e.target.checked)}
              />
              <span>Include Products Table in PDF</span>
            </label>

            <ServicesSection
              initialServices={payload.services}
              activeTab={serviceTab}
              onTabChange={(tab) => {
                const newParams = new URLSearchParams(searchParams);
                if (tab) {
                  newParams.set('serviceTab', tab);
                } else {
                  newParams.delete('serviceTab');
                }
                setSearchParams(newParams, { replace: true });
              }}
            />
            <ServicesDataCollector ref={servicesRef} />

            {}
            <ContractSummary
              productTotals={productTotals}
              initialStartDate={agreementStartDate}
              onStartDateChange={setAgreementStartDate}
            />

            <div className="formfilling__payment-options">
              <div className="formfilling__payment-options-header">
                <div>
                  <h3>Payment Options</h3>
                  <p>Select how the customer will pay. Choosing “Other Payment” moves the document to Pending Approval even if Green Line pricing applies.</p>
                </div>
                <span className="formfilling__payment-option-current">Current: {currentPaymentLabel}</span>
              </div>

              <div className="formfilling__payment-options-grid">
                {PAYMENT_OPTION_DETAILS.map((option) => (
                  <label
                    key={option.value}
                    className={`payment-option ${paymentOption === option.value ? "payment-option--selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="paymentOption"
                      value={option.value}
                      checked={paymentOption === option.value}
                      onChange={() => setPaymentOption(option.value)}
                    />
                    <span className="payment-option-title">{option.label}</span>
                    <span className="payment-option-description">{option.description}</span>
                  </label>
                ))}
              </div>

              <div className="formfilling__payment-note">
                <label className="formfilling__payment-note-label" htmlFor="paymentNote">Note</label>
                <textarea
                  id="paymentNote"
                  className="formfilling__payment-note-input"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Write anything..."
                  rows={3}
                />
              </div>
            </div>

            {}
            <ServiceAgreement
              onAgreementChange={setAgreementData}
              initialData={payload.serviceAgreement} 
              templateData={serviceAgreementTemplate} 
              templateLoading={templateLoading} 
            />

            <div className="formfilling__actions">
              <button
                type="button"
                className="formfilling__draftBtn"
                onClick={handleDraft}
                disabled={isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isSaving ? 0.7 : 1,
                  cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {isSaving && (
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid #fff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite'
                  }} />
                )}
                {isSaving ? "Saving..." : "Save as Draft"}
              </button>
              <button
                type="button"
                className="formfilling__saveBtn"
                onClick={() => setShowSaveModal(true)}
                disabled={isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isSaving ? 0.7 : 1,
                  cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {isSaving && (
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid #fff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite'
                  }} />
                )}
                {isSaving ? "Saving..." : "Save & Generate PDF"}
              </button>
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={showSaveModal}
          title="Confirm Save"
          message="Are you sure you want to save this form and convert it to PDF? This will compile the document and store it in Bigin."
          confirmText="Yes, Save & Generate"
          cancelText="Cancel"
          onConfirm={handleSave}
          onCancel={() => setShowSaveModal(false)}
        />

        <VersionDialog
          isOpen={showVersionDialog}
          versionStatus={versionStatus}
          onClose={() => {
            setShowVersionDialog(false);
            setVersionStatus(null);
            setIsSaving(false);
          }}
          onCreateVersion={handleCreateVersion}
          loading={isSaving}
        />

        {toastMessage && (
          <Toast
            message={toastMessage.message}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        )}
      </div>
  );
}


export default function FormFilling() {

  const { pricingData, templateData, loading: templateLoading } = useAllServicePricing();

  return (
    <ServicesProvider backendPricingData={pricingData}>
      <FormFillingContent
        serviceAgreementTemplate={templateData}
        templateLoading={templateLoading}
      />
    </ServicesProvider>
  );
}
