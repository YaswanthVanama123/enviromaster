/**
 * WebmailTester Component
 *
 * A testing component to help configure and test webmail integration
 * for EnviroMaster PDF sharing functionality.
 *
 * Usage:
 * 1. Add this component to your app temporarily for testing
 * 2. Test different webmail client configurations
 * 3. Find the correct URL format for your cPanel setup
 * 4. Remove this component once testing is complete
 */

import React, { useState } from 'react';
import {
  shareViaPdf,
  createPdfEmailData,
  testWebmailConnectivity,
  getWebmailClientOptions,
  WebmailConfig
} from '../utils/webmailService';

const WebmailTester: React.FC = () => {
  const [config, setConfig] = useState<WebmailConfig>({
    baseUrl: 'https://enviromasternva.com:2096',
    client: 'roundcube',
    fallbackToMailto: true
  });

  const [testResult, setTestResult] = useState<string>('');
  const [testing, setTesting] = useState(false);

  const webmailOptions = getWebmailClientOptions();

  // Test webmail connectivity
  const handleTestConnectivity = async () => {
    setTesting(true);
    setTestResult('Testing webmail connectivity...');

    try {
      const result = await testWebmailConnectivity(config);
      setTestResult(`
Test Result: ${result.success ? '✅ Success' : '❌ Failed'}
Message: ${result.message}
Tested URL: ${result.testedUrl}
      `);
    } catch (error) {
      setTestResult(`❌ Test failed: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  // Test actual email compose functionality
  const handleTestEmail = () => {
    try {
      const testEmailData = createPdfEmailData({
        fileName: 'Test Document.pdf',
        status: 'Draft',
        downloadUrl: 'https://example.com/test.pdf',
        isApprovalRequest: false
      });

      shareViaPdf(testEmailData, config);
      setTestResult('✅ Email compose tab opened successfully!');
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
      <h2>🧪 Webmail Integration Tester</h2>
      <p><strong>Note:</strong> This is a temporary testing component. Remove after configuration is complete.</p>

      {/* Configuration Section */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Configuration</h3>

        <div style={{ marginBottom: '10px' }}>
          <label>
            <strong>Base URL:</strong>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              style={{
                marginLeft: '10px',
                padding: '5px',
                width: '300px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            <strong>Webmail Client:</strong>
            <select
              value={config.client}
              onChange={(e) => setConfig({ ...config, client: e.target.value as WebmailConfig['client'] })}
              style={{
                marginLeft: '10px',
                padding: '5px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            >
              {webmailOptions.map(option => (
                <option key={option.client} value={option.client}>
                  {option.name} - {option.description}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            <input
              type="checkbox"
              checked={config.fallbackToMailto}
              onChange={(e) => setConfig({ ...config, fallbackToMailto: e.target.checked })}
            />
            <span style={{ marginLeft: '5px' }}><strong>Fallback to mailto if webmail fails</strong></span>
          </label>
        </div>
      </div>

      {/* Testing Buttons */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Testing</h3>
        <button
          onClick={handleTestConnectivity}
          disabled={testing}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px',
            cursor: testing ? 'not-allowed' : 'pointer'
          }}
        >
          {testing ? 'Testing...' : 'Test Connectivity'}
        </button>

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

      {/* Results */}
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

      {/* URL Preview */}
      <div style={{ marginTop: '20px' }}>
        <h3>Generated URL Preview</h3>
        <p><strong>Current configuration will generate URLs like:</strong></p>
        <code style={{
          backgroundColor: '#e9ecef',
          padding: '5px',
          borderRadius: '4px',
          display: 'block',
          wordBreak: 'break-all'
        }}>
          {config.baseUrl}/webmail/{
            config.client === 'roundcube' ? '?_task=mail&_action=compose&_to=&_subject=SUBJECT&_body=BODY' :
            config.client === 'horde' ? 'horde/imp/dynamic.php?page=compose&to=&subject=SUBJECT&body=BODY' :
            config.client === 'squirrelmail' ? 'src/compose.php?send_to=&subject=SUBJECT&body=BODY' :
            'compose.php?to=&subject=SUBJECT&body=BODY'
          }
        </code>
      </div>

      {/* Instructions */}
      <div style={{ marginTop: '20px', backgroundColor: '#fff3cd', padding: '10px', borderRadius: '4px' }}>
        <h4>📋 Testing Instructions</h4>
        <ol>
          <li><strong>Test Connectivity:</strong> Click "Test Connectivity" to check if your webmail URL is accessible</li>
          <li><strong>Test Email:</strong> Click "Test Email Compose" to open a test email compose tab</li>
          <li><strong>Try Different Clients:</strong> If one doesn't work, try different webmail client options</li>
          <li><strong>Check Browser Console:</strong> Open browser dev tools to see detailed error messages</li>
          <li><strong>Verify URL:</strong> Check if the generated URL matches your actual webmail compose page</li>
        </ol>
      </div>

      {/* Common Issues */}
      <div style={{ marginTop: '20px', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '4px' }}>
        <h4>🚨 Common Issues & Solutions</h4>
        <ul>
          <li><strong>Popup Blocked:</strong> Allow popups for your domain in browser settings</li>
          <li><strong>Wrong URL Format:</strong> Try different webmail client options</li>
          <li><strong>SSL Certificate Issues:</strong> Your webmail might need proper SSL setup</li>
          <li><strong>Authentication Required:</strong> User might need to log into webmail first</li>
          <li><strong>CORS Issues:</strong> This is normal for connectivity testing, email compose should still work</li>
        </ul>
      </div>
    </div>
  );
};

export default WebmailTester;