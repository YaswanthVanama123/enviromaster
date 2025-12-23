// src/utils/fuzzyMatch.ts
// Fuzzy matching utility for company search

/**
 * Calculate Levenshtein distance between two strings
 * (minimum number of single-character edits needed to change one string into another)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create a 2D array for dynamic programming
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first column and row
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 */
function similarityScore(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLen = Math.max(str1.length, str2.length);

  if (maxLen === 0) return 1;

  return 1 - (distance / maxLen);
}

export type MatchType = 'exact' | 'partial' | 'fuzzy' | 'none';

export interface MatchResult {
  matchType: MatchType;
  score: number; // 0-1, where 1 is perfect match
}

/**
 * Determine match type and quality for a company name against search term
 *
 * @param companyName - The company name to test
 * @param searchTerm - The search term to match against
 * @param fuzzyThreshold - Minimum similarity score to consider a fuzzy match (default: 0.6)
 * @returns Match result with type and score
 */
export function matchCompanyName(
  companyName: string,
  searchTerm: string,
  fuzzyThreshold = 0.6
): MatchResult {
  if (!searchTerm || !searchTerm.trim()) {
    return { matchType: 'none', score: 0 };
  }

  const normalizedCompany = companyName.toLowerCase().trim();
  const normalizedSearch = searchTerm.toLowerCase().trim();

  // 1. Exact match (case-insensitive)
  if (normalizedCompany === normalizedSearch) {
    return { matchType: 'exact', score: 1 };
  }

  // 2. Partial match (contains substring)
  if (normalizedCompany.includes(normalizedSearch)) {
    // Calculate score based on position and coverage
    const position = normalizedCompany.indexOf(normalizedSearch);
    const coverage = normalizedSearch.length / normalizedCompany.length;

    // Prefer matches at the beginning, and higher coverage
    const positionScore = 1 - (position / normalizedCompany.length);
    const score = 0.7 + (positionScore * 0.15) + (coverage * 0.15);

    return { matchType: 'partial', score: Math.min(score, 0.99) };
  }

  // 3. Fuzzy match (similar but not exact/partial)
  const similarity = similarityScore(normalizedCompany, normalizedSearch);

  if (similarity >= fuzzyThreshold) {
    return { matchType: 'fuzzy', score: similarity * 0.6 }; // Scale fuzzy scores to 0-0.6 range
  }

  // 4. Check if search term matches any word in company name
  const companyWords = normalizedCompany.split(/\s+/);
  const searchWords = normalizedSearch.split(/\s+/);

  let bestWordMatch = 0;
  for (const companyWord of companyWords) {
    for (const searchWord of searchWords) {
      if (companyWord === searchWord) {
        bestWordMatch = Math.max(bestWordMatch, 0.85);
      } else if (companyWord.includes(searchWord) || searchWord.includes(companyWord)) {
        bestWordMatch = Math.max(bestWordMatch, 0.75);
      } else {
        const wordSimilarity = similarityScore(companyWord, searchWord);
        if (wordSimilarity >= fuzzyThreshold) {
          bestWordMatch = Math.max(bestWordMatch, wordSimilarity * 0.6);
        }
      }
    }
  }

  if (bestWordMatch >= fuzzyThreshold) {
    return { matchType: 'fuzzy', score: bestWordMatch };
  }

  return { matchType: 'none', score: similarity };
}

/**
 * Get display label for match type
 */
export function getMatchTypeLabel(matchType: MatchType): string {
  switch (matchType) {
    case 'exact':
      return 'Exact Match';
    case 'partial':
      return 'Partial Match';
    case 'fuzzy':
      return 'Similar Match';
    case 'none':
      return 'No Match';
  }
}

/**
 * Get color for match type indicator
 */
export function getMatchTypeColor(matchType: MatchType): string {
  switch (matchType) {
    case 'exact':
      return '#22c55e'; // Green
    case 'partial':
      return '#3b82f6'; // Blue
    case 'fuzzy':
      return '#f59e0b'; // Orange
    case 'none':
      return '#9ca3af'; // Gray
  }
}
