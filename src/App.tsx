import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import NavBar from "./components/NavBar";
import FormFilling from "./components/FormFilling";
import SavedFiles from "./components/SavedFiles";
// import AdminPanel from "./components/AdminPanel";
import AdminLogin from "./components/AdminLogin";
import AdminPanel from "./components/AdminPanel";
import ApprovalDocuments from "./components/ApprovalDocuments";
import PriceChanges from "./components/PriceChanges";
import AdminPricesPage from "./components/pages/AdminPricesPage";

export default function App() {
  return (
    <Router>
      <div className="shell">
        <NavBar />
        <main className="page-body">
          <Routes>
            <Route path="/" element={<Navigate to="/form-filling" />} />
            <Route path="/form-filling" element={<FormFilling />} />
            <Route path="/saved-pdfs" element={<SavedFiles />} />
            {/* <Route path="/admin-panel" element={<AdminPanel />} /> */}
            <Route path="/admin-Login" element={<AdminLogin/>} />
            <Route path="/admin-panel" element={<AdminPanel />} /> 
            <Route path="/approval-documents" element={<ApprovalDocuments />} />
            <Route path="/price-changes" element={<PriceChanges />} />
            
          </Routes>
        </main>
      </div>
    </Router>
  );
}
