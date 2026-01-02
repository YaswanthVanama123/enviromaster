# 🧹 Text Sanitization Integration Guide

## Overview
This guide shows how to integrate strict text sanitization to prevent LaTeX compilation errors caused by corrupted characters.

## Files Created
1. **`src/utils/textSanitizer.ts`** - Core sanitization utilities
2. **`src/components/common/SanitizedInput.tsx`** - React input components with auto-sanitization
3. **`src/hooks/useSanitizeOnSave.ts`** - Hook for mass sanitization before save

---

## 🎯 Quick Integration (3 Ways)

### **Option 1: Replace Regular Inputs (Recommended)**

Replace your regular `<input>` and `<textarea>` with sanitized versions:

```tsx
// BEFORE
import React, { useState } from 'react';

function MyForm() {
  const [name, setName] = useState('');

  return (
    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
    />
  );
}

// AFTER
import React, { useState } from 'react';
import { SanitizedInput } from './components/common/SanitizedInput';

function MyForm() {
  const [name, setName] = useState('');

  return (
    <SanitizedInput
      value={name}
      onChange={setName}
      label="Customer Name"
      showWarning={true}  // Shows warning when characters are cleaned
    />
  );
}
```

**Benefits:**
- ✅ Automatic cleaning on blur
- ✅ Visual feedback to users
- ✅ No manual sanitization needed

---

### **Option 2: Sanitize Entire Form Before Save**

Use the hook to sanitize all data before submitting:

```tsx
import { useSanitizeOnSave } from './hooks/useSanitizeOnSave';

function FormFillingPage() {
  const [formData, setFormData] = useState({ /* ... */ });
  const sanitizeBeforeSave = useSanitizeOnSave();

  const handleSave = async () => {
    // Clean ALL data before saving
    const cleanData = sanitizeBeforeSave(formData);

    await pdfApi.createCustomerHeader(cleanData);
  };

  const handleCreateVersion = async () => {
    // Clean before version creation
    const cleanData = sanitizeBeforeSave(formData);

    await versionApi.createVersion(agreementId, {
      payload: cleanData,
      changeNotes: 'Version update',
    });
  };

  return (
    <div>
      {/* Your form fields */}
      <button onClick={handleSave}>Save</button>
      <button onClick={handleCreateVersion}>Create Version</button>
    </div>
  );
}
```

**Benefits:**
- ✅ Works with existing forms (no input changes needed)
- ✅ Cleans ALL fields at once
- ✅ One line of code per save operation

---

### **Option 3: Manual Sanitization**

Use the utility function directly:

```tsx
import { sanitizeText, sanitizeObject } from './utils/textSanitizer';

// Sanitize single field
const cleanName = sanitizeText(customerName);

// Sanitize entire object
const cleanFormData = sanitizeObject(formData);

// Check for problems first
import { detectProblematicCharacters } from './utils/textSanitizer';

const detection = detectProblematicCharacters(inputValue);
if (detection.hasProblems) {
  console.warn('Problems found:', detection.problems);
  // Use detection.cleaned as the cleaned value
}
```

---

## 📝 Real-World Examples

### Example 1: FormFilling Component

```tsx
// src/components/FormFilling.tsx
import React, { useState } from 'react';
import { SanitizedInput, SanitizedTextarea } from './components/common/SanitizedInput';
import { useSanitizeOnSave } from './hooks/useSanitizeOnSave';

export function FormFilling() {
  const [headerData, setHeaderData] = useState({
    customerName: '',
    address: '',
    notes: '',
  });

  const sanitizeBeforeSave = useSanitizeOnSave();

  const handleSaveDraft = async () => {
    // Method 1: Sanitize on save (works with any inputs)
    const cleanData = sanitizeBeforeSave(headerData);
    await api.saveDraft(cleanData);
  };

  return (
    <div>
      {/* Method 2: Use sanitized inputs (auto-cleans on blur) */}
      <SanitizedInput
        label="Customer Name"
        value={headerData.customerName}
        onChange={(value) => setHeaderData({ ...headerData, customerName: value })}
        placeholder="Enter customer name"
      />

      <SanitizedInput
        label="Address"
        value={headerData.address}
        onChange={(value) => setHeaderData({ ...headerData, address: value })}
        placeholder="Enter address"
      />

      <SanitizedTextarea
        label="Notes"
        value={headerData.notes}
        onChange={(value) => setHeaderData({ ...headerData, notes: value })}
        rows={4}
      />

      <button onClick={handleSaveDraft}>Save Draft</button>
    </div>
  );
}
```

### Example 2: Product Table with Dynamic Rows

```tsx
// src/components/ProductTable.tsx
import { SanitizedInput } from './components/common/SanitizedInput';

export function ProductTable({ products, onUpdate }) {
  const updateProduct = (index, field, value) => {
    const updated = [...products];
    updated[index][field] = value;
    onUpdate(updated);
  };

  return (
    <table>
      <tbody>
        {products.map((product, index) => (
          <tr key={index}>
            <td>
              <SanitizedInput
                value={product.displayName}
                onChange={(value) => updateProduct(index, 'displayName', value)}
                showWarning={false}  // Disable warnings for table (less intrusive)
              />
            </td>
            <td>
              <SanitizedInput
                type="number"
                value={product.qty}
                onChange={(value) => updateProduct(index, 'qty', value)}
                showWarning={false}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Example 3: Batch Sanitize Existing Data

```tsx
// src/utils/dataCleanup.ts
import { sanitizeObject } from './utils/textSanitizer';

