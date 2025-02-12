
export type SensitiveDataType = 'name' | 'email' | 'phone' | 'address' | 'ssn' | 'dob' | 'account';

export interface DetectedEntity {
  type: SensitiveDataType;
  value: string;
  placeholder: string;
  index: number;
}

export interface ValidationResult {
  isValid: boolean;
  missingPlaceholders: string[];
  alteredPlaceholders: string[];
  invalidFormatPlaceholders: string[];
  recoverable: boolean;
  suggestedFixes: { original: string; modified: string; }[];
}

// Zero-width characters for placeholder protection
const ZERO_WIDTH_SPACE = '\u200C';

// Bracket styles for different types to increase AI resistance
const BRACKET_STYLES: Record<SensitiveDataType, { open: string; close: string }> = {
  name: { open: '{', close: '}' },
  email: { open: '⟦', close: '⟧' },
  phone: { open: '⟪', close: '⟫' },
  address: { open: '⟬', close: '⟭' },
  ssn: { open: '❲', close: '❳' },
  dob: { open: '⟨', close: '⟩' },
  account: { open: '❴', close: '❵' },
};

// Calculate Levenshtein distance for fuzzy matching
const levenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + substitutionCost
      );
    }
  }

  return matrix[b.length][a.length];
};

// Function to find similar placeholders
const findSimilarPlaceholder = (text: string, original: string): string | null => {
  // Remove zero-width spaces for comparison
  const cleanText = text.replace(new RegExp(ZERO_WIDTH_SPACE, 'g'), '');
  const cleanOriginal = original.replace(new RegExp(ZERO_WIDTH_SPACE, 'g'), '');
  
  // Split text into potential placeholders
  const potentialPlaceholders = cleanText.match(/[{⟦⟪⟬❲⟨❴][^}⟧⟫⟭❳⟩❵]+[}⟧⟫⟭❳⟩❵]/g) || [];
  
  let bestMatch: string | null = null;
  let bestDistance = Infinity;
  
  for (const placeholder of potentialPlaceholders) {
    const distance = levenshteinDistance(placeholder, cleanOriginal);
    if (distance < bestDistance && distance <= 3) { // Allow up to 3 character differences
      bestDistance = distance;
      bestMatch = placeholder;
    }
  }
  
  return bestMatch;
};

export const generatePlaceholder = (type: SensitiveDataType, index: number): string => {
  const { open, close } = BRACKET_STYLES[type];
  const placeholder = `${open}UID:${type.toUpperCase()}:${index.toString().padStart(6, '0')}${close}`;
  return `${ZERO_WIDTH_SPACE}${placeholder}${ZERO_WIDTH_SPACE}`;
};

export const detectSensitiveData = (text: string): DetectedEntity[] => {
  const entities: DetectedEntity[] = [];
  let index = 0;
  const seenValues = new Map<string, string>(); // Track repeated values

  // Name detection (basic patterns)
  const nameRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;
  let match;
  while ((match = nameRegex.exec(text)) !== null) {
    const value = match[0];
    if (seenValues.has(value)) {
      entities.push({
        type: 'name',
        value,
        placeholder: seenValues.get(value)!,
        index: match.index,
      });
    } else {
      const placeholder = generatePlaceholder('name', index++);
      seenValues.set(value, placeholder);
      entities.push({
        type: 'name',
        value,
        placeholder,
        index: match.index,
      });
    }
  }

  // Email detection
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  while ((match = emailRegex.exec(text)) !== null) {
    const value = match[0];
    if (seenValues.has(value)) {
      entities.push({
        type: 'email',
        value,
        placeholder: seenValues.get(value)!,
        index: match.index,
      });
    } else {
      const placeholder = generatePlaceholder('email', index++);
      seenValues.set(value, placeholder);
      entities.push({
        type: 'email',
        value,
        placeholder,
        index: match.index,
      });
    }
  }

  // Phone number detection (various formats)
  const phoneRegex = /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  while ((match = phoneRegex.exec(text)) !== null) {
    const value = match[0];
    if (seenValues.has(value)) {
      entities.push({
        type: 'phone',
        value,
        placeholder: seenValues.get(value)!,
        index: match.index,
      });
    } else {
      const placeholder = generatePlaceholder('phone', index++);
      seenValues.set(value, placeholder);
      entities.push({
        type: 'phone',
        value,
        placeholder,
        index: match.index,
      });
    }
  }

  // SSN detection (including with and without dashes)
  const ssnRegex = /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g;
  while ((match = ssnRegex.exec(text)) !== null) {
    const value = match[0];
    if (seenValues.has(value)) {
      entities.push({
        type: 'ssn',
        value,
        placeholder: seenValues.get(value)!,
        index: match.index,
      });
    } else {
      const placeholder = generatePlaceholder('ssn', index++);
      seenValues.set(value, placeholder);
      entities.push({
        type: 'ssn',
        value,
        placeholder,
        index: match.index,
      });
    }
  }

  // Date of birth detection (various formats)
  const dobRegex = /\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/g;
  while ((match = dobRegex.exec(text)) !== null) {
    const value = match[0];
    if (seenValues.has(value)) {
      entities.push({
        type: 'dob',
        value,
        placeholder: seenValues.get(value)!,
        index: match.index,
      });
    } else {
      const placeholder = generatePlaceholder('dob', index++);
      seenValues.set(value, placeholder);
      entities.push({
        type: 'dob',
        value,
        placeholder,
        index: match.index,
      });
    }
  }

  // Address detection (basic format)
  const addressRegex = /\b\d+\s+[A-Za-z\s,]+(?:Avenue|Ave|Street|St|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Circle|Cir|Court|Ct|Way|Place|Pl)\b/gi;
  while ((match = addressRegex.exec(text)) !== null) {
    const value = match[0];
    if (seenValues.has(value)) {
      entities.push({
        type: 'address',
        value,
        placeholder: seenValues.get(value)!,
        index: match.index,
      });
    } else {
      const placeholder = generatePlaceholder('address', index++);
      seenValues.set(value, placeholder);
      entities.push({
        type: 'address',
        value,
        placeholder,
        index: match.index,
      });
    }
  }

  // Bank account number detection (basic format)
  const accountRegex = /\b\d{8,17}\b/g;
  while ((match = accountRegex.exec(text)) !== null) {
    // Avoid matching numbers that were already detected as phone or SSN
    const value = match[0];
    if (!entities.some(e => e.index === match.index)) {
      if (seenValues.has(value)) {
        entities.push({
          type: 'account',
          value,
          placeholder: seenValues.get(value)!,
          index: match.index,
        });
      } else {
        const placeholder = generatePlaceholder('account', index++);
        seenValues.set(value, placeholder);
        entities.push({
          type: 'account',
          value,
          placeholder,
          index: match.index,
        });
      }
    }
  }

  // Sort entities by index to ensure proper replacement order
  return entities.sort((a, b) => a.index - b.index);
};

