#\!/bin/bash

# Fix pdfApi.ts to use apiClient properly

FILE="pdfApi.ts"

# 1. Remove ${API_BASE_URL} since apiClient already has base URL
sed -i '' 's|`${API_BASE_URL}/|`/|g' "$FILE"

# 2. Remove standalone headers options for Accept and Content-Type
sed -i '' 's|, {\s*headers: { Accept: "application/json" },\s*}||g' "$FILE"
sed -i '' 's|, {\s*headers: { "Content-Type": "application/json" },\s*}||g' "$FILE"
sed -i '' 's|, {\s*headers: { Accept: "application/json" }\s*}||g' "$FILE"
sed -i '' 's|, {\s*headers: { "Content-Type": "application/json" }\s*}||g' "$FILE"

# 3. Remove responseType: "blob" options (not compatible with fetch)
sed -i '' 's|, {\s*responseType: "blob",\s*}||g' "$FILE"
sed -i '' 's|, {\s*responseType: "blob"\s*}||g' "$FILE"

echo "Fixed $FILE"
