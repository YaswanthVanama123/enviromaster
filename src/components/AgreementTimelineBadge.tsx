import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faCircleCheck,
  faCircleExclamation,
  faCircleXmark,
  faHourglass
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import './AgreementTimelineBadge.css';

type ExpiryStatus = 'yet-to-start' | 'safe' | 'warning' | 'critical' | 'expired';

type AgreementTimelineBadgeProps = {
  startDate: string; // ISO format: YYYY-MM-DD
  contractMonths: number;
  compact?: boolean; // For use in lists/folders
  showCalendarIcon?: boolean; // Show calendar icon for quick date changes
  onDateChange?: (newDate: string) => void; // Callback when date changes
  agreementId?: string; // Optional: for tracking which agreement
};

export function AgreementTimelineBadge({
  startDate,
  contractMonths,
  compact = true,
  showCalendarIcon = true,
  onDateChange,
  agreementId,
}: AgreementTimelineBadgeProps) {
  const [expiryStatus, setExpiryStatus] = useState<ExpiryStatus>('safe');
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editedDate, setEditedDate] = useState(startDate);

  // Calculate expiry status and days remaining
  useEffect(() => {
    if (!startDate || !contractMonths || contractMonths <= 0) {
      setExpiryStatus('safe');
      setDaysRemaining(null);
      setExpiryDate(null);
      return;
    }

    const start = new Date(startDate);
    const calculatedExpiry = new Date(start);
    calculatedExpiry.setMonth(calculatedExpiry.getMonth() + contractMonths);
    setExpiryDate(calculatedExpiry);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startMidnight = new Date(start);
    startMidnight.setHours(0, 0, 0, 0);
    const expiryMidnight = new Date(calculatedExpiry);
    expiryMidnight.setHours(0, 0, 0, 0);

    // Check if agreement hasn't started yet
    const daysUntilStart = Math.ceil((startMidnight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilStart > 0) {
      setDaysRemaining(daysUntilStart);
      setExpiryStatus('yet-to-start');
      return;
    }

    // Calculate days until expiry
    const timeDiff = expiryMidnight.getTime() - today.getTime();
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
  }, [startDate, contractMonths]);

  const getStatusIcon = (): IconDefinition => {
    switch (expiryStatus) {
      case 'yet-to-start':
        return faHourglass;
      case 'expired':
        return faCircleXmark;
      case 'critical':
        return faCircleExclamation;
      case 'warning':
        return faCircleExclamation;
      case 'safe':
        return faCircleCheck;
      default:
        return faCircleCheck;
    }
  };

  const getStatusText = (): string => {
    switch (expiryStatus) {
      case 'yet-to-start':
        return 'Yet to Start';
      case 'expired':
        return 'Inactive';
      case 'critical':
        return 'Expiring Soon';
      case 'warning':
        return 'Renewal Due';
      case 'safe':
        return 'Active';
      default:
        return 'Active';
    }
  };

  const getDaysText = (): string => {
    if (daysRemaining === null) return '';

    const days = Math.abs(daysRemaining);
    const dayWord = days === 1 ? 'day' : 'days';

    switch (expiryStatus) {
      case 'yet-to-start':
        return `Starts in ${days} ${dayWord}`;
      case 'expired':
        return `Inactive ${days} ${dayWord}`;
      default:
        return `${days} ${dayWord} left`;
    }
  };

  const handleDateChange = () => {
    if (editedDate !== startDate && onDateChange) {
      onDateChange(editedDate);
      console.log(`📅 [TIMELINE BADGE] Date changed for agreement ${agreementId || 'unknown'}: ${startDate} → ${editedDate}`);
    }
    setShowDatePicker(false);
  };

  const handleCalendarClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click events
    setShowDatePicker(!showDatePicker);
  };

  if (compact) {
    return (
      <div className={`timeline-badge-compact timeline-badge-${expiryStatus}`}>
        <div className="timeline-badge-content">
          <FontAwesomeIcon icon={getStatusIcon()} className="timeline-badge-icon" />
          <div className="timeline-badge-text">
            <span className="timeline-badge-status">{getStatusText()}</span>
            {daysRemaining !== null && (
              <>
                <span style={{ opacity: 0.5, fontSize: '10px' }}>•</span>
                <span className="timeline-badge-days">{getDaysText()}</span>
              </>
            )}
          </div>
        </div>
        {showCalendarIcon && (
          <div className="timeline-badge-calendar">
            <button
              type="button"
              className="timeline-calendar-btn"
              onClick={handleCalendarClick}
              title="Change start date"
            >
              <FontAwesomeIcon icon={faCalendarDays} />
            </button>
            {showDatePicker && (
              <div className="timeline-date-picker-popup">
                <label htmlFor={`date-${agreementId}`}>Start Date:</label>
                <input
                  id={`date-${agreementId}`}
                  type="date"
                  value={editedDate}
                  onChange={(e) => setEditedDate(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="timeline-date-actions">
                  <button
                    type="button"
                    className="timeline-date-save"
                    onClick={handleDateChange}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="timeline-date-cancel"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditedDate(startDate);
                      setShowDatePicker(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full/non-compact version (if needed)
  return (
    <div className={`timeline-badge-full timeline-badge-${expiryStatus}`}>
      <div className="timeline-badge-header">
        <FontAwesomeIcon icon={getStatusIcon()} className="timeline-badge-icon-large" />
        <div className="timeline-badge-info">
          <h4 className="timeline-badge-title">{getStatusText()}</h4>
          <p className="timeline-badge-subtitle">{getDaysText()}</p>
        </div>
      </div>
      {expiryDate && (
        <div className="timeline-badge-dates">
          <span>Start: {new Date(startDate).toLocaleDateString()}</span>
          <span>Expires: {expiryDate.toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}

export default AgreementTimelineBadge;
