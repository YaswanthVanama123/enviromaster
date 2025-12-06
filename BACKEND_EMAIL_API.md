# Backend Email API Implementation Guide

This document describes the backend API endpoints required to support the new in-app email composer with automatic PDF attachment functionality.

## Required Endpoints

### 1. Send Email with PDF by Document ID

**Endpoint:** `POST /api/email/send-with-pdf/:documentId`

**Description:** Sends an email with a PDF attachment using the document ID to fetch the PDF from the system.

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "from": "sender@enviromasternva.com",
  "subject": "Document Title - Status",
  "body": "Email message body...",
  "fileName": "Document Name.pdf"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "messageId": "optional-email-id"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message description"
}
```

### 2. Send Email with File Upload (Alternative)

**Endpoint:** `POST /api/email/send`

**Description:** Sends an email with a PDF attachment uploaded as form data.

**Request:** `multipart/form-data`
- `to`: string - Recipient email
- `from`: string - Sender email
- `subject`: string - Email subject
- `body`: string - Email body
- `attachment`: file - PDF file to attach

**Response:** Same as above

## Backend Implementation Requirements

### Email Service Setup
You'll need to configure an email service such as:
- **Nodemailer** with SMTP (recommended for most setups)
- **SendGrid** API
- **Amazon SES**
- **Mailgun** API

### Example Implementation (Node.js/Express with Nodemailer)

```javascript
const nodemailer = require('nodemailer');
const multer = require('multer');

// Configure email transporter
const transporter = nodemailer.createTransporter({
  host: 'smtp.enviromasternva.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Send email with PDF by document ID
app.post('/api/email/send-with-pdf/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { to, from, subject, body, fileName } = req.body;

    // Fetch PDF from your existing PDF service
    const pdfBuffer = await getPdfBufferById(documentId);

    const mailOptions = {
      from: from,
      to: to,
      subject: subject,
      text: body,
      attachments: [{
        filename: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    };

    const info = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email'
    });
  }
});
```

## Environment Variables

Add these to your backend environment:

```
SMTP_HOST=smtp.enviromasternva.com
SMTP_PORT=587
SMTP_USER=your-email@enviromasternva.com
SMTP_PASS=your-email-password
```

## Security Considerations

1. **Rate Limiting:** Implement rate limiting to prevent email spam
2. **Validation:** Validate email addresses and sanitize input
3. **File Size Limits:** Limit PDF file sizes (e.g., 10MB max)
4. **Authentication:** Ensure only authenticated users can send emails
5. **Email Logging:** Log all email sends for audit purposes

## Frontend Integration

The frontend EmailComposer component will automatically:
1. Load the PDF blob from the document ID
2. Show PDF attachment info (filename, size)
3. Send email request to your backend
4. Handle success/error responses
5. Display user-friendly messages

This replaces the previous `mailto:` approach and provides true automatic PDF attachment functionality.