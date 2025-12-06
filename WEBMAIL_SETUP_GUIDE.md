# WebMail Integration Setup Guide

## Overview

Your PDF sharing functionality has been upgraded to integrate with your EnviroMaster webmail system at `enviromasternva.com:2096`. When users click the mail icon (📧) in SavedFiles or ApprovalDocuments, it will now open your webmail compose window instead of their default email client.

## What Changed

### Files Modified:
1. **`src/utils/webmailService.ts`** - New webmail integration service
2. **`src/components/SavedFiles.tsx`** - Updated email handler
3. **`src/components/ApprovalDocuments.tsx`** - Updated email handler
4. **`src/components/WebmailTester.tsx`** - Testing component (temporary)

### New Behavior:
- **Before:** Mail icon opened user's default email client with `mailto:` links
- **After:** Mail icon opens webmail compose in new tab with pre-filled subject and body
- **Fallback:** If webmail fails, automatically falls back to `mailto:`

## Setup Instructions

### Step 1: Test the Integration

1. **Add the testing component** temporarily to your app:
   ```tsx
   // In your main App.tsx or any test page
   import WebmailTester from './components/WebmailTester';

   // Add to your component:
   <WebmailTester />
   ```

2. **Test different configurations** using the WebmailTester component
3. **Find the correct webmail client type** for your cPanel setup

### Step 2: Configure for Your System

The default configuration is set to:
```typescript
{
  baseUrl: 'https://enviromasternva.com:2096',
  client: 'roundcube',
  fallbackToMailto: true
}
```

If this doesn't work, try these common cPanel webmail clients:
- **RoundCube** (most common)
- **Horde**
- **SquirrelMail**
- **Generic** (fallback option)

### Step 3: Update Configuration (if needed)

If the default settings don't work, update the configuration in `src/utils/webmailService.ts`:

```typescript
// Line 18-22 in webmailService.ts
const DEFAULT_CONFIG: WebmailConfig = {
  baseUrl: 'https://enviromasternva.com:2096',
  client: 'your_correct_client_type', // Change this
  fallbackToMailto: true
};
```

### Step 4: Test with Real PDFs

1. Create or save a PDF document
2. Go to SavedFiles page
3. Click the mail icon (📧) next to any document
4. Verify it opens your webmail compose window
5. Check that subject and body are pre-filled with PDF information

### Step 5: Remove Testing Component

Once everything works, remove the WebmailTester component:
1. Delete `src/components/WebmailTester.tsx`
2. Remove any imports/references to WebmailTester

## URL Format Reference

Different cPanel webmail clients use different URL formats:

### RoundCube (Default)
```
https://enviromasternva.com:2096/webmail/?_task=mail&_action=compose&_to=&_subject=SUBJECT&_body=BODY
```

### Horde
```
https://enviromasternva.com:2096/webmail/horde/imp/dynamic.php?page=compose&to=&subject=SUBJECT&body=BODY
```

### SquirrelMail
```
https://enviromasternva.com:2096/webmail/src/compose.php?send_to=&subject=SUBJECT&body=BODY
```

### Generic
```
https://enviromasternva.com:2096/webmail/compose.php?to=&subject=SUBJECT&body=BODY
```

## Troubleshooting

### Common Issues:

1. **"Popup blocked" error**
   - **Solution:** Enable popups for your domain in browser settings
   - **Alternative:** Hold Ctrl (Windows) or Cmd (Mac) when clicking mail icon

2. **Webmail login required**
   - **Solution:** Users need to log into webmail first in another tab
   - **Note:** This is normal behavior for security

3. **Wrong URL format**
   - **Solution:** Use WebmailTester to try different client types
   - **Check:** Visit your webmail manually and check the compose URL

4. **SSL certificate warnings**
   - **Solution:** Ensure your webmail has proper SSL certificate
   - **Temporary:** Users can proceed through browser warnings

5. **Falls back to mailto every time**
   - **Issue:** Webmail URL is incorrect or inaccessible
   - **Solution:** Check baseUrl and client configuration

### Testing Checklist:

- [ ] WebmailTester connectivity test passes
- [ ] Email compose test opens webmail window
- [ ] Subject line contains document name
- [ ] Body contains document info and download link
- [ ] Fallback to mailto works if webmail fails
- [ ] No JavaScript errors in browser console

## Advanced Configuration

### Custom Webmail URL Format

If your webmail uses a non-standard URL format, you can modify the `generateWebmailUrl` function in `webmailService.ts`:

```typescript
// Add your custom case in the switch statement
case 'custom':
  return `${baseUrl}/your/custom/path?your_params=${encodedSubject}`;
```

### Disable Mailto Fallback

To disable the mailto fallback (force webmail only):

```typescript
const DEFAULT_CONFIG: WebmailConfig = {
  baseUrl: 'https://enviromasternva.com:2096',
  client: 'roundcube',
  fallbackToMailto: false // Set to false
};
```

### Per-Component Configuration

You can also pass custom configuration when calling shareViaPdf:

```typescript
shareViaPdf(emailData, {
  baseUrl: 'https://different-server.com:2096',
  client: 'horde',
  fallbackToMailto: true
});
```

## Support

If you continue to have issues:

1. **Check browser console** for detailed error messages
2. **Test different webmail clients** using WebmailTester
3. **Verify webmail accessibility** by visiting it manually
4. **Check with your hosting provider** about the correct webmail URL format

The system is designed to be robust with automatic fallback, so users should always be able to share PDFs even if webmail configuration needs adjustment.