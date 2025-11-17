import React from "react";

export default function ServiceCard({
  title,
  isCustom,
  onRename,
  headerActions,
  children,
}: {
  title: string;
  isCustom?: boolean;
  onRename?: (v: string) => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="svc-card">
      <div className="svc-h-row">
        {isCustom ? (
          <input
            className="svc-h-input"
            value={title}
            onChange={(e) => onRename?.(e.target.value.toUpperCase())}
          />
        ) : (
          <h3 className="svc-h">{title}</h3>
        )}
        <div className="svc-h-actions">{headerActions}</div>
      </div>
      {children}
    </div>
  );
}
