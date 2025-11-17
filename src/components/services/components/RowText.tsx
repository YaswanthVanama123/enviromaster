import React from "react";
import type { TextRow } from "../types";

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

export default function RowText({
  row,
  onRemove,
  onRename,
}: {
  row: TextRow;
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
        <Under name={row.name} defaultValue={row.defaultValue} />
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