export const maskText = (text: string, entities: DetectedEntity[]): string => {
  let maskedText = text;
  const sortedEntities = [...entities].sort((a, b) => b.index - a.index);
  
  for (const entity of sortedEntities) {
    maskedText = 
      maskedText.substring(0, entity.index) +
      entity.placeholder +
      maskedText.substring(entity.index + entity.value.length);
  }
  
  return maskedText;
};

export const validatePlaceholdersDetailed = (
  maskedText: string,
  entities: DetectedEntity[]
): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    missingPlaceholders: [],
    alteredPlaceholders: [],
    invalidFormatPlaceholders: [],
    recoverable: true,
    suggestedFixes: [],
  };

  for (const entity of entities) {
    const cleanPlaceholder = entity.placeholder.replace(new RegExp(ZERO_WIDTH_SPACE, 'g'), '');
    
    if (!maskedText.includes(entity.placeholder)) {
      // Check for similar placeholders if exact match not found
      const similarPlaceholder = findSimilarPlaceholder(maskedText, cleanPlaceholder);
      
      if (similarPlaceholder) {
        result.suggestedFixes.push({
          original: cleanPlaceholder,
          modified: similarPlaceholder,
        });
        result.alteredPlaceholders.push(entity.placeholder);
        result.recoverable = true;
      } else {
        result.missingPlaceholders.push(entity.placeholder);
        // Only mark as unrecoverable if we can't find any similar matches
        if (!result.suggestedFixes.length) {
          result.recoverable = false;
        }
      }
    }
  }

  // Check for any invalid format placeholders
  const placeholderRegex = /[{⟦⟪⟬❲⟨❴][^}⟧⟫⟭❳⟩❵]+[}⟧⟫⟭❳⟩❵]/g;
  const matches = maskedText.match(placeholderRegex) || [];
  
  matches.forEach(match => {
    if (!entities.some(e => e.placeholder.includes(match))) {
      result.invalidFormatPlaceholders.push(match);
    }
  });

  result.isValid = result.missingPlaceholders.length === 0 && 
                  result.alteredPlaceholders.length === 0 && 
                  result.invalidFormatPlaceholders.length === 0;

  return result;
};

export const restoreText = (
  maskedText: string,
  entities: DetectedEntity[]
): string => {
  let restoredText = maskedText;
  
  // First, attempt to restore exact matches
  for (const entity of entities) {
    if (restoredText.includes(entity.placeholder)) {
      restoredText = restoredText.replace(entity.placeholder, entity.value);
    }
  }
  
  // Then, attempt to restore from similar placeholders
  const validation = validatePlaceholdersDetailed(maskedText, entities);
  if (validation.recoverable && validation.suggestedFixes.length > 0) {
    for (const { original, modified } of validation.suggestedFixes) {
      const entity = entities.find(e => e.placeholder.includes(original));
      if (entity) {
        restoredText = restoredText.replace(modified, entity.value);
      }
    }
  }
  
  return restoredText;
};

export const validatePlaceholders = (
  text: string,
  entities: DetectedEntity[]
): boolean => {
  const validation = validatePlaceholdersDetailed(text, entities);
  return validation.isValid;
};
