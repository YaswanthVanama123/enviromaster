import React, { useState } from 'react';
import {
  shareViaPdf,
  createPdfEmailData
} from '../utils/webmailService';

const EmailTester: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');

  const handleTestEmail = () => {
    try {
      const { emailData, attachment } = createPdfEmailData({
        fileName: 'Test Document.pdf',
        status: 'Draft',
        downloadUrl: 'https://example.com/test.pdf',
        isApprovalRequest: false
      });

      shareViaPdf(emailData, attachment);
      setTestResult('✅ Email client opened and PDF download initiated successfully!');
    } catch (error) {
      setTestResult(`❌ Email test failed: ${error}`);
    }
  };

  return (
    <div style={{
      padding: '20px',
      border: '2px solid #007bff',
      borderRadius: '8px',
      margin: '20px',
      backgroundColor: '#f8f9fa'
    }}>
      <h2>📧 Email Integration Tester</h2>
      <p><strong>Note:</strong> This tests the new mailto-based email functionality.</p>

      <div style={{ marginBottom: '20px' }}>
        <h3>Testing</h3>
        <button
          onClick={handleTestEmail}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Email Compose
        </button>
      </div>

      {testResult && (
        <div>
          <h3>Results</h3>
          <pre style={{
            backgroundColor: '#e9ecef',
            padding: '10px',
            borderRadius: '4px',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            {testResult}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '20px', backgroundColor: '#fff3cd', padding: '10px', borderRadius: '4px' }}>
        <h4>📋 Testing Instructions</h4>
        <ol>
          <li><strong>Test Email:</strong> Click "Test Email Compose" to open your default email client</li>
          <li><strong>Check PDF Download:</strong> A PDF file should download automatically for attachment</li>
          <li><strong>Verify Email Client:</strong> Your default email client should open with pre-filled subject and body</li>
          <li><strong>Manual Attachment:</strong> Attach the downloaded PDF to the email manually</li>
        </ol>
      </div>

      <div style={{ marginTop: '20px', backgroundColor: '#d1ecf1', padding: '10px', borderRadius: '4px' }}>
        <h4>🔧 How it works</h4>
        <ul>
          <li><strong>Opens default email client:</strong> Uses mailto: links to open your system email client</li>
          <li><strong>Automatic PDF download:</strong> Downloads PDF file for manual attachment</li>
          <li><strong>Pre-filled content:</strong> Subject and body are automatically filled</li>
          <li><strong>No webmail dependency:</strong> Works with any email client (Outlook, Mail, etc.)</li>
        </ul>
      </div>
    </div>
  );
};

export default EmailTester;
