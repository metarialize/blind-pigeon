import stringSimilarity from 'string-similarity';

export type SensitiveDataType = 'name' | 'email' | 'phone' | 'address' | 'ssn' | 'dob' | 'account';

export interface DetectedEntity {
  type: SensitiveDataType;
  value: string;
  placeholder: string;
  index: number;
}

// Unicode markers for placeholder wrapping
const ZERO_WIDTH_SPACE = '\u200C';
const LEFT_BRACKET = '⟦';
const RIGHT_BRACKET = '⟧';

export const generatePlaceholder = (type: SensitiveDataType, index: number): string => {
  const innerPlaceholder = `UID:${type.toUpperCase()}:${index.toString().padStart(6, '0')}`;
  // Add zero-width spaces and mathematical brackets for AI resistance
  return `${ZERO_WIDTH_SPACE}${LEFT_BRACKET}${innerPlaceholder}${RIGHT_BRACKET}${ZERO_WIDTH_SPACE}`;
};

// Fuzzy matching for placeholder validation
const SIMILARITY_THRESHOLD = 0.85;

const isPlaceholderSimilar = (text: string, placeholder: string): boolean => {
  // Remove zero-width spaces and normalize for comparison
  const normalizedText = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
  const normalizedPlaceholder = placeholder.replace(/[\u200B-\u200D\uFEFF]/g, '');
  return stringSimilarity.compareTwoStrings(normalizedText, normalizedPlaceholder) > SIMILARITY_THRESHOLD;
};

export const detectSensitiveData = (text: string): DetectedEntity[] => {
  const entities: DetectedEntity[] = [];
  let index = 0;
  const seenValues = new Map<string, string>(); // Track repeated values

  // Enhanced name detection (including titles and initials)
  const nameRegex = /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b|\b[A-Z]\.\s+[A-Z][a-z]+\b/g;
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

  // Employee ID detection (various formats)
  const employeeIdRegex = /\b(?:EMP|ID|E)[-.]?\d{4,8}\b|\b\d{4,8}[-.]?(?:EMP|ID|E)\b/gi;
  while ((match = employeeIdRegex.exec(text)) !== null) {
    const value = match[0];
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
  // Enhanced instructions with warning about AI modifications
  const instructions = 
`⚠️ IMPORTANT - READ BEFORE PROCESSING ⚠️
1. The following text contains special placeholders that MUST remain intact
2. Format: ${LEFT_BRACKET}UID:TYPE:XXXXXX${RIGHT_BRACKET}
3. DO NOT modify, remove, or change these placeholders
4. AI tools may unintentionally alter these placeholders
5. Keep the exact format and characters of each placeholder

`;
  
  let maskedText = text;
  // Sort entities by index in descending order to replace from end to start
  const sortedEntities = [...entities].sort((a, b) => b.index - a.index);
  
  for (const entity of sortedEntities) {
    maskedText = 
      maskedText.substring(0, entity.index) +
      entity.placeholder +
      maskedText.substring(entity.index + entity.value.length);
  }
  
  return instructions + maskedText;
};

export const restoreText = (
  maskedText: string,
  entities: DetectedEntity[]
): string => {
  let restoredText = maskedText;
  
  for (const entity of entities) {
    // Use fuzzy matching to find similar placeholders
    const regex = new RegExp(escapeRegExp(entity.placeholder.replace(/[\u200B-\u200D\uFEFF]/g, '')), 'g');
    restoredText = restoredText.replace(regex, entity.value);
  }
  
  return restoredText;
};

// Helper function to escape special characters in regex
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export interface ValidationResult {
  isValid: boolean;
  missingPlaceholders: string[];
  alteredPlaceholders: string[];
  invalidFormatPlaceholders: string[];
  recoverable: boolean;
  similarPlaceholders: Array<{
    original: string;
    found: string;
    similarity: number;
  }>;
}

export const validatePlaceholders = (
  text: string,
  entities: DetectedEntity[]
): boolean => {
  return validatePlaceholdersDetailed(text, entities).isValid;
};

export const validatePlaceholdersDetailed = (
  text: string,
  entities: DetectedEntity[]
): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    missingPlaceholders: [],
    alteredPlaceholders: [],
    invalidFormatPlaceholders: [],
    recoverable: true,
    similarPlaceholders: [],
  };

  // Remove instruction block if present
  const contentStart = text.indexOf('⚠️ IMPORTANT');
  const contentToCheck = contentStart >= 0 ? text.slice(text.indexOf('\n\n', contentStart) + 2) : text;

  for (const entity of entities) {
    const normalizedPlaceholder = entity.placeholder.replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    if (!contentToCheck.includes(normalizedPlaceholder)) {
      result.isValid = false;
      result.missingPlaceholders.push(entity.placeholder);

      // Check for similar placeholders using fuzzy matching
      const possibleMatch = contentToCheck.match(new RegExp(`[^${LEFT_BRACKET}]*${escapeRegExp(normalizedPlaceholder.slice(1, -1))}[^${RIGHT_BRACKET}]*`, 'g'));
      if (possibleMatch) {
        possibleMatch.forEach(match => {
          const similarity = stringSimilarity.compareTwoStrings(match, normalizedPlaceholder);
          if (similarity > SIMILARITY_THRESHOLD) {
            result.recoverable = true;
            result.similarPlaceholders.push({
              original: entity.placeholder,
              found: match,
              similarity,
            });
          }
        });
      }
    }
  }

  // Check for invalid format placeholders
  const placeholderRegex = new RegExp(`${LEFT_BRACKET}[^${RIGHT_BRACKET}]+${RIGHT_BRACKET}`, 'g');
  const matches = contentToCheck.match(placeholderRegex) || [];
  
  matches.forEach(match => {
    if (!entities.some(e => isPlaceholderSimilar(match, e.placeholder))) {
      result.invalidFormatPlaceholders.push(match);
      result.isValid = false;
    }
  });

  // Set overall recoverability
  result.recoverable = result.recoverable && result.similarPlaceholders.length > 0;

  return result;
};
