// CustomFieldManager.tsx - Manages custom fields for services
import React, { useState } from "react";
import "./CustomFieldManager.css";

export type FieldType = "text" | "calc" | "dollar";

export type CustomField = {
  id: string;
  type: FieldType;
  name: string;
  value?: string;
  calcValues?: { left: string; middle: string; right: string };
};

type CustomFieldManagerProps = {
  fields: CustomField[];
  onFieldsChange: (fields: CustomField[]) => void;
  showAddDropdown?: boolean;
  onToggleAddDropdown?: (show: boolean) => void;
};

export const CustomFieldManager: React.FC<CustomFieldManagerProps> = ({
  fields,
  onFieldsChange,
  showAddDropdown = false,
  onToggleAddDropdown,
}) => {
  const [selectedType, setSelectedType] = useState<FieldType>("text");

  const handleAddField = () => {
    const newField: CustomField = {
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: selectedType,
      name: "Lorem ipsum",
      value: selectedType === "text" || selectedType === "dollar" ? "" : undefined,
      calcValues: selectedType === "calc" ? { left: "", middle: "", right: "" } : undefined,
    };

    onFieldsChange([...fields, newField]);
    onToggleAddDropdown?.(false);
  };

  const handleCancel = () => {
    onToggleAddDropdown?.(false);
  };

  const handleRemoveField = (fieldId: string) => {
    onFieldsChange(fields.filter((f) => f.id !== fieldId));
  };

  const handleUpdateField = (fieldId: string, updates: Partial<CustomField>) => {
    onFieldsChange(
      fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
  };

  return (
    <div className="custom-field-manager">
      {/* Render existing fields - each as a single row like service fields */}
      {fields.map((field) => (
        <div key={field.id} className="svc-row">
          {/* Editable label on the left */}
          <label>
            <input
              type="text"
              className="svc-label-edit"
              value={field.name}
              onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
              placeholder="Field name"
            />
          </label>

          {/* Input on the right */}
          <div className="svc-row-right">
            {/* Text field */}
            {field.type === "text" && (
              <input
                type="text"
                className="svc-in"
                value={field.value || ""}
                onChange={(e) => handleUpdateField(field.id, { value: e.target.value })}
                placeholder="Enter value"
              />
            )}

            {/* Dollar field */}
            {field.type === "dollar" && (
              <div className="svc-dollar">
                <span>$</span>
                <input
                  type="text"
                  className="svc-in"
                  value={field.value || ""}
                  onChange={(e) => handleUpdateField(field.id, { value: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Calc field */}
            {field.type === "calc" && (
              <div className="svc-inline--tight">
                <input
                  type="text"
                  className="svc-in sm"
                  value={field.calcValues?.left || ""}
                  onChange={(e) =>
                    handleUpdateField(field.id, {
                      calcValues: { ...field.calcValues!, left: e.target.value },
                    })
                  }
                  placeholder="0"
                />
                <span>@</span>
                <input
                  type="text"
                  className="svc-in sm"
                  value={field.calcValues?.middle || ""}
                  onChange={(e) =>
                    handleUpdateField(field.id, {
                      calcValues: { ...field.calcValues!, middle: e.target.value },
                    })
                  }
                  placeholder="0.00"
                />
                <span>=</span>
                <input
                  type="text"
                  className="svc-in sm"
                  value={field.calcValues?.right || ""}
                  onChange={(e) =>
                    handleUpdateField(field.id, {
                      calcValues: { ...field.calcValues!, right: e.target.value },
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Remove button */}
            <button
              type="button"
              className="svc-mini svc-mini--neg"
              onClick={() => handleRemoveField(field.id)}
              title="Remove field"
            >
              −
            </button>
          </div>
        </div>
      ))}

      {/* Add new field dropdown at bottom */}
      {showAddDropdown && (
        <div className="custom-field__add-dropdown">
          <span className="custom-field__add-label">Add</span>
          <select
            className="custom-field__type-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as FieldType)}
          >
            <option value="text">Text</option>
            <option value="calc">Calc</option>
            <option value="dollar">Dollar</option>
          </select>
          <button
            type="button"
            className="svc-btn svc-btn--small"
            onClick={handleAddField}
          >
            Add
          </button>
          <button
            type="button"
            className="svc-mini svc-mini--neg"
            onClick={handleCancel}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
