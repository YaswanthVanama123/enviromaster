// src/components/TrashView.tsx
// ✅ NEW: Trash view for deleted agreements and files
import React, { useState, useMemo } from "react";
import SavedFilesGrouped from "./SavedFilesGrouped";
import DocumentSidebar from "./DocumentSidebar";
import { faTrash, faFileAlt, faFolder } from "@fortawesome/free-solid-svg-icons";
import type { SavedFileGroup } from "../backendservice/api/pdfApi";

export default function TrashView() {
  const [groups, setGroups] = useState<SavedFileGroup[]>([]);

  // Calculate dynamic status counts
  const statusCounts = useMemo(() => {
    let deletedFiles = 0;
    let deletedFolders = 0;

    groups.forEach(group => {
      if (group.isDeleted) {
        deletedFolders++;
      }
      deletedFiles += group.files.filter(f => f.isDeleted).length;
    });

    return [
      { label: 'Deleted Files', count: deletedFiles, color: '#dc2626', icon: faFileAlt },
      { label: 'Deleted Folders', count: deletedFolders, color: '#991b1b', icon: faFolder }
    ];
  }, [groups]);

  // Calculate total documents
  const totalDocuments = useMemo(() => {
    return groups.reduce((sum, group) => sum + group.fileCount, 0);
  }, [groups]);

  // Calculate agreement timelines
  const agreementTimelines = useMemo(() => {
    return groups
      .filter(group => group.startDate && group.contractMonths)
      .map(group => {
        const start = new Date(group.startDate!);
        const today = new Date();
        const endDate = new Date(start);
        endDate.setMonth(endDate.getMonth() + group.contractMonths!);

        const totalDays = Math.floor((endDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const daysElapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let status: 'active' | 'expiring-soon' | 'expired' = 'active';
        if (daysRemaining < 0) {
          status = 'expired';
        } else if (daysRemaining <= 30) {
          status = 'expiring-soon';
        }

        return {
          agreementId: group.id,
          agreementTitle: group.agreementTitle,
          startDate: group.startDate!,
          contractMonths: group.contractMonths!,
          daysRemaining,
          daysElapsed,
          totalDays,
          status
        };
      });
  }, [groups]);

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

      <div style={{
        display: 'flex',
        gap: '24px',
        padding: '24px'
      }}>
        {/* Main Content */}
        <div style={{ flex: 1 }}>
          <SavedFilesGrouped
            mode="trash"
            onDataLoaded={(loadedGroups) => {
              setGroups(loadedGroups);
            }}
          />
        </div>

        {/* Right Sidebar */}
        <DocumentSidebar
          statusCounts={statusCounts}
          totalDocuments={totalDocuments}
          mode="trash"
          agreementTimelines={agreementTimelines}
        />
      </div>
    </div>
  );
}