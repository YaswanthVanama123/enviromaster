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
};

export const CustomFieldManager: React.FC<CustomFieldManagerProps> = ({
  fields,
  onFieldsChange,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
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
    setShowDropdown(false);
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
      {/* Render existing fields */}
      {fields.map((field) => (
        <div key={field.id} className="custom-field">
          <div className="custom-field__row">
            <input
              type="text"
              className="custom-field__name"
              value={field.name}
              onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
              placeholder="Field name"
            />
            <button
              type="button"
              className="custom-field__remove"
              onClick={() => handleRemoveField(field.id)}
              title="Remove field"
            >
              −
            </button>
          </div>

          {/* Text field */}
          {field.type === "text" && (
            <input
              type="text"
              className="custom-field__input"
              value={field.value || ""}
              onChange={(e) => handleUpdateField(field.id, { value: e.target.value })}
              placeholder="Enter value"
            />
          )}

          {/* Dollar field */}
          {field.type === "dollar" && (
            <div className="custom-field__dollar">
              <span className="custom-field__dollar-sign">$</span>
              <input
                type="text"
                className="custom-field__input"
                value={field.value || ""}
                onChange={(e) => handleUpdateField(field.id, { value: e.target.value })}
                placeholder="Enter amount"
              />
            </div>
          )}

          {/* Calc field */}
          {field.type === "calc" && (
            <div className="custom-field__calc">
              <input
                type="text"
                className="custom-field__calc-input"
                value={field.calcValues?.left || ""}
                onChange={(e) =>
                  handleUpdateField(field.id, {
                    calcValues: { ...field.calcValues!, left: e.target.value },
                  })
                }
                placeholder="Value"
              />
              <span className="custom-field__calc-symbol">@</span>
              <input
                type="text"
                className="custom-field__calc-input"
                value={field.calcValues?.middle || ""}
                onChange={(e) =>
                  handleUpdateField(field.id, {
                    calcValues: { ...field.calcValues!, middle: e.target.value },
                  })
                }
                placeholder="Rate"
              />
              <span className="custom-field__calc-symbol">=</span>
              <input
                type="text"
                className="custom-field__calc-input"
                value={field.calcValues?.right || ""}
                onChange={(e) =>
                  handleUpdateField(field.id, {
                    calcValues: { ...field.calcValues!, right: e.target.value },
                  })
                }
                placeholder="Total"
              />
            </div>
          )}
        </div>
      ))}

      {/* Add new field button */}
      {!showDropdown ? (
        <button
          type="button"
          className="custom-field__add-btn"
          onClick={() => setShowDropdown(true)}
        >
          + Add Field
        </button>
      ) : (
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
            className="custom-field__add-confirm"
            onClick={handleAddField}
          >
            Add
          </button>
          <button
            type="button"
            className="custom-field__add-cancel"
            onClick={() => setShowDropdown(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
