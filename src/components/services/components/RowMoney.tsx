import React from "react";
import type { MoneyRow } from "../types";

const Dollar = ({
  name,
  value,
  onChange,
}: {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
}) => (
  <div className="svc-dollar">
    <span>$</span>
    <input
      className="svc-in-box"
      name={name}
      type="number"
      step="0.01"
      min="0"
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value)}
    />
  </div>
);

export default function RowMoney({
  row,
  value,
  onRemove,
  onRename,
  onChange,
}: {
  row: MoneyRow;
  value?: string;
  onRemove?: () => void;
  onRename?: (label: string) => void;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="svc-row svc-row-charge">
      {row.isCustom ? (
        <input
          className="svc-label-edit svc-red"
          value={row.label}
          onChange={(e) => onRename?.(e.target.value)}
        />
      ) : (
        <label className="svc-red">{row.label}</label>
      )}

      <div className="svc-row-right">
        <Dollar
          name={row.name}
          value={value || row.defaultValue}
          onChange={onChange}
        />
        {row.isCustom && (
          <button
            type="button"
            className="svc-mini svc-mini--inline"
            title="Remove"
            onClick={onRemove}
          >
            –
          </button>
        )}
      </div>
    </div>
  );
}
