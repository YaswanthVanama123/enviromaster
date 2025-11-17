import React from "react";
import type { RowKind } from "../types";

export default function FieldChooser({
  value,
  onChange,
  onAdd,
  onClose,
}: {
  value: RowKind;
  onChange: (v: RowKind) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  return (
    <div className="svc-chooser">
      <select
        className="svc-chooser-select"
        value={value}
        onChange={(e) => onChange(e.target.value as RowKind)}
      >
        <option value="text">Text</option>
        <option value="money">Money</option>
        <option value="calc">Calc</option>
      </select>
      <button
        type="button"
        className="svc-btn svc-btn--small"
        onClick={onAdd}
      >
        Add
      </button>
      <button
        type="button"
        className="svc-mini svc-mini--neg"
        title="Close"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}
