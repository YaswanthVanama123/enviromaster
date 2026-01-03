// src/components/SavedFiles/VirtualizedAgreementList.tsx
// ✅ PERFORMANCE: Virtual scrolling - only renders visible items
import { memo, useCallback, useRef, useEffect } from "react";
import { VariableSizeList as List } from "react-window";
import type { SavedFileGroup, SavedFileListItem } from "../../backendservice/api/pdfApi";
import { AgreementRow } from "./AgreementRow";

interface VirtualizedAgreementListProps {
  agreements: SavedFileGroup[];
  expandedAgreements: Set<string>;
  selectedFiles: Record<string, boolean>;
  statusChangeLoading: Record<string, boolean>;
  fileWatermarkStates: Map<string, boolean>;
  isInAdminContext: boolean;
  isTrashView: boolean;
  getAgreementSelectionState: (agreement: SavedFileGroup) => 'none' | 'partial' | 'all';
  onToggleExpand: (agreementId: string) => void;
  onToggleAgreementSelection: (agreementId: string) => void;
  onFileToggleSelection: (fileId: string) => void;
  onAddFile: (agreement: SavedFileGroup) => void;
  onEditAgreement: (agreement: SavedFileGroup) => void;
  onDelete: (type: 'file' | 'folder', id: string, title: string, fileType?: string) => void;
  onAgreementZohoUpload: (agreement: SavedFileGroup) => void;
  onDateChange: (agreementId: string, newDate: string) => Promise<void>;
  onView: (file: SavedFileListItem, watermark: boolean) => void;
  onDownload: (file: SavedFileListItem, watermark: boolean) => void;
  onEmail: (file: SavedFileListItem) => void;
  onZohoUpload: (file: SavedFileListItem) => void;
  onEdit: (file: SavedFileListItem) => void;
  onStatusChange: (file: SavedFileListItem, newStatus: string) => void;
  onWatermarkToggle: (fileId: string, checked: boolean) => void;
  onRestore: (type: 'file' | 'folder', id: string, title: string, fileType?: string) => void;
}

export const VirtualizedAgreementList = memo((props: VirtualizedAgreementListProps) => {
  const {
    agreements,
    expandedAgreements,
    selectedFiles,
    statusChangeLoading,
    fileWatermarkStates,
    isInAdminContext,
    isTrashView,
    getAgreementSelectionState,
    onToggleExpand,
    onToggleAgreementSelection,
    onFileToggleSelection,
    onAddFile,
    onEditAgreement,
    onDelete,
    onAgreementZohoUpload,
    onDateChange,
    onView,
    onDownload,
    onEmail,
    onZohoUpload,
    onEdit,
    onStatusChange,
    onWatermarkToggle,
    onRestore
  } = props;

  // ✅ FIX: Reference to list for resetting item size cache
  const listRef = useRef<any>(null);

  // ✅ FIX: Reset item size cache when expansion state changes
  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [expandedAgreements]);

  // ✅ FIX: Memoize item size calculation to prevent shivering
  const getItemSize = useCallback((index: number) => {
    const agreement = agreements[index];
    const isExpanded = expandedAgreements.has(agreement.id);

    // Base height for collapsed state (header only)
    // 16px top padding + 16px bottom padding + content ~50px = ~82px total
    const baseHeight = 86;

    if (!isExpanded) {
      return baseHeight;
    }

    // Calculate expanded height: header + files + padding
    const fileCount = agreement.files.length;
    // Each file: 12px padding top/bottom + content ~46px = ~70px per file
    const filesHeight = fileCount * 70;
    // Container padding: 8px top + 12px bottom = 20px
    const containerPadding = 20;

    return baseHeight + filesHeight + containerPadding;
  }, [agreements, expandedAgreements]);

  // ✅ FIX: Dynamic height based on available space (less wasted space)
  const totalHeight = Math.min(
    agreements.length * 90, // Estimated total if all collapsed
    window.innerHeight - 350 // Leave room for header/footer/pagination
  );

  // Row renderer
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const agreement = agreements[index];
    const isExpanded = expandedAgreements.has(agreement.id);
    const selectionState = getAgreementSelectionState(agreement);

    return (
      <div style={{
        ...style,
        // ✅ FIX: Ensure expanded rows render above collapsed rows
        zIndex: isExpanded ? 10 : 1,
        position: 'relative'
      }}>
        <AgreementRow
          agreement={agreement}
          isExpanded={isExpanded}
          selectionState={selectionState}
          selectedFiles={selectedFiles}
          statusChangeLoading={statusChangeLoading}
          fileWatermarkStates={fileWatermarkStates}
          isInAdminContext={isInAdminContext}
          isTrashView={isTrashView}
          onToggleExpand={onToggleExpand}
          onToggleSelection={onToggleAgreementSelection}
          onFileToggleSelection={onFileToggleSelection}
          onAddFile={onAddFile}
          onEditAgreement={onEditAgreement}
          onDelete={onDelete}
          onAgreementZohoUpload={onAgreementZohoUpload}
          onDateChange={onDateChange}
          onView={onView}
          onDownload={onDownload}
          onEmail={onEmail}
          onZohoUpload={onZohoUpload}
          onEdit={onEdit}
          onStatusChange={onStatusChange}
          onWatermarkToggle={onWatermarkToggle}
          onRestore={onRestore}
        />
      </div>
    );
  };

  if (agreements.length === 0) {
    return null;
  }

  return (
    <List
      ref={listRef}
      height={totalHeight}
      itemCount={agreements.length}
      itemSize={getItemSize}
      width="100%"
      overscanCount={2} // Render 2 extra items for smooth scrolling
    >
      {Row}
    </List>
  );
});

VirtualizedAgreementList.displayName = 'VirtualizedAgreementList';
