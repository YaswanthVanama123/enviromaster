// src/utils/textSanitizer.ts

/**
 * Frontend Text Sanitization Utility
 * Removes all characters that cause LaTeX compilation errors
 *
 * Apply this to ALL text inputs before saving to database
 */

// ========== CHARACTER MAPPINGS ==========

/** Smart quotes → Regular quotes */
const SMART_QUOTE_MAP: Record<string, string> = {
  '\u201C': '"', // Left double quote "
  '\u201D': '"', // Right double quote "
  '\u2018': "'", // Left single quote '
  '\u2019': "'", // Right single quote '
  '\u201A': "'", // Single low-9 quote ‚
  '\u201B': "'", // Single high-reversed-9 quote ‛
  '\u201E': '"', // Double low-9 quote „
  '\u201F': '"', // Double high-reversed-9 quote ‟
  '\u2039': '<', // Single left angle quote ‹
  '\u203A': '>', // Single right angle quote ›
  '\u00AB': '"', // Left double angle quote «
  '\u00BB': '"', // Right double angle quote »
};

/** Dashes → Regular hyphen */
const DASH_MAP: Record<string, string> = {
  '\u2013': '-', // En dash –
  '\u2014': '-', // Em dash —
  '\u2015': '-', // Horizontal bar ―
  '\u2212': '-', // Minus sign −
  '\uFE58': '-', // Small em dash ﹘
  '\uFE63': '-', // Small hyphen-minus ﹣
  '\uFF0D': '-', // Fullwidth hyphen-minus －
};

/** Spaces → Regular space */
const SPACE_MAP: Record<string, string> = {
  '\u00A0': ' ', // Non-breaking space
  '\u2002': ' ', // En space
  '\u2003': ' ', // Em space
  '\u2004': ' ', // Three-per-em space
  '\u2005': ' ', // Four-per-em space
  '\u2006': ' ', // Six-per-em space
  '\u2007': ' ', // Figure space
  '\u2008': ' ', // Punctuation space
  '\u2009': ' ', // Thin space
  '\u200A': ' ', // Hair space
  '\u200B': '',  // Zero-width space (remove completely)
  '\u200C': '',  // Zero-width non-joiner
  '\u200D': '',  // Zero-width joiner
  '\uFEFF': '',  // Zero-width no-break space
};

/** Special characters → Safe alternatives */
const SPECIAL_CHAR_MAP: Record<string, string> = {
  '\u2022': '*', // Bullet •
  '\u2023': '*', // Triangular bullet ‣
  '\u2043': '*', // Hyphen bullet ⁃
  '\u25E6': '*', // White bullet ◦
  '\u00B7': '*', // Middle dot ·
  '\u2026': '...', // Ellipsis …
  '\u00A9': '(c)', // Copyright ©
  '\u00AE': '(R)', // Registered ®
  '\u2122': '(TM)', // Trademark ™
  '\u00B0': ' degrees', // Degree sign °
  '\u00B1': '+/-', // Plus-minus ±
  '\u00D7': 'x', // Multiplication ×
  '\u00F7': '/', // Division ÷
  '\u00BC': '1/4', // Fraction 1/4
  '\u00BD': '1/2', // Fraction 1/2
  '\u00BE': '3/4', // Fraction 3/4
};

// ========== SANITIZATION FUNCTIONS ==========

/**
 * Main sanitization function - removes ALL problematic characters
 * This is the function you should use for ALL text inputs
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';

  let text = String(input);

  // Step 1: Replace smart quotes with regular quotes
  Object.entries(SMART_QUOTE_MAP).forEach(([bad, good]) => {
    text = text.replace(new RegExp(bad, 'g'), good);
  });

  // Step 2: Replace special dashes with regular hyphen
  Object.entries(DASH_MAP).forEach(([bad, good]) => {
    text = text.replace(new RegExp(bad, 'g'), good);
  });

  // Step 3: Replace special spaces with regular space
  Object.entries(SPACE_MAP).forEach(([bad, good]) => {
    text = text.replace(new RegExp(bad, 'g'), good);
  });

  // Step 4: Replace special characters with safe alternatives
  Object.entries(SPECIAL_CHAR_MAP).forEach(([bad, good]) => {
    text = text.replace(new RegExp(bad, 'g'), good);
  });

  // Step 5: Remove ALL emojis (LaTeX cannot handle them)
  text = text.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
  text = text.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Misc Symbols and Pictographs
  text = text.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport and Map
  text = text.replace(/[\u{1F700}-\u{1F77F}]/gu, ''); // Alchemical Symbols
  text = text.replace(/[\u{1F780}-\u{1F7FF}]/gu, ''); // Geometric Shapes Extended
  text = text.replace(/[\u{1F800}-\u{1F8FF}]/gu, ''); // Supplemental Arrows-C
  text = text.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); // Supplemental Symbols and Pictographs
  text = text.replace(/[\u{1FA00}-\u{1FA6F}]/gu, ''); // Chess Symbols
  text = text.replace(/[\u{1FA70}-\u{1FAFF}]/gu, ''); // Symbols and Pictographs Extended-A
  text = text.replace(/[\u{2600}-\u{26FF}]/gu, '');   // Misc symbols
  text = text.replace(/[\u{2700}-\u{27BF}]/gu, '');   // Dingbats

  // Step 6: Remove ALL control characters (0x00-0x1F except \n, \r, \t)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // Step 7: Remove DEL and high-bit characters (0x7F-0xFF)
  text = text.replace(/[\x7F-\xFF]/g, '');

  // Step 8: Remove invalid UTF-8 sequences (replacement character �)
  text = text.replace(/\uFFFD/g, '');

  // Step 9: Remove any remaining non-printable characters
  text = text.replace(/[^\x20-\x7E\n\r\t]/g, '');

  // Step 10: Normalize Unicode to composed form
  text = text.normalize('NFC');

  // Step 11: Collapse multiple spaces into one
  text = text.replace(/  +/g, ' ');

  // Step 12: Trim whitespace
  text = text.trim();

  return text;
}

/**
 * Detect problematic characters in text (for validation warnings)
 */
