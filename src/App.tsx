import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import "./App.css";
import NavBar from "./components/NavBar";
import Home from "./components/Home";
import FormFilling from "./components/FormFilling";
import SavedFilesAgreements from "./components/SavedFilesAgreements";
import TrashView from "./components/TrashView";
import PDFViewer from "./components/PDFViewer";
import AdminPanel from "./components/AdminPanel";
import ApprovalDocuments from "./components/ApprovalDocuments";
import PriceChanges from "./components/PriceChanges";
import MyCommissions from "./components/MyCommissions";
import MyQuota from "./components/MyQuota";
import AdminCommissions from "./components/AdminCommissions";
import { AdminDashboard } from "./components/admin";
import { LoginPage } from "./components/LoginPage";
import { AuthProvider, AuthGuard } from "./components/auth";

function AppContent() {
  const location = useLocation();
  const isEditMode = location.pathname.startsWith('/edit/pdf');
  const isLoginPage = location.pathname === '/login';

  return (
    <div className={`shell ${isEditMode ? 'edit-mode' : ''}`}>
      {!isEditMode && !isLoginPage && <NavBar />}
      <main className={`page-body ${isEditMode ? 'edit-mode-body' : ''}`}>
        <Routes>
          {/* Public route - Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Legacy admin-login redirect to new login */}
          <Route path="/admin-login" element={<LoginPage />} />

          {/* Protected routes - Any authenticated user */}
          <Route element={<AuthGuard />}>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/form-filling" element={<FormFilling />} />
            <Route path="/edit/pdf/:id?" element={<FormFilling />} />
            <Route path="/saved-pdfs" element={<SavedFilesAgreements />} />
            <Route path="/trash" element={<TrashView />} />
            <Route path="/pdf-viewer" element={<PDFViewer />} />
            <Route path="/approval-documents" element={<ApprovalDocuments />} />
            <Route path="/price-changes" element={<PriceChanges />} />
            <Route path="/my-commissions" element={<MyCommissions />} />
            <Route path="/my-quota" element={<MyQuota />} />
          </Route>

          {/* Admin-only routes */}
          <Route element={<AuthGuard requireAdmin />}>
            <Route path="/admin-commissions" element={<AdminCommissions />} />
            <Route path="/admin-panel/:tab/services/:modalType?/:itemId?" element={<AdminPanel />} />
            <Route path="/admin-panel/:tab/products/:modalType?/:itemId?" element={<AdminPanel />} />
            <Route path="/admin-panel/:tab?/:subtab?/:familyKey?/:modalType?/:itemId?" element={<AdminPanel />} />
            <Route path="/pricing-tables/services/:modalType?/:itemId?" element={<AdminDashboard />} />
            <Route path="/pricing-tables/products/:modalType?/:itemId?" element={<AdminDashboard />} />
            <Route path="/pricing-tables/:subtab?/:modalType?/:itemId?" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}
