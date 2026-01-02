#!/bin/bash

FILE="pdfApi.ts"
BACKUP="${FILE}.pre-final-fix"

# Create backup
cp "$FILE" "$BACKUP"
echo "Created backup: $BACKUP"

# Fix 1: Remove any remaining headers objects (single line pattern)
# Pattern: , { headers: { ... } }
sed -i '' -E 's/, \{[[:space:]]*headers: \{[^}]+\}[[:space:]]*\}//g' "$FILE"

# Fix 2: Remove any remaining headers objects (multi-line pattern - simple cases)
# This handles cases where the headers object is on multiple lines
perl -i -p0e 's/,\s*\{\s*headers:\s*\{\s*[^}]+\}\s*,?\s*\}//gs' "$FILE"

# Fix 3: Replace return res.data; with proper error checking
# But only for apiClient responses (not for direct object returns)
# We'll use a more sophisticated perl replacement
perl -i -pe '
  # Match lines with "return res.data;" where res comes from apiClient
  if (/^(\s*)return res\.data;$/) {
    my $indent = $1;
    $_ = "${indent}if (res.error) throw new Error(res.error);\n${indent}return res.data!;\n";
  }
' "$FILE"

echo "✅ Applied final fixes to $FILE"
echo "📝 Backup saved as: $BACKUP"
