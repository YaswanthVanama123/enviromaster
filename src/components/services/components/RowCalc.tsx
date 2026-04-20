import React, { useState, useEffect } from "react";
import type { CalcRow } from "../types";

export default function RowCalc({
  row,
  onRemove,
  onRename,
}: {
  row: CalcRow;
  onRemove?: () => void;
  onRename?: (label: string) => void;
}) {

  const [quantity, setQuantity] = useState<string>(row.defaultQty || "");
  const [rate, setRate] = useState<string>(row.defaultRate || "");
  const [total, setTotal] = useState<string>(row.defaultTotal || "");


  useEffect(() => {
    const qty = parseFloat(quantity) || 0;
    const rateValue = parseFloat(rate) || 0;
    const calculatedTotal = qty * rateValue;


    const formattedTotal = calculatedTotal > 0 ? calculatedTotal.toFixed(2) : "";
    setTotal(formattedTotal);
  }, [quantity, rate]);

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
          {}
          <input
            className="svc-in sm"
            name={row.qtyName}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Qty"
          />
          <span>@</span>
          {}
          <span>$</span>
          <input
            className="svc-in sm"
            name={row.rateName}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="0.00"
          />
          <span>=</span>
          {}
          <span>$</span>
          <input
            className="svc-in sm"
            name={row.totalName}
            value={total}
            readOnly
            style={{
              backgroundColor: '#f3f4f6',
              cursor: 'not-allowed',
              fontWeight: '600'
            }}
            title="Auto-calculated: Quantity × Rate"
          />
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
