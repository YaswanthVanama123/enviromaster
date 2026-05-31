import React, { useState, useEffect, useCallback } from "react";
import { salesPersonApi } from "../../../backendservice/api/quotaApi";
import type {
  SalesPerson,
  SalesRole,
} from "../../../backendservice/types/quota.types";
import {
  formatCurrency,
  getSalesRoleLabel,
} from "../../../backendservice/types/quota.types";

interface SalesPersonManagerProps {
  onRefresh: () => void;
}

export const SalesPersonManager: React.FC<SalesPersonManagerProps> = ({ onRefresh }) => {
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPerson, setEditingPerson] = useState<SalesPerson | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | undefined>(true);

  const [editFormData, setEditFormData] = useState({
    salesRole: "field_sales" as SalesRole,
    territory: "",
    phone: "",
    monthlyTarget: 50000,
    periodType: "monthly" as "monthly" | "quarterly" | "annual",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadSalesPersons = useCallback(async () => {
    setLoading(true);
    const result = await salesPersonApi.getAll({
      active: filterActive,
      search: searchTerm || undefined,
    });
    if (result) {
      setSalesPersons(result.data);
    }
    setLoading(false);
  }, [filterActive, searchTerm]);

  useEffect(() => {
    loadSalesPersons();
  }, [loadSalesPersons]);

  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: name === "monthlyTarget" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleEdit = (person: SalesPerson) => {
    setEditingPerson(person);
    setEditFormData({
      salesRole: person.role || "field_sales",
      territory: person.territory || "",
      phone: person.phone || "",
      monthlyTarget: person.quota?.monthlyTarget || 50000,
      periodType: person.quota?.periodType || "monthly",
    });
    setFormError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingPerson) return;

    setSaving(true);
    setFormError(null);

    try {
      
      const updateResult = await salesPersonApi.update(editingPerson.employeeId, {
        salesRole: editFormData.salesRole,
        territory: editFormData.territory,
        phone: editFormData.phone,
      });

      if (!updateResult) {
        setFormError("Failed to update sales person");
        setSaving(false);
        return;
      }

      if (
        editFormData.monthlyTarget !== editingPerson.quota?.monthlyTarget ||
        editFormData.periodType !== editingPerson.quota?.periodType
      ) {
        const quotaResult = await salesPersonApi.updateQuota(editingPerson.employeeId, {
          monthlyTarget: editFormData.monthlyTarget,
          periodType: editFormData.periodType,
        });

        if (!quotaResult) {
          setFormError("Failed to update quota");
          setSaving(false);
          return;
        }
      }

      setEditingPerson(null);
      loadSalesPersons();
      onRefresh();
    } catch (error) {
      setFormError("An error occurred while saving");
    }

    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditingPerson(null);
    setFormError(null);
  };

  return (
    <div className="sales-person-manager">
      <div className="manager-header">
        <div className="search-filters">
          <input
            type="text"
            placeholder="Search by name, email, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filterActive === undefined ? "all" : filterActive ? "active" : "inactive"}
            onChange={(e) => {
              if (e.target.value === "all") setFilterActive(undefined);
              else setFilterActive(e.target.value === "active");
            }}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
        <div className="info-banner">
          <span className="info-icon">ℹ️</span>
          <span>Employees are managed in <strong>User Management</strong>. Edit quota targets here.</span>
        </div>
      </div>

      {}
      {editingPerson && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <h3>Edit Quota Settings - {editingPerson.name}</h3>
            <p className="edit-subtitle">Employee: {editingPerson.employeeId}</p>

            <div className="form-grid">
              <div className="form-group">
                <label>Sales Role</label>
                <select
                  name="salesRole"
                  value={editFormData.salesRole}
                  onChange={handleEditInputChange}
                >
                  <option value="field_sales">Field Sales</option>
                  <option value="inside_sales">Inside Sales</option>
                  <option value="account_manager">Account Manager</option>
                  <option value="sales_manager">Sales Manager</option>
                </select>
              </div>
              <div className="form-group">
                <label>Territory</label>
                <input
                  type="text"
                  name="territory"
                  value={editFormData.territory}
                  onChange={handleEditInputChange}
                  placeholder="e.g., Houston Metro"
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={editFormData.phone}
                  onChange={handleEditInputChange}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="form-group">
                <label>Monthly Quota Target ($)</label>
                <input
                  type="number"
                  name="monthlyTarget"
                  value={editFormData.monthlyTarget}
                  onChange={handleEditInputChange}
                  min="0"
                  step="1000"
                />
              </div>
              <div className="form-group">
                <label>Quota Period</label>
                <select
                  name="periodType"
                  value={editFormData.periodType}
                  onChange={handleEditInputChange}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <div className="modal-actions">
              <button className="cancel-btn" onClick={handleCancelEdit}>
                Cancel
              </button>
              <button className="submit-btn" onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading employees...</div>
      ) : salesPersons.length === 0 ? (
        <div className="empty-state-container">
          <div className="empty-state-icon">👥</div>
          <h3>No Employees Found</h3>
          <p>
            Employees are managed in <strong>User Management</strong>.<br />
            Go to User Management → Add Employee to create sales team members.
          </p>
        </div>
      ) : (
        <div className="sales-persons-table-container">
          <table className="sales-persons-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Email</th>
                <th>Sales Role</th>
                <th>Territory</th>
                <th>Quota Target</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {salesPersons.map((person) => (
                <tr key={person.employeeId} className={!person.isActive ? "inactive-row" : ""}>
                  <td className="username-cell">{person.employeeId}</td>
                  <td>{person.name}</td>
                  <td>{person.email || "-"}</td>
                  <td>{getSalesRoleLabel(person.role)}</td>
                  <td>{person.territory || "-"}</td>
                  <td>{formatCurrency(person.quota?.monthlyTarget || 50000)}/mo</td>
                  <td>
                    <span className={`status-badge ${person.isActive ? "active" : "inactive"}`}>
                      {person.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button className="action-btn edit-btn" onClick={() => handleEdit(person)}>
                      Edit Quota
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
