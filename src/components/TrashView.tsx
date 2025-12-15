// src/components/TrashView.tsx
// ✅ NEW: Trash view for deleted agreements and files
import React from "react";
import SavedFilesGrouped from "./SavedFilesGrouped";

export default function TrashView() {
  return (
    <div>
      <div style={{
        background: '#fff',
        padding: '24px 24px 16px',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '8px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            🗑️
          </div>
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '600',
            color: '#111827'
          }}>
            Trash
          </h1>
        </div>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: '#6b7280'
        }}>
          View and manage deleted agreements and files. Items in trash can be restored or permanently deleted.
        </p>
      </div>

      <SavedFilesGrouped mode="trash" />
    </div>
  );
}