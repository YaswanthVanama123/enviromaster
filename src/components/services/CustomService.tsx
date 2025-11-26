// CustomService.tsx - Wrapper for user-created custom services
import React, { useState } from "react";
import "./ServicesSection.css";
import { CustomFieldManager, type CustomField } from "./CustomFieldManager";

export type CustomServiceData = {
  id: string;
  name: string;
  fields: CustomField[];
};

type CustomServiceProps = {
  service: CustomServiceData;
  onUpdate: (service: CustomServiceData) => void;
  onRemove: () => void;
};

export const CustomService: React.FC<CustomServiceProps> = ({
  service,
  onUpdate,
  onRemove,
}) => {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...service, name: e.target.value });
  };

  const handleFieldsChange = (fields: CustomField[]) => {
    onUpdate({ ...service, fields });
  };

  return (
    <div className="svc-card">
      {/* Header row with editable name and remove button */}
      <div className="svc-h-row">
        <input
          type="text"
          className="svc-h-editable"
          value={service.name}
          onChange={handleNameChange}
          placeholder="Service name..."
        />
        <button
          type="button"
          className="svc-remove"
          onClick={onRemove}
          title="Remove service"
        >
          −
        </button>
      </div>

      {/* Custom fields manager */}
      <CustomFieldManager
        fields={service.fields}
        onFieldsChange={handleFieldsChange}
      />
    </div>
  );
};
