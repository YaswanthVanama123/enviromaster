import React, { useRef } from "react";
import { FaTimes, FaDownload } from "react-icons/fa";
import "./PayrollSlipModal.css";

interface Agreement {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  monthlyValue: number;
  annualCommission: number;
}

interface EmployeePayroll {
  username: string;
  totalAgreements: number;
  totalMonthlyRevenue: number;
  totalAnnualCommission: number;
  statusCounts: {
    draft: number;
    saved: number;
    pending_approval: number;
    approved: number;
    active: number;
  };
  agreements: Agreement[];
}

interface PayrollPeriod {
  start: string;
  end: string;
  label: string;
}

interface PayrollSlipModalProps {
  employee: EmployeePayroll;
  period: PayrollPeriod;
  onClose: () => void;
}

export const PayrollSlipModal: React.FC<PayrollSlipModalProps> = ({
  employee,
  period,
  onClose,
}) => {
  const slipRef = useRef<HTMLDivElement>(null);

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const formatShortDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

  const today = new Date();
  const payDate = formatDate(today.toISOString());
  const checkNumber = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${employee.username.toUpperCase().slice(0, 3)}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

  const handleDownloadPDF = () => {
    const printContent = slipRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const styles = `
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          font-family: 'Arial', sans-serif;
          background: white;
          color: #000;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .payroll-document {
          width: 100%;
          max-width: 100%;
          margin: 0;
          padding: 40px 50px;
          background: white;
        }
        .payroll-doc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #6366f1;
        }
        .company-logo-section h1 {
          font-size: 28px;
          font-weight: 800;
          color: #6366f1;
          letter-spacing: -0.5px;
        }
        .company-logo-section .tagline {
          font-size: 11px;
          color: #4a5568;
          margin-top: 2px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .company-logo-section .address {
          font-size: 11px;
          color: #718096;
          margin-top: 8px;
          line-height: 1.5;
        }
        .payroll-title-section {
          text-align: right;
        }
        .payroll-title-section h2 {
          font-size: 24px;
          font-weight: 700;
          color: #6366f1;
          text-transform: uppercase;
          letter-spacing: 3px;
        }
        .payroll-title-section .pay-date {
          font-size: 13px;
          color: #4a5568;
          margin-top: 8px;
        }
        .payroll-title-section .check-no {
          font-size: 12px;
          color: #718096;
          margin-top: 4px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        .info-box {
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }
        .info-box-header {
          background: #6366f1;
          color: white;
          padding: 10px 16px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .info-box-content {
          padding: 16px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
          font-size: 13px;
        }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #4a5568; }
        .info-value { font-weight: 600; color: #1a202c; }
        .earnings-section {
          margin-bottom: 30px;
        }
        .section-title {
          background: #6366f1;
          color: white;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-radius: 4px 4px 0 0;
        }
        .earnings-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #e2e8f0;
          border-top: none;
        }
        .earnings-table th {
          background: #f7fafc;
          padding: 12px 16px;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          color: #4a5568;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #e2e8f0;
        }
        .earnings-table th:nth-child(3),
        .earnings-table th:nth-child(4) { text-align: right; }
        .earnings-table td {
          padding: 14px 16px;
          font-size: 13px;
          border-bottom: 1px solid #f0f0f0;
          vertical-align: top;
        }
        .earnings-table td:nth-child(3),
        .earnings-table td:nth-child(4) { text-align: right; }
        .earnings-table tr:last-child td { border-bottom: none; }
        .agreement-name { font-weight: 600; color: #1a202c; }
        .agreement-date { font-size: 11px; color: #718096; margin-top: 2px; }
        .status-tag {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-tag.active { background: #ede9fe; color: #7c3aed; }
        .status-tag.saved { background: #dbeafe; color: #2563eb; }
        .status-tag.pending_approval { background: #fef3c7; color: #d97706; }
        .status-tag.approved { background: #e0e7ff; color: #4338ca; }
        .status-tag.draft { background: #e2e8f0; color: #4a5568; }
        .commission-amount { font-weight: 700; color: #7c3aed; }
        .summary-section {
          margin-bottom: 30px;
        }
        .summary-box {
          border: 2px solid #6366f1;
          border-radius: 4px;
          overflow: hidden;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 14px 20px;
          font-size: 14px;
          border-bottom: 1px solid #e2e8f0;
        }
        .summary-row:last-child { border-bottom: none; }
        .summary-row .label { color: #4a5568; }
        .summary-row .value { font-weight: 600; color: #1a202c; }
        .summary-row.total {
          background: #6366f1;
          color: white;
        }
        .summary-row.total .label {
          font-weight: 700;
          font-size: 16px;
          color: white;
        }
        .summary-row.total .value {
          font-size: 24px;
          font-weight: 800;
          color: white;
        }
        .footer-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          margin-top: 50px;
          padding-top: 30px;
        }
        .signature-block {
          text-align: center;
        }
        .signature-line {
          border-top: 2px solid #1a202c;
          margin-top: 60px;
          padding-top: 10px;
        }
        .signature-name {
          font-size: 13px;
          font-weight: 600;
          color: #1a202c;
        }
        .signature-title {
          font-size: 11px;
          color: #718096;
          margin-top: 2px;
        }
        @media print {
          html, body { padding: 0; margin: 0; }
          .payroll-document { max-width: 100%; margin: 0; padding: 40px 50px; }
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payroll Statement - ${employee.username}</title>
          ${styles}
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div className="payroll-modal-overlay" onClick={onClose}>
      <div className="payroll-modal" onClick={(e) => e.stopPropagation()}>
        <div className="payroll-modal-header">
          <h2>Payroll Statement</h2>
          <div className="modal-actions">
            <button className="modal-btn download-btn" onClick={handleDownloadPDF}>
              <FaDownload /> Download PDF
            </button>
            <button className="modal-btn close-btn" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="payroll-modal-content">
          <div className="payroll-document" ref={slipRef}>
            {}
            <div className="payroll-doc-header">
              <div className="company-logo-section">
                <h1>ENVIRO-MASTER</h1>
                <div className="tagline">Services International</div>
                <div className="address">
                  1234 Corporate Boulevard, Suite 500<br />
                  Charlotte, NC 28202<br />
                  Tel: (704) 555-0123
                </div>
              </div>
              <div className="payroll-title-section">
                <h2>Payroll</h2>
                <div className="pay-date">Pay Date: {payDate}</div>
                <div className="check-no">Check No: {checkNumber}</div>
              </div>
            </div>

            {}
            <div className="info-grid">
              <div className="info-box">
                <div className="info-box-header">Employee Information</div>
                <div className="info-box-content">
                  <div className="info-row">
                    <span className="info-label">Employee Name</span>
                    <span className="info-value">{employee.username}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Employee ID</span>
                    <span className="info-value">EMP-{employee.username.toUpperCase().slice(0, 4)}-001</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Department</span>
                    <span className="info-value">Sales</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Position</span>
                    <span className="info-value">Sales Representative</span>
                  </div>
                </div>
              </div>

              <div className="info-box">
                <div className="info-box-header">Pay Period</div>
                <div className="info-box-content">
                  <div className="info-row">
                    <span className="info-label">Period</span>
                    <span className="info-value">{period.label}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Start Date</span>
                    <span className="info-value">{formatShortDate(period.start)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">End Date</span>
                    <span className="info-value">{formatShortDate(period.end)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Payment Date</span>
                    <span className="info-value">{formatShortDate(today.toISOString())}</span>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="earnings-section">
              <div className="section-title">Commission Earnings</div>
              <table className="earnings-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Contract Value</th>
                    <th>Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {employee.agreements.map((agreement) => (
                    <tr key={agreement.id}>
                      <td>
                        <div className="agreement-name">{agreement.title}</div>
                        <div className="agreement-date">Created: {formatShortDate(agreement.createdAt)}</div>
                      </td>
                      <td>
                        <span className={`status-tag ${agreement.status}`}>
                          {agreement.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{formatMoney(agreement.monthlyValue)}/mo</td>
                      <td className="commission-amount">{formatMoney(agreement.annualCommission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {}
            <div className="summary-section">
              <div className="summary-box">
                <div className="summary-row">
                  <span className="label">Total Agreements</span>
                  <span className="value">{employee.totalAgreements}</span>
                </div>
                <div className="summary-row">
                  <span className="label">Total Monthly Revenue</span>
                  <span className="value">{formatMoney(employee.totalMonthlyRevenue)}</span>
                </div>
                <div className="summary-row">
                  <span className="label">Commission Rate</span>
                  <span className="value">6.00%</span>
                </div>
                <div className="summary-row total">
                  <span className="label">NET PAY</span>
                  <span className="value">{formatMoney(employee.totalAnnualCommission)}</span>
                </div>
              </div>
            </div>

            {}
            <div className="footer-section">
              <div className="signature-block">
                <div className="signature-line">
                  <div className="signature-name">{employee.username}</div>
                  <div className="signature-title">Employee</div>
                </div>
              </div>
              <div className="signature-block">
                <div className="signature-line">
                  <div className="signature-name">Authorized Signatory</div>
                  <div className="signature-title">Payroll Department</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
