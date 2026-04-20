

function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;


  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));


  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }


  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      
        matrix[i][j - 1] + 1,      
        matrix[i - 1][j - 1] + cost 
      );
    }
  }

  return matrix[len1][len2];
}


function similarityScore(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLen = Math.max(str1.length, str2.length);

  if (maxLen === 0) return 1;

  return 1 - (distance / maxLen);
}

export type MatchType = 'exact' | 'partial' | 'fuzzy' | 'none';

export interface MatchResult {
  matchType: MatchType;
  score: number; 
}


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


  if (normalizedCompany === normalizedSearch) {
    return { matchType: 'exact', score: 1 };
  }


  if (normalizedCompany.includes(normalizedSearch)) {

    const position = normalizedCompany.indexOf(normalizedSearch);
    const coverage = normalizedSearch.length / normalizedCompany.length;


    const positionScore = 1 - (position / normalizedCompany.length);
    const score = 0.7 + (positionScore * 0.15) + (coverage * 0.15);

    return { matchType: 'partial', score: Math.min(score, 0.99) };
  }


  const similarity = similarityScore(normalizedCompany, normalizedSearch);

  if (similarity >= fuzzyThreshold) {
    return { matchType: 'fuzzy', score: similarity * 0.6 }; 
  }


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


export function getMatchTypeColor(matchType: MatchType): string {
  switch (matchType) {
    case 'exact':
      return '#22c55e'; 
    case 'partial':
      return '#3b82f6'; 
    case 'fuzzy':
      return '#f59e0b'; 
    case 'none':
      return '#9ca3af'; 
  }
}
