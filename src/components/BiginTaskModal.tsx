import React, { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSearch,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faBuilding,
  faChevronDown,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { zohoApi } from "../backendservice/api";
import type { ZohoCompany, ZohoUploadStatus, ZohoUser } from "../backendservice/api";

interface BiginTaskModalProps {
  agreementId: string;
  agreementTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "loading" | "select-company" | "form" | "submitting" | "success" | "error";

const SE_MODULES = [
  { value: "Accounts", label: "Companies" },
  { value: "Pipelines", label: "Pipelines" },
  { value: "Contacts", label: "Contacts" },
  { value: "Products", label: "Products" },
];

export const BiginTaskModal: React.FC<BiginTaskModalProps> = ({
  agreementId,
  agreementTitle,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>("loading");
  const [linkedCompany, setLinkedCompany] = useState<{ id: string; name: string } | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<ZohoCompany | null>(null);

  // Company search
  const [allCompanies, setAllCompanies] = useState<ZohoCompany[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Users
  const [users, setUsers] = useState<ZohoUser[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<ZohoUser | null>(null);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerDropOpen, setOwnerDropOpen] = useState(false);
  const ownerRef = useRef<HTMLDivElement>(null);

  // Related To module
  const [seModule, setSeModule] = useState("Accounts");
  const [moduleDropOpen, setModuleDropOpen] = useState(false);
  const moduleRef = useRef<HTMLDivElement>(null);

  // Task fields
  const [taskName, setTaskName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [reminder, setReminder] = useState(false);
  const [description, setDescription] = useState("");
  const [highPriority, setHighPriority] = useState(false);
  const [markCompleted, setMarkCompleted] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ownerRef.current && !ownerRef.current.contains(e.target as Node)) setOwnerDropOpen(false);
      if (moduleRef.current && !moduleRef.current.contains(e.target as Node)) setModuleDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // On open: check Bigin link + fetch users
  useEffect(() => {
    setStep("loading");
    setErrorMsg("");
    setLinkedCompany(null);
    setSelectedCompany(null);
    setSelectedOwner(null);
    setOwnerSearch("");
    setTaskName("");
    setDueDate("");
    setRepeat(false);
    setReminder(false);
    setDescription("");
    setHighPriority(false);
    setMarkCompleted(false);
    setSeModule("Accounts");

    Promise.allSettled([
      zohoApi.getUploadStatus(agreementId),
      zohoApi.getUsers(),
    ]).then(([statusResult, usersResult]) => {
      if (usersResult.status === "fulfilled") {
        setUsers(usersResult.value.users || []);
      }
      if (statusResult.status === "fulfilled") {
        const status = statusResult.value as ZohoUploadStatus;
        if (status.mapping?.companyId && status.mapping?.companyName) {
          setLinkedCompany({ id: status.mapping.companyId, name: status.mapping.companyName });
          setStep("form");
          return;
        }
      }
      setStep("select-company");
    });
  }, [agreementId]);

  // Load companies for selector
  useEffect(() => {
    if (step !== "select-company") return;
    setLoadingCompanies(true);
    const timer = setTimeout(() => {
      zohoApi.getCompanies(1, companySearch || undefined)
        .then((res) => { setAllCompanies(res.companies || []); setLoadingCompanies(false); })
        .catch(() => setLoadingCompanies(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [companySearch, step]);

  const handleSelectCompany = useCallback((company: ZohoCompany) => {
    setSelectedCompany(company);
    setStep("form");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!taskName.trim()) { setErrorMsg("Task Name is required."); return; }
    const company = linkedCompany ?? (selectedCompany ? { id: selectedCompany.id, name: selectedCompany.name } : null);
    if (!company) { setErrorMsg("Please select a company."); return; }

    setErrorMsg("");
    setStep("submitting");

    try {
      const payload = {
        subject: taskName.trim(),
        dueDate: dueDate || undefined,
        priority: highPriority ? ("High" as const) : ("Medium" as const),
        status: markCompleted ? ("Completed" as const) : ("Not Started" as const),
        description: description.trim() || undefined,
        ownerId: selectedOwner?.id || undefined,
        seModule,
      };

      const result = linkedCompany
        ? await zohoApi.createTaskForAgreement(agreementId, payload)
        : await zohoApi.createTaskForCompany(company.id, payload);

      if (result.success) { setStep("success"); onSuccess(); }
      else { setErrorMsg(result.error ?? "Task creation failed."); setStep("form"); }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Task creation failed.");
      setStep("form");
    }
  }, [taskName, dueDate, description, highPriority, markCompleted, selectedOwner, seModule, linkedCompany, selectedCompany, agreementId, onSuccess]);

  const effectiveCompany = linkedCompany ?? (selectedCompany ? { id: selectedCompany.id, name: selectedCompany.name } : null);
  const filteredUsers = users.filter(u =>
    !ownerSearch || u.name.toLowerCase().includes(ownerSearch.toLowerCase()) || u.email.toLowerCase().includes(ownerSearch.toLowerCase())
  );
  const currentModuleLabel = SE_MODULES.find(m => m.value === seModule)?.label ?? "Companies";

  const initials = (name: string) => name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={overlay}>
      <div style={backdrop} onClick={step === "loading" || step === "submitting" ? undefined : onClose} />
      <div style={modal}>
        {/* Header */}
        <div style={header}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Create Task</div>
          {step !== "loading" && step !== "submitting" && (
            <button style={closeBtn} onClick={onClose}><FontAwesomeIcon icon={faTimes} /></button>
          )}
        </div>

        {/* Loading / Submitting */}
        {(step === "loading" || step === "submitting") && (
          <div style={centerBox}>
            <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 28, color: "#ea580c" }} />
            <div style={{ fontSize: 14, color: "#6b7280" }}>
              {step === "loading" ? "Checking Bigin link…" : "Creating task in Bigin…"}
            </div>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div style={centerBox}>
            <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: 44, color: "#16a34a" }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Task Created!</div>
            <div style={{ fontSize: 14, color: "#6b7280", textAlign: "center" }}>
              Added to {effectiveCompany?.name ?? "the company"} in Bigin.
            </div>
            <button style={greenBtn} onClick={onClose}>Done</button>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div style={centerBox}>
            <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: 36, color: "#ef4444" }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Something went wrong</div>
            <div style={{ fontSize: 13, color: "#6b7280", textAlign: "center" }}>{errorMsg}</div>
            <button style={greenBtn} onClick={onClose}>Close</button>
          </div>
        )}

        {/* Company selector */}
        {step === "select-company" && (
          <div style={body}>
            <div style={sectionRow}>
              <span style={sectionTitle}>Task Information</span>
            </div>
            <label style={fieldLabel}>Related To — Select Company</label>
            <div style={searchBox}>
              <FontAwesomeIcon icon={faSearch} style={{ color: "#9ca3af", fontSize: 13 }} />
              <input style={searchInput} placeholder="Search companies…" value={companySearch}
                onChange={e => setCompanySearch(e.target.value)} autoFocus />
              {loadingCompanies && <FontAwesomeIcon icon={faSpinner} spin style={{ color: "#9ca3af", fontSize: 12 }} />}
            </div>
            <div style={listBox}>
              {!loadingCompanies && allCompanies.length === 0 && <div style={emptyText}>No companies found</div>}
              {allCompanies.map(c => (
                <button key={c.id} style={listItem} onClick={() => handleSelectCompany(c)}>
                  <FontAwesomeIcon icon={faBuilding} style={{ color: "#9ca3af", fontSize: 12 }} />
                  <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Task form */}
        {step === "form" && (
          <div style={body}>
            {/* Section header with Owner */}
            <div style={sectionRow}>
              <span style={sectionTitle}>Task Information</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#6b7280" }}>Owner</span>
                {/* Owner dropdown */}
                <div ref={ownerRef} style={{ position: "relative" }}>
                  <button style={ownerBtn} onClick={() => setOwnerDropOpen(v => !v)}>
                    <span style={ownerAvatar}>
                      {selectedOwner ? initials(selectedOwner.name) : <FontAwesomeIcon icon={faUser} style={{ fontSize: 10 }} />}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#374151", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selectedOwner ? selectedOwner.name : "Select owner"}
                    </span>
                    <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 10, color: "#9ca3af" }} />
                  </button>
                  {ownerDropOpen && (
                    <div style={dropdownBox}>
                      <div style={searchBox}>
                        <FontAwesomeIcon icon={faSearch} style={{ color: "#9ca3af", fontSize: 12 }} />
                        <input style={searchInput} placeholder="Search…" value={ownerSearch}
                          onChange={e => setOwnerSearch(e.target.value)} autoFocus />
                      </div>
                      <div style={{ maxHeight: 200, overflowY: "auto" }}>
                        {filteredUsers.length === 0 && <div style={emptyText}>No users found</div>}
                        {filteredUsers.map(u => (
                          <button key={u.id} style={listItem} onClick={() => { setSelectedOwner(u); setOwnerDropOpen(false); setOwnerSearch(""); }}>
                            <span style={{ ...ownerAvatar, fontSize: 10 }}>{initials(u.name)}</span>
                            <div style={{ flex: 1, textAlign: "left" }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{u.name}</div>
                              <div style={{ fontSize: 11, color: "#9ca3af" }}>{u.email}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Task Name */}
            <div style={formRow}>
              <label style={fieldLabel}>Task Name <span style={{ color: "#ef4444" }}>*</span></label>
              <input style={textInput} placeholder="Enter task name…" value={taskName}
                onChange={e => setTaskName(e.target.value)} autoFocus />
            </div>

            {/* Due Date */}
            <div style={formRow}>
              <label style={fieldLabel}>Due Date</label>
              <input style={textInput} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>

            {/* Repeat */}
            <div style={checkRow} onClick={() => setRepeat(v => !v)}>
              <div style={checkbox(repeat)} />
              <span style={{ fontSize: 14, color: "#374151" }}>Repeat</span>
            </div>

            {/* Reminder */}
            <div style={checkRow} onClick={() => setReminder(v => !v)}>
              <div style={checkbox(reminder)} />
              <span style={{ fontSize: 14, color: "#374151" }}>Reminder</span>
            </div>

            {/* Related To */}
            <div style={formRow}>
              <label style={fieldLabel}>Related To</label>
              <div style={relatedToRow}>
                {/* Module type dropdown */}
                <div ref={moduleRef} style={{ position: "relative" }}>
                  <button style={moduleBtn} onClick={() => setModuleDropOpen(v => !v)}>
                    {currentModuleLabel}
                    <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 10, color: "#9ca3af" }} />
                  </button>
                  {moduleDropOpen && (
                    <div style={{ ...dropdownBox, width: 150, left: 0 }}>
                      {SE_MODULES.map(m => (
                        <button key={m.value} style={{ ...listItem, background: seModule === m.value ? "#f0fdf4" : "#fff" }}
                          onClick={() => { setSeModule(m.value); setModuleDropOpen(false); }}>
                          <span style={{ fontSize: 13, color: seModule === m.value ? "#16a34a" : "#374151", fontWeight: seModule === m.value ? 600 : 400 }}>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Company name box */}
                <div style={relatedToValue}>
                  <FontAwesomeIcon icon={faBuilding} style={{ color: "#6b7280", fontSize: 12 }} />
                  <span style={{ flex: 1, fontSize: 14, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {effectiveCompany?.name}
                  </span>
                  {!linkedCompany && (
                    <button style={changeLinkBtn} onClick={() => { setSelectedCompany(null); setStep("select-company"); }}>×</button>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div style={formRow}>
              <label style={fieldLabel}>Description</label>
              <textarea style={textArea} placeholder="A few words about this task…" value={description}
                onChange={e => setDescription(e.target.value)} rows={3} />
            </div>

            {/* Mark as High Priority */}
            <div style={checkRow} onClick={() => setHighPriority(v => !v)}>
              <div style={checkbox(highPriority)} />
              <span style={{ fontSize: 14, color: "#374151" }}>Mark as High Priority</span>
            </div>

            {/* Mark as completed */}
            <div style={checkRow} onClick={() => setMarkCompleted(v => !v)}>
              <div style={checkbox(markCompleted)} />
              <span style={{ fontSize: 14, color: "#374151" }}>Mark as completed</span>
            </div>

            {errorMsg && (
              <div style={errorBanner}>
                <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: 12 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Footer */}
            <div style={footerRow}>
              <button style={cancelBtn} onClick={onClose}>Cancel</button>
              <button style={greenBtn} onClick={handleSubmit}>Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" };
const backdrop: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" };
const modal: React.CSSProperties = { position: "relative", zIndex: 1, background: "#fff", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", width: 520, maxWidth: "calc(100vw - 32px)", maxHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column", overflow: "hidden" };
const header: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #f0f0f0" };
const closeBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18, padding: "2px 4px" };
const body: React.CSSProperties = { padding: "20px 24px 24px", overflowY: "auto", flex: 1 };
const centerBox: React.CSSProperties = { padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 };
const sectionRow: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 };
const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#374151" };
const formRow: React.CSSProperties = { marginBottom: 16 };
const fieldLabel: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 };
const textInput: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box" };
const textArea: React.CSSProperties = { ...textInput, resize: "vertical", fontFamily: "inherit", minHeight: 72 };

const checkRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 12, userSelect: "none" };
const checkbox = (checked: boolean): React.CSSProperties => ({
  width: 16, height: 16, borderRadius: 3, border: checked ? "none" : "1.5px solid #d1d5db",
  background: checked ? "#16a34a" : "#fff", flexShrink: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
  boxShadow: checked ? "none" : "inset 0 1px 2px rgba(0,0,0,0.05)",
  position: "relative",
});

const ownerBtn: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 20, padding: "5px 10px", cursor: "pointer", fontSize: 13 };
const ownerAvatar: React.CSSProperties = { width: 22, height: 22, borderRadius: "50%", background: "#16a34a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 };

const dropdownBox: React.CSSProperties = { position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, width: 260, overflow: "hidden" };

const relatedToRow: React.CSSProperties = { display: "flex", gap: 8 };
const moduleBtn: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", cursor: "pointer", fontSize: 13, color: "#374151", whiteSpace: "nowrap" };
const relatedToValue: React.CSSProperties = { flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, background: "#f9fafb", overflow: "hidden" };
const changeLinkBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af", padding: 0, lineHeight: 1 };

const searchBox: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid #f0f0f0" };
const searchInput: React.CSSProperties = { flex: 1, border: "none", outline: "none", fontSize: 13, color: "#111827" };
const listBox: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden", maxHeight: 240, overflowY: "auto" };
const listItem: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", background: "#fff", border: "none", borderBottom: "1px solid #f3f4f6", cursor: "pointer", fontSize: 14, color: "#374151" };
const emptyText: React.CSSProperties = { textAlign: "center", padding: "16px 0", fontSize: 13, color: "#9ca3af" };

const footerRow: React.CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 };
const cancelBtn: React.CSSProperties = { padding: "8px 20px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: "pointer", color: "#374151" };
const greenBtn: React.CSSProperties = { padding: "8px 24px", background: "#16a34a", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#fff" };
const errorBanner: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 13, color: "#b91c1c", marginBottom: 12 };
