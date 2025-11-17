import React from "react";
import type { MoneyRow } from "../types";

const Dollar = ({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) => (
  <div className="svc-dollar">
    <span>$</span>
    <input className="svc-in-box" name={name} defaultValue={defaultValue} />
  </div>
);

export default function RowMoney({
  row,
  onRemove,
  onRename,
}: {
  row: MoneyRow;
  onRemove?: () => void;
  onRename?: (label: string) => void;
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
        <Dollar name={row.name} defaultValue={row.defaultValue} />
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
