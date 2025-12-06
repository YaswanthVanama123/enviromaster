/**
 * Webmail Integration Service
 * Handles PDF sharing through EnviroMaster's webmail system
 */

export interface WebmailConfig {
  baseUrl: string;
  client: 'roundcube' | 'horde' | 'squirrelmail' | 'generic';
  fallbackToMailto: boolean;
}

export interface EmailData {
  subject: string;
  body: string;
  to?: string;
}

// Default configuration for EnviroMaster webmail
const DEFAULT_CONFIG: WebmailConfig = {
  baseUrl: 'https://enviromasternva.com:2096',
  client: 'roundcube', // Most common cPanel webmail client
  fallbackToMailto: true
};

/**
 * Generate webmail compose URL based on client type
 */
function generateWebmailUrl(config: WebmailConfig, emailData: EmailData): string {
  const { baseUrl, client } = config;
  const { subject, body, to = '' } = emailData;

  // Encode parameters for URL
  const encodedTo = encodeURIComponent(to);
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);

  switch (client) {
    case 'roundcube':
      return `${baseUrl}/webmail/?_task=mail&_action=compose&_to=${encodedTo}&_subject=${encodedSubject}&_body=${encodedBody}`;

    case 'horde':
      return `${baseUrl}/webmail/horde/imp/dynamic.php?page=compose&to=${encodedTo}&subject=${encodedSubject}&body=${encodedBody}`;

    case 'squirrelmail':
      return `${baseUrl}/webmail/src/compose.php?send_to=${encodedTo}&subject=${encodedSubject}&body=${encodedBody}`;

    case 'generic':
    default:
      return `${baseUrl}/webmail/compose.php?to=${encodedTo}&subject=${encodedSubject}&body=${encodedBody}`;
  }
}

/**
 * Generate mailto fallback URL
 */
function generateMailtoUrl(emailData: EmailData): string {
  const { subject, body, to = '' } = emailData;
  const encodedTo = encodeURIComponent(to);
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);

  return `mailto:${encodedTo}?subject=${encodedSubject}&body=${encodedBody}`;
}

/**
 * Open webmail compose tab with PDF sharing content
 */
export function shareViaPdf(emailData: EmailData, config: WebmailConfig = DEFAULT_CONFIG): void {
  try {
    const webmailUrl = generateWebmailUrl(config, emailData);

    // Open webmail in new tab (not window)
    const newWindow = window.open(webmailUrl, '_blank');

    // Check if popup was blocked or failed to open
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      throw new Error('Unable to open webmail tab');
    }

    // Focus the new tab
    newWindow.focus();

    console.log('✅ Webmail compose tab opened successfully');

  } catch (error) {
    console.warn('⚠️ Webmail failed, falling back to mailto:', error);

    if (config.fallbackToMailto) {
      // Fallback to mailto if webmail fails
      const mailtoUrl = generateMailtoUrl(emailData);
      window.location.href = mailtoUrl;
    } else {
      // Re-throw error if no fallback desired
      throw new Error(`Failed to open webmail: ${error}`);
    }
  }
}

/**
 * Test webmail connectivity and URL format
 */
export async function testWebmailConnectivity(config: WebmailConfig = DEFAULT_CONFIG): Promise<{
  success: boolean;
  message: string;
  testedUrl: string;
}> {
  const testEmailData: EmailData = {
    subject: 'EnviroMaster Webmail Test',
    body: 'This is a test message to verify webmail integration is working.',
    to: ''
  };

  const testUrl = generateWebmailUrl(config, testEmailData);

  try {
    // Try to fetch the webmail page to check if it's accessible
    const response = await fetch(testUrl, {
      method: 'HEAD',
      mode: 'no-cors' // Avoid CORS issues for testing
    });

    return {
      success: true,
      message: 'Webmail appears to be accessible',
      testedUrl: testUrl
    };
  } catch (error) {
    return {
      success: false,
      message: `Unable to reach webmail: ${error}`,
      testedUrl: testUrl
    };
  }
}

/**
 * Get all available webmail client options for testing
 */
export function getWebmailClientOptions(): Array<{
  client: WebmailConfig['client'];
  name: string;
  description: string;
}> {
  return [
    {
      client: 'roundcube',
      name: 'RoundCube',
      description: 'Modern webmail interface (most common in cPanel)'
    },
    {
      client: 'horde',
      name: 'Horde',
      description: 'Feature-rich webmail with calendar integration'
    },
    {
      client: 'squirrelmail',
      name: 'SquirrelMail',
      description: 'Lightweight, simple webmail interface'
    },
    {
      client: 'generic',
      name: 'Generic',
      description: 'Generic cPanel webmail URL format'
    }
  ];
}

/**
 * Create email data for PDF document sharing
 */
export function createPdfEmailData(options: {
  fileName?: string;
  status?: string;
  downloadUrl: string;
  isApprovalRequest?: boolean;
  updatedAt?: string;
}): EmailData {
  const { fileName, status, downloadUrl, isApprovalRequest, updatedAt } = options;

  const docName = fileName || "Customer Header Document";
  const subjectSuffix = isApprovalRequest ? " - Approval Request" : "";
  const subject = `${docName}${subjectSuffix}`;

  let body = `Hello,\n\n`;

  if (isApprovalRequest) {
    body += `Please review the following customer header document for approval.\n\n`;
  } else {
    body += `Please find the attached customer header document.\n\n`;
  }

  body += `Document: ${docName}\n`;

  if (status) {
    body += `Status: ${status}\n`;
  }

  if (updatedAt) {
    body += `Updated: ${updatedAt}\n`;
  }

  body += `\nYou can download the PDF here:\n${downloadUrl}\n\nBest regards`;

  return {
    subject,
    body
  };
}

export default {
  shareViaPdf,
  testWebmailConnectivity,
  getWebmailClientOptions,
  createPdfEmailData,
  DEFAULT_CONFIG
};