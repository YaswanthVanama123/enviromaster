#\!/bin/bash

FILE="pdfApi.ts"

# Remove all headers objects completely (they contain Accept or Content-Type or Authorization)
sed -i '' 's|,\s*{\s*headers: {[^}]*}\s*}||g' "$FILE"
sed -i '' 's|,\s*{\s*headers: {[^}]*},\s*}||g' "$FILE"

# Remove standalone responseType blob
sed -i '' 's|,\s*{\s*responseType: "blob"[^}]*}||g' "$FILE"

# Remove manual token retrieval and checks for admin APIs (apiClient handles this)
sed -i '' '/const token = localStorage.getItem/d' "$FILE"
sed -i '' '/if (\!token) {/,/}/d' "$FILE"

echo "Applied additional fixes to $FILE"
