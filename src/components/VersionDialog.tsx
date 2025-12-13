// src/components/VersionDialog.tsx
import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faPlus,
  faSync,
  faSpinner,
  faFileAlt,
  faHistory,
  faInfo
} from "@fortawesome/free-solid-svg-icons";
import type { VersionStatus } from "../backendservice/api/versionApi";
import "./VersionDialog.css";

interface VersionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  versionStatus: VersionStatus | null;
  onCreateVersion: (replaceRecent: boolean, changeNotes: string) => Promise<void>;
  onReplaceMain: (changeNotes: string) => Promise<void>;
  loading?: boolean;
}

export const VersionDialog: React.FC<VersionDialogProps> = ({
  isOpen,
  onClose,
  versionStatus,
  onCreateVersion,
  onReplaceMain,
  loading = false
}) => {
  const [selectedAction, setSelectedAction] = useState<'create_version' | 'replace_recent'>('create_version'); // ✅ REMOVED: replace_main
  const [changeNotes, setChangeNotes] = useState("");

  // ✅ MOVED: All hooks must come before any conditional returns
  // Auto-set recommended action on first render
  React.useEffect(() => {
    if (versionStatus) {
      resetToRecommended();
    }
  }, [versionStatus]);

  // ✅ MOVED: Early return comes AFTER all hooks
  if (!isOpen || !versionStatus) return null;

  const handleConfirm = async () => {
    try {
      // ✅ UPDATED: No more replace main PDF, only version operations
      const replaceRecent = selectedAction === 'replace_recent';
      await onCreateVersion(replaceRecent, changeNotes);
    } catch (error) {
      console.error('Version action failed:', error);
    }
  };

  const getRecommendedAction = () => {
    // ✅ UPDATED: Only version-based recommendations
    if (versionStatus.isFirstTime) return 'create_version';
    // No more "suggest_replace" for main PDF - only for recent versions
    return 'create_version';
  };

  const resetToRecommended = () => {
    setSelectedAction(getRecommendedAction());
    setChangeNotes("");
  };

  const renderActionOption = (
    actionType: typeof selectedAction,
    title: string,
    description: string,
    icon: any,
    recommended?: boolean
  ) => (
    <div
      className={`version-dialog__action-option ${
        selectedAction === actionType ? 'selected' : ''
      } ${recommended ? 'recommended' : ''}`}
      onClick={() => setSelectedAction(actionType)}
    >
      <div className="version-dialog__action-header">
        <FontAwesomeIcon icon={icon} />
        <span className="version-dialog__action-title">{title}</span>
        {recommended && <span className="version-dialog__recommended-badge">Recommended</span>}
      </div>
      <p className="version-dialog__action-description">{description}</p>
    </div>
  );

  return (
    <div className="version-dialog">
      <div className="version-dialog__overlay" onClick={onClose} />
      <div className="version-dialog__modal">
        <div className="version-dialog__header">
          <h2>Save PDF Options</h2>
          <button className="version-dialog__close" onClick={onClose} disabled={loading}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="version-dialog__body">
          {/* Current Status Info */}
          <div className="version-dialog__status">
            <FontAwesomeIcon icon={faInfo} />
            <div className="version-dialog__status-content">
              <p>
                <strong>Agreement:</strong> {versionStatus.agreement.headerTitle}
              </p>
              <p>
                Current versions: {versionStatus.totalVersions}
                {versionStatus.totalVersions > 0 && ` (latest: v${versionStatus.latestVersionNumber})`}
              </p>
            </div>
          </div>

          {/* Action Options */}
          <div className="version-dialog__actions">
            <h3>How would you like to save this PDF?</h3>

            {/* ✅ UPDATED: Only show version-based options */}
            {renderActionOption(
              'create_version',
              'Create New Version',
              `Create version ${versionStatus.latestVersionNumber + 1}. Recommended for tracking changes.`,
              faPlus,
              true // Always recommended as default
            )}

            {/* ✅ UPDATED: Show replace recent option when there are versions */}
            {versionStatus.totalVersions > 0 && renderActionOption(
              'replace_recent',
              'Replace Recent Version',
              `Replace version ${versionStatus.latestVersionNumber} with this updated content. Saves storage space.`,
              faSync,
              false
            )}
          </div>

          {/* Change Notes */}
          <div className="version-dialog__notes">
            <label htmlFor="changeNotes" className="version-dialog__notes-label">
              What changed? *
            </label>
            <textarea
              id="changeNotes"
              className="version-dialog__notes-textarea"
              placeholder="Describe what changed in this version (e.g., updated pricing, added services, client feedback changes)"
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Version History Preview */}
          {versionStatus.versions.length > 0 && (
            <div className="version-dialog__history">
              <h4>
                <FontAwesomeIcon icon={faHistory} />
                Existing Versions ({versionStatus.versions.length})
              </h4>
              <div className="version-dialog__version-list">
                {versionStatus.versions.slice(0, 3).map((version) => (
                  <div key={version.id} className="version-dialog__version-item">
                    <span className="version-number">v{version.versionNumber}</span>
                    <span className="version-date">
                      {new Date(version.createdAt).toLocaleDateString()}
                    </span>
                    <span className="version-size">
                      {Math.round(version.sizeBytes / 1024)}KB
                    </span>
                  </div>
                ))}
                {versionStatus.versions.length > 3 && (
                  <div className="version-dialog__version-item">
                    <span className="version-more">
                      +{versionStatus.versions.length - 3} more versions
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="version-dialog__footer">
          <button
            className="version-dialog__btn version-dialog__btn--secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            className="version-dialog__btn version-dialog__btn--primary"
            onClick={handleConfirm}
            disabled={
              loading ||
              !changeNotes.trim() // ✅ UPDATED: Always require change notes for subsequent saves
            }
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                Saving...
              </>
            ) : (
              <>
                {selectedAction === 'create_version' && `Create Version ${versionStatus.latestVersionNumber + 1}`}
                {selectedAction === 'replace_recent' && `Replace Version ${versionStatus.latestVersionNumber}`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};