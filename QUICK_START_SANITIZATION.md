# 🚀 Quick Start - Add Sanitization in 5 Minutes

## ✅ Step 1: Import the Hook (1 line)

Find your FormFilling component and add this import:

```tsx
// At the top of FormFilling.tsx
import { useSanitizeOnSave } from '../hooks/useSanitizeOnSave';
```

## ✅ Step 2: Initialize the Hook (1 line)

Inside your FormFilling component function:

```tsx
function FormFilling() {
  const sanitizeBeforeSave = useSanitizeOnSave();  // ← Add this

  // ... rest of your component
}
```

## ✅ Step 3: Use Before Save (1 line per save function)

Find ALL functions that save data and add one line:

### Save Draft
```tsx
// BEFORE
const handleSaveDraft = async () => {
  await pdfApi.updateCustomerHeader(id, formData);
};

// AFTER
const handleSaveDraft = async () => {
  const cleanData = sanitizeBeforeSave(formData);  // ← Add this
  await pdfApi.updateCustomerHeader(id, cleanData);
};
```

### Generate PDF
```tsx
// BEFORE
const handleGeneratePdf = async () => {
  await pdfApi.createCustomerHeader(formData);
};

// AFTER
const handleGeneratePdf = async () => {
  const cleanData = sanitizeBeforeSave(formData);  // ← Add this
  await pdfApi.createCustomerHeader(cleanData);
};
```

### Create Version
```tsx
// BEFORE
const handleCreateVersion = async () => {
  await versionApi.createVersion(agreementId, {
    payload: formData,
    changeNotes: 'Updated',
  });
};

// AFTER
const handleCreateVersion = async () => {
  const cleanData = sanitizeBeforeSave(formData);  // ← Add this
  await versionApi.createVersion(agreementId, {
    payload: cleanData,
    changeNotes: 'Updated',
  });
};
```

---

## 🎉 Done! That's It!

**Total lines added: ~10 lines**
**Total time: ~5 minutes**

Now all your data will be automatically cleaned before saving, preventing LaTeX errors!

---

## 🧪 Test It

1. **Open browser console** (F12)
2. **Paste problematic text** in a field:
   ```
   "Smart quotes" with emoji 😀 and dash—test
   ```
3. **Click Save**
4. **Check console** - you should see:
   ```
   🧹 [SANITIZE] Cleaning form data before save...
   ⚠️ [SANITIZE] Data was modified during sanitization
   ```

---

## 📊 Monitor Results

The console will show you exactly what was cleaned:

```bash
🧹 [SANITIZE] Cleaning form data before save...
⚠️ [SANITIZE] Data was modified during sanitization {
  originalSize: 15234,
  cleanedSize: 15180,
  removedBytes: 54   ← This many bad characters removed!
}
```

If you see `✅ Data is clean (no changes needed)` - great! No corruption.

---

## 🔍 Find Which Documents Have Corruption

Run the backend checker:

```bash
cd /Users/yaswanthgandhi/Documents/analytics/enviro-bckend
node scripts/check-corrupted-data.js
```

Output:
```
❌ Document 5: "ABC Company" (ID: 6953bd87...)
   Found 3 corrupted field(s):

   1. Path: products.smallProducts[2].displayName
      Problems: smart quotes
      Preview: "Hand Soap – 1L"
```

Now you know **exactly which documents** and **which fields** need fixing!

---

## 💡 Bonus: Fix Existing Corrupted Document

If you find a corrupted document:

1. **Open it in admin panel**
2. **Edit the problematic field** (re-type the text)
3. **Click Save** (sanitization will auto-clean it)
4. **Try creating version again** - should work now!

---

## ❓ Troubleshooting

**Q: LaTeX still fails after adding sanitization**
A: Run the database checker to find corrupted **existing** documents. Sanitization only cleans **new** saves.

**Q: How do I know if it's working?**
A: Check browser console when saving. You'll see `🧹 [SANITIZE]` logs.

**Q: Can I test without saving?**
A: Yes! Open console and run:
```javascript
import { runSanitizationTests } from './utils/testSanitizer';
runSanitizationTests();
```

---

## 🎯 Next Steps

1. ✅ Add sanitization to save functions (done above)
2. 🔧 Run database corruption checker
3. 📝 Fix any existing corrupted documents
4. 🎉 Enjoy error-free PDF generation!

**Time investment:** 5 minutes now saves hours of debugging later! 🚀
