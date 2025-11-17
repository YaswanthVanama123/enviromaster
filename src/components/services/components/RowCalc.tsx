import React from "react";
import type { CalcRow } from "../types";

const Under = ({
  name,
  defaultValue,
  className = "",
}: {
  name: string;
  defaultValue?: string;
  className?: string;
}) => (
  <input
    className={`svc-in ${className}`}
    name={name}
    defaultValue={defaultValue}
  />
);

export default function RowCalc({
  row,
  onRemove,
  onRename,
}: {
  row: CalcRow;
  onRemove?: () => void;
  onRename?: (label: string) => void;
}) {
  return (
    <div className="svc-row">
      {row.isCustom ? (
        <input
          className="svc-label-edit"
          value={row.label}
          onChange={(e) => onRename?.(e.target.value)}
        />
      ) : (
        <label>{row.label}</label>
      )}

      <div className="svc-row-right">
        <div className="svc-inline svc-inline--tight">
          <Under name={row.qtyName} className="sm" defaultValue={row.defaultQty} />
          <span>@</span>
          <Under name={row.rateName} className="sm" defaultValue={row.defaultRate} />
          <span>=</span>
          <Under name={row.totalName} className="sm" defaultValue={row.defaultTotal} />
        </div>
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