export function detectProblematicCharacters(input: string): {
  hasProblems: boolean;
  problems: string[];
  cleaned: string;
} {
  if (!input) return { hasProblems: false, problems: [], cleaned: '' };

  const problems: string[] = [];

  // Check for smart quotes
  if (/[""''‚‛„‟‹›«»]/.test(input)) {
    problems.push('Smart quotes detected (will be converted to regular quotes)');
  }

  // Check for special dashes
  if (/[–—―−﹘﹣－]/.test(input)) {
    problems.push('Special dashes detected (will be converted to regular hyphens)');
  }

  // Check for emojis
  if (/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu.test(input)) {
    problems.push('Emojis detected (will be removed)');
  }

  // Check for control characters
  if (/[\x00-\x1F\x7F-\xFF]/.test(input)) {
    problems.push('Control/binary characters detected (will be removed)');
  }

  // Check for zero-width characters
  if (/[\u200B\u200C\u200D\uFEFF]/.test(input)) {
    problems.push('Zero-width characters detected (will be removed)');
  }

  // Check for invalid UTF-8
  if (/\uFFFD/.test(input)) {
    problems.push('Invalid UTF-8 characters detected (corrupted data - will be removed)');
  }

  const cleaned = sanitizeText(input);

  return {
    hasProblems: problems.length > 0,
    problems,
    cleaned,
  };
}

/**
 * Sanitize an entire object recursively (for form data before submission)
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  // Handle primitives
  if (typeof obj !== 'object') {
    return typeof obj === 'string' ? (sanitizeText(obj) as unknown as T) : obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as unknown as T;
  }

  // Handle objects
  const sanitized: any = {};
  Object.entries(obj as any).forEach(([key, value]) => {
    sanitized[key] = sanitizeObject(value);
  });

  return sanitized as T;
}

/**
 * Hook for React input fields - automatically sanitizes on blur
 */
export function useSanitizedInput(
  value: string,
  onChange: (value: string) => void,
  options: { showWarning?: boolean } = {}
) {
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const original = e.target.value;
    const detection = detectProblematicCharacters(original);

    if (detection.hasProblems) {
      console.warn('🧹 [SANITIZE] Cleaned input field:', {
        original,
        cleaned: detection.cleaned,
        problems: detection.problems,
      });

      if (options.showWarning && detection.problems.length > 0) {
        // You can show a toast notification here
        alert(`⚠️ Text was automatically cleaned:\n\n${detection.problems.join('\n')}`);
      }

      onChange(detection.cleaned);
    }
  };

  return { handleBlur };
}

/**
 * Validation function - returns error message if text has problems
 * Use this in your form validation
 */
export function validateTextForLatex(input: string): string | null {
  const detection = detectProblematicCharacters(input);

  if (detection.hasProblems) {
    return `Text contains problematic characters: ${detection.problems.join(', ')}`;
  }

  return null; // No problems
}

/**
 * Get list of replaced characters for user feedback
 */
export function getReplacementSummary(original: string, cleaned: string): string[] {
  const changes: string[] = [];

  if (original !== cleaned) {
    if (original.length !== cleaned.length) {
      changes.push(`Removed ${original.length - cleaned.length} invalid character(s)`);
    }

    // Check specific replacements
    if (/[""'']/.test(original)) {
      changes.push('Replaced smart quotes with regular quotes');
    }
    if (/[–—]/.test(original)) {
      changes.push('Replaced em/en-dashes with hyphens');
    }
    if (/[\u{1F600}-\u{1F64F}]/gu.test(original)) {
      changes.push('Removed emojis');
    }
  }

  return changes;
}
