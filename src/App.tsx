import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import NavBar from "./components/NavBar";
import Home from "./components/Home";
import FormFilling from "./components/FormFilling";
import SavedFiles from "./components/SavedFiles";
import AdminLogin from "./components/AdminLogin";
import AdminPanel from "./components/AdminPanel";
import ApprovalDocuments from "./components/ApprovalDocuments";
import PriceChanges from "./components/PriceChanges";
import AdminPricesPage from "./components/pages/AdminPricesPage";
import { AdminDashboard } from "./components/admin";

export default function App() {
  return (
    <Router>
      <div className="shell">
        <NavBar />
        <main className="page-body">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/form-filling" element={<FormFilling />} />
            <Route path="/saved-pdfs" element={<SavedFiles />} />
            <Route path="/admin-Login" element={<AdminLogin/>} />
            <Route path="/admin-panel" element={<AdminPanel />} />
            <Route path="/approval-documents" element={<ApprovalDocuments />} />
            <Route path="/price-changes" element={<PriceChanges />} />
            <Route path="/pricing-tables" element={<AdminDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
