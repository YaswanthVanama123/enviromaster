

const SMART_QUOTE_MAP: Record<string, string> = {
  '\u201C': '"', 
  '\u201D': '"', 
  '\u2018': "'", 
  '\u2019': "'", 
  '\u201A': "'", 
  '\u201B': "'", 
  '\u201E': '"', 
  '\u201F': '"', 
  '\u2039': '<', 
  '\u203A': '>', 
  '\u00AB': '"', 
  '\u00BB': '"', 
};


const DASH_MAP: Record<string, string> = {
  '\u2013': '-', 
  '\u2014': '-', 
  '\u2015': '-', 
  '\u2212': '-', 
  '\uFE58': '-', 
  '\uFE63': '-', 
  '\uFF0D': '-', 
};


const SPACE_MAP: Record<string, string> = {
  '\u00A0': ' ', 
  '\u2002': ' ', 
  '\u2003': ' ', 
  '\u2004': ' ', 
  '\u2005': ' ', 
  '\u2006': ' ', 
  '\u2007': ' ', 
  '\u2008': ' ', 
  '\u2009': ' ', 
  '\u200A': ' ', 
  '\u200B': '',  
  '\u200C': '',  
  '\u200D': '',  
  '\uFEFF': '',  
};


const SPECIAL_CHAR_MAP: Record<string, string> = {
  '\u2022': '*', 
  '\u2023': '*', 
  '\u2043': '*', 
  '\u25E6': '*', 
  '\u00B7': '*', 
  '\u2026': '...', 
  '\u00A9': '(c)', 
  '\u00AE': '(R)', 
  '\u2122': '(TM)', 
  '\u00B0': ' degrees', 
  '\u00B1': '+/-', 
  '\u00D7': 'x', 
  '\u00F7': '/', 
  '\u00BC': '1/4', 
  '\u00BD': '1/2', 
  '\u00BE': '3/4', 
};


export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';

  let text = String(input);


  Object.entries(SMART_QUOTE_MAP).forEach(([bad, good]) => {
    text = text.replace(new RegExp(bad, 'g'), good);
  });


  Object.entries(DASH_MAP).forEach(([bad, good]) => {
    text = text.replace(new RegExp(bad, 'g'), good);
  });


  Object.entries(SPACE_MAP).forEach(([bad, good]) => {
    text = text.replace(new RegExp(bad, 'g'), good);
  });


  Object.entries(SPECIAL_CHAR_MAP).forEach(([bad, good]) => {
    text = text.replace(new RegExp(bad, 'g'), good);
  });


  text = text.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); 
  text = text.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); 
  text = text.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); 
  text = text.replace(/[\u{1F700}-\u{1F77F}]/gu, ''); 
  text = text.replace(/[\u{1F780}-\u{1F7FF}]/gu, ''); 
  text = text.replace(/[\u{1F800}-\u{1F8FF}]/gu, ''); 
  text = text.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); 
  text = text.replace(/[\u{1FA00}-\u{1FA6F}]/gu, ''); 
  text = text.replace(/[\u{1FA70}-\u{1FAFF}]/gu, ''); 
  text = text.replace(/[\u{2600}-\u{26FF}]/gu, '');   
  text = text.replace(/[\u{2700}-\u{27BF}]/gu, '');   


  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');


  text = text.replace(/[\x7F-\xFF]/g, '');


  text = text.replace(/\uFFFD/g, '');


  text = text.replace(/[^\x20-\x7E\n\r\t]/g, '');


  text = text.normalize('NFC');


  text = text.replace(/  +/g, ' ');


  text = text.trim();

  return text;
}


export function detectProblematicCharacters(input: string): {
  hasProblems: boolean;
  problems: string[];
  cleaned: string;
} {
  if (!input) return { hasProblems: false, problems: [], cleaned: '' };

  const problems: string[] = [];


  if (/[""''‚‛„‟‹›«»]/.test(input)) {
    problems.push('Smart quotes detected (will be converted to regular quotes)');
  }


  if (/[–—―−﹘﹣－]/.test(input)) {
    problems.push('Special dashes detected (will be converted to regular hyphens)');
  }


  if (/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu.test(input)) {
    problems.push('Emojis detected (will be removed)');
  }


  if (/[\x00-\x1F\x7F-\xFF]/.test(input)) {
    problems.push('Control/binary characters detected (will be removed)');
  }


  if (/[\u200B\u200C\u200D\uFEFF]/.test(input)) {
    problems.push('Zero-width characters detected (will be removed)');
  }


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


export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;


  if (typeof obj !== 'object') {
    return typeof obj === 'string' ? (sanitizeText(obj) as unknown as T) : obj;
  }


  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as unknown as T;
  }


  const sanitized: any = {};
  Object.entries(obj as any).forEach(([key, value]) => {
    sanitized[key] = sanitizeObject(value);
  });

  return sanitized as T;
}


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

        alert(`⚠️ Text was automatically cleaned:\n\n${detection.problems.join('\n')}`);
      }

      onChange(detection.cleaned);
    }
  };

  return { handleBlur };
}


export function validateTextForLatex(input: string): string | null {
  const detection = detectProblematicCharacters(input);

  if (detection.hasProblems) {
    return `Text contains problematic characters: ${detection.problems.join(', ')}`;
  }

  return null; 
}


export function getReplacementSummary(original: string, cleaned: string): string[] {
  const changes: string[] = [];

  if (original !== cleaned) {
    if (original.length !== cleaned.length) {
      changes.push(`Removed ${original.length - cleaned.length} invalid character(s)`);
    }


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
