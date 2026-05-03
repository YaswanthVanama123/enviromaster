import React, { useState, useEffect } from 'react';
import { adminSettingsApi, type AdminSettings } from '../../backendservice/api/adminSettingsApi';
import { zohoApi, type ZohoUser } from '../../backendservice/api/zohoApi';
import { Toast } from './Toast';
import type { ToastType } from './Toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faUserCog, faBell, faSearch, faTimes, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import './ApprovalTaskSettings.css';

export const ApprovalTaskSettings: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [users, setUsers] = useState<ZohoUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  // Form state
  const [selectedOwner, setSelectedOwner] = useState<{ id: string | null; name: string | null }>({ id: null, name: null });
  const [subjectTemplate, setSubjectTemplate] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (settings) {
      const ownerChanged =
        selectedOwner.id !== settings.defaultApprovalTaskOwner.id ||
        selectedOwner.name !== settings.defaultApprovalTaskOwner.name;
      const subjectChanged = subjectTemplate !== settings.approvalTaskSubject;
      setHasChanges(ownerChanged || subjectChanged);
    }
  }, [selectedOwner, subjectTemplate, settings]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [currentSettings, usersResponse] = await Promise.all([
        adminSettingsApi.get(),
        zohoApi.getUsers(),
      ]);

      setSettings(currentSettings);
      setSelectedOwner(currentSettings.defaultApprovalTaskOwner);
      setSubjectTemplate(currentSettings.approvalTaskSubject);

      if (usersResponse.success) {
        setUsers(usersResponse.users);
      }
    } catch (error) {
      console.error('Error loading approval task settings:', error);
      setToastMessage({ message: 'Failed to load settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await adminSettingsApi.update({
        defaultApprovalTaskOwner: selectedOwner,
        approvalTaskSubject: subjectTemplate,
      });
      setSettings(updated);
      setHasChanges(false);
      setToastMessage({ message: 'Workflow settings saved successfully!', type: 'success' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setToastMessage({ message: 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleSelectUser = (user: ZohoUser) => {
    setSelectedOwner({ id: user.id, name: user.name });
    setUserSearch('');
    setShowUserDropdown(false);
  };

  const handleClearOwner = () => {
    setSelectedOwner({ id: null, name: null });
    setUserSearch('');
  };

  if (loading) {
    return (
      <div className="ats-loading">
        <div className="ats-spinner" />
        <p className="ats-loading-text">Loading workflow settings…</p>
      </div>
    );
  }

  return (
    <div className="approval-task-settings">
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      <div className="ats-header">
        <div className="ats-header-icon">
          <FontAwesomeIcon icon={faUserCog} />
        </div>
        <div>
          <h2 className="ats-title">Approval Task Workflow</h2>
          <p className="ats-subtitle">
            Configure automatic Bigin task creation when an agreement is saved with pending-approval (red-line) pricing.
          </p>
        </div>
      </div>

      <div className="ats-info-banner">
        <FontAwesomeIcon icon={faInfoCircle} className="ats-info-icon" />
        <span>
          When an agreement is saved with red-line pricing <strong>and</strong> a Bigin company/pipeline is already linked,
          a task will be automatically created in Bigin and assigned to the owner selected below.
        </span>
      </div>

      <div className="ats-section">
        <div className="ats-field-group">
          <label className="ats-label">
            <FontAwesomeIcon icon={faUserCog} className="ats-label-icon" />
            Default Task Owner
          </label>
          <p className="ats-field-hint">
            The Bigin user who will be assigned the approval task automatically.
          </p>

          {selectedOwner.id ? (
            <div className="ats-selected-user">
              <div className="ats-selected-user-avatar">
                {selectedOwner.name?.charAt(0).toUpperCase()}
              </div>
              <div className="ats-selected-user-info">
                <span className="ats-selected-user-name">{selectedOwner.name}</span>
              </div>
              <button className="ats-clear-btn" onClick={handleClearOwner} title="Remove owner">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          ) : (
            <div className="ats-no-owner">No default owner set — tasks will be unassigned</div>
          )}

          <div className="ats-user-search-wrapper">
            <div className="ats-search-input-row">
              <FontAwesomeIcon icon={faSearch} className="ats-search-icon" />
              <input
                type="text"
                className="ats-search-input"
                placeholder="Search Bigin users…"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setShowUserDropdown(true);
                }}
                onFocus={() => setShowUserDropdown(true)}
              />
            </div>
            {showUserDropdown && userSearch.length > 0 && (
              <div className="ats-user-dropdown">
                {filteredUsers.length === 0 ? (
                  <div className="ats-dropdown-empty">No users found</div>
                ) : (
                  filteredUsers.slice(0, 10).map((u) => (
                    <button
                      key={u.id}
                      className="ats-dropdown-item"
                      onClick={() => handleSelectUser(u)}
                    >
                      <div className="ats-dropdown-avatar">{u.name.charAt(0).toUpperCase()}</div>
                      <div className="ats-dropdown-info">
                        <span className="ats-dropdown-name">{u.name}</span>
                        <span className="ats-dropdown-email">{u.email}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="ats-field-group">
          <label className="ats-label">
            <FontAwesomeIcon icon={faBell} className="ats-label-icon" />
            Task Subject Template
          </label>
          <p className="ats-field-hint">
            Use <code>{'{{agreementTitle}}'}</code> as a placeholder for the agreement name.
          </p>
          <input
            type="text"
            className="ats-subject-input"
            value={subjectTemplate}
            onChange={(e) => setSubjectTemplate(e.target.value)}
            placeholder='e.g. Agreement "{{agreementTitle}}" needs your approval'
          />
          {subjectTemplate.includes('{{agreementTitle}}') && (
            <div className="ats-preview">
              <span className="ats-preview-label">Preview:</span>{' '}
              <span className="ats-preview-text">
                {subjectTemplate.replace('{{agreementTitle}}', 'Acme Corp Service Agreement')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="ats-footer">
        <button
          className="ats-save-btn"
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          <FontAwesomeIcon icon={faSave} className="ats-save-icon" />
          {saving ? 'Saving…' : 'Save Workflow Settings'}
        </button>
        {!hasChanges && !saving && settings && (
          <span className="ats-no-changes">No unsaved changes</span>
        )}
      </div>
    </div>
  );
};
