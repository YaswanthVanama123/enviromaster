import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import "./App.css";
import NavBar from "./components/NavBar";
import Home from "./components/Home";
import FormFilling from "./components/FormFilling";
import SavedFilesAgreements from "./components/SavedFilesAgreements"; // ✅ UPDATED: Use new folder-like component
import PDFViewer from "./components/PDFViewer";
import AdminLogin from "./components/AdminLogin";
import AdminPanel from "./components/AdminPanel";
import ApprovalDocuments from "./components/ApprovalDocuments";
import PriceChanges from "./components/PriceChanges";
import { AdminDashboard } from "./components/admin";

function AppContent() {
  const location = useLocation();
  const isEditMode = location.pathname.startsWith('/edit/pdf');

  return (
    <div className={`shell ${isEditMode ? 'edit-mode' : ''}`}>
      {!isEditMode && <NavBar />}
      <main className={`page-body ${isEditMode ? 'edit-mode-body' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/form-filling" element={<FormFilling />} />
          <Route path="/edit/pdf/:id?" element={<FormFilling />} />
          <Route path="/saved-pdfs" element={<SavedFilesAgreements />} />
          <Route path="/pdf-viewer" element={<PDFViewer />} />
          <Route path="/admin-login" element={<AdminLogin/>} />
          <Route path="/admin-panel/:tab/services/:modalType?/:itemId?" element={<AdminPanel />} />
          <Route path="/admin-panel/:tab/products/:modalType?/:itemId?" element={<AdminPanel />} />
          <Route path="/admin-panel/:tab?/:subtab?/:familyKey?/:modalType?/:itemId?" element={<AdminPanel />} />
          <Route path="/approval-documents" element={<ApprovalDocuments />} />
          <Route path="/price-changes" element={<PriceChanges />} />
          <Route path="/pricing-tables/services/:modalType?/:itemId?" element={<AdminDashboard />} />
          <Route path="/pricing-tables/products/:modalType?/:itemId?" element={<AdminDashboard />} />
          <Route path="/pricing-tables/:subtab?/:modalType?/:itemId?" element={<AdminDashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