/**
 * Clean all existing documents in the database
 * Run this once to fix corrupted data
 */
export async function cleanupExistingDocuments() {
  const documents = await pdfApi.getCustomerHeaders();

  let cleanedCount = 0;
  let unchangedCount = 0;

  for (const doc of documents.items) {
    const original = JSON.stringify(doc);
    const cleaned = sanitizeObject(doc);
    const after = JSON.stringify(cleaned);

    if (original !== after) {
      // Document had corruption - update it
      await pdfApi.updateCustomerHeader(doc._id, cleaned);
      cleanedCount++;
      console.log(`✅ Cleaned document: ${doc.payload.headerTitle}`);
    } else {
      unchangedCount++;
    }
  }

  console.log(`🎉 Cleanup complete!`);
  console.log(`   Cleaned: ${cleanedCount}`);
  console.log(`   Already clean: ${unchangedCount}`);
}
```

---

## 🚫 What Gets Cleaned

### Smart Quotes → Regular Quotes
```
" " ' ' → " "
Input: "Hello "World"" → Output: "Hello "World""
```

### Special Dashes → Regular Hyphens
```
– — ― → -
Input: "Price—$100" → Output: "Price-$100"
```

### Emojis → Removed
```
Input: "Great product 😀 💰" → Output: "Great product  "
```

### Control Characters → Removed
```
Input: "Text\x00with\x1Fbinary" → Output: "Textwithbinary"
```

### Zero-Width Characters → Removed
```
Input: "John­Smith" (soft hyphen) → Output: "JohnSmith"
```

### Special Bullets → *
```
Input: "• Item 1" → Output: "* Item 1"
```

---

## ⚡ Performance Tips

1. **For Large Forms**: Use `useSanitizeOnSave()` (sanitizes once on submit)
2. **For Small Forms**: Use `<SanitizedInput>` (sanitizes each field on blur)
3. **For Tables**: Use `showWarning={false}` to avoid too many notifications

---

## 🧪 Testing

Test the sanitization with problematic text:

```tsx
import { sanitizeText, detectProblematicCharacters } from './utils/textSanitizer';

// Test cases
const tests = [
  '"Smart quotes"',
  'Em—dash',
  'Emoji 😀',
  'Zero-width\u200Bspace',
  'Control\x00char',
];

tests.forEach(test => {
  const result = detectProblematicCharacters(test);
  console.log(`Input: "${test}"`);
  console.log(`Output: "${result.cleaned}"`);
  console.log(`Problems: ${result.problems.join(', ')}`);
  console.log('---');
});
```

---

## 🔧 Customization

### Disable Warnings for Specific Fields
```tsx
<SanitizedInput
  value={value}
  onChange={setValue}
  showWarning={false}  // No popup warnings
/>
```

### Add Custom Replacements
Edit `src/utils/textSanitizer.ts` and add to the character maps:

```typescript
const CUSTOM_MAP: Record<string, string> = {
  '€': 'EUR', // Replace Euro symbol
  '£': 'GBP', // Replace Pound symbol
};
```

---

## 📊 Monitoring

The sanitizer logs all cleanups to console. Monitor for patterns:

```bash
# Check browser console for:
🧹 [SANITIZE] Cleaned input: { field: 'customerName', problems: [...] }
⚠️ [SANITIZE] Data was modified during sanitization
```

---

## 🎯 Rollout Plan

### Phase 1: Critical Forms (Week 1)
- ✅ FormFilling component (main form)
- ✅ Product tables
- ✅ Service configuration

### Phase 2: All Save Operations (Week 2)
- ✅ Add `useSanitizeOnSave()` to all save/create/update handlers
- ✅ Version creation
- ✅ Draft saves

### Phase 3: Cleanup Existing Data (Week 3)
- ✅ Run database corruption checker
- ✅ Batch clean corrupted documents
- ✅ Monitor for new issues

---

## ❓ FAQ

**Q: Will this slow down my forms?**
A: No. Sanitization only runs on blur (user leaves field) or on save. No performance impact.

**Q: What if users need special characters?**
A: LaTeX cannot handle emojis or control characters. Users must use plain text. Smart quotes are auto-converted to regular quotes.

**Q: Can I disable sanitization for testing?**
A: Yes, just don't use `<SanitizedInput>` and don't call `sanitizeBeforeSave()`.

**Q: Will this fix existing corrupted documents?**
A: No. Use the database cleanup script to fix existing data, or re-save each document through the UI.

---

## 🆘 Troubleshooting

### Problem: Sanitization removes valid text
**Solution**: Check if your text contains invisible characters. Copy to Notepad first, then paste.

### Problem: LaTeX still fails after sanitization
**Solution**: Check backend logs for the exact field with issues. May be a template problem, not data.

### Problem: Users complain about auto-replacements
**Solution**: Add a tooltip explaining that special characters are converted for PDF compatibility.

---

## ✅ Next Steps

1. **Install** the files (already created)
2. **Choose** integration method (Option 1, 2, or 3)
3. **Test** with problematic text
4. **Deploy** to production
5. **Monitor** console logs for cleanups
6. **Run** database cleanup script for existing data

---

**Need Help?** Check the console logs - they show exactly what was cleaned and why!
