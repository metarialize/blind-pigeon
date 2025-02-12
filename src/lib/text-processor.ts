
export type SensitiveDataType = 'name' | 'email' | 'phone' | 'address' | 'ssn' | 'dob' | 'account';

export interface DetectedEntity {
  type: SensitiveDataType;
  value: string;
  placeholder: string;
  index: number;
}

export const generatePlaceholder = (type: SensitiveDataType, index: number): string => {
  return `<<UID:${type.toUpperCase()}:${index.toString().padStart(6, '0')}>>`;
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
  // Add instructions at the beginning of the masked text
  const instructions = `[IMPORTANT: Please maintain all placeholder tags (format: <<UID:TYPE:XXXXXX>>) exactly as they appear. These are essential for restoring the original sensitive information. Do not modify, remove, or change the format of any placeholder.]\n\n`;
  
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
    restoredText = restoredText.replace(entity.placeholder, entity.value);
  }
  
  return restoredText;
};

export const validatePlaceholders = (
  text: string,
  entities: DetectedEntity[]
): boolean => {
  for (const entity of entities) {
    if (!text.includes(entity.placeholder)) {
      return false;
    }
  }
  return true;
};

export interface ValidationResult {
  isValid: boolean;
  missingPlaceholders: string[];
  alteredPlaceholders: string[];
  invalidFormatPlaceholders: string[];
  recoverable: boolean;
  similarPlaceholders: string[];
}

export const validatePlaceholdersDetailed = (
  text: string,
  entities: DetectedEntity[]
): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    missingPlaceholders: [],
    alteredPlaceholders: [],
    invalidFormatPlaceholders: [],
    recoverable: true, // Assume recoverable by default
    similarPlaceholders: [], // Track similar but not exact matches
  };

  for (const entity of entities) {
    if (!text.includes(entity.placeholder)) {
      result.isValid = false;
      result.missingPlaceholders.push(entity.placeholder);
      
      // Check for similar placeholders (e.g. with typos)
      const similarPattern = new RegExp(entity.placeholder.replace(/[<>]/g, '.{1,2}'), 'g');
      const similarMatches = text.match(similarPattern) || [];
      result.similarPlaceholders.push(...similarMatches);
      
      // If we found similar matches, consider it recoverable
      result.recoverable = result.similarPlaceholders.length > 0;
    }

    // Check for malformed placeholders
    const placeholderRegex = /<<UID:[A-Z]+:\d{6}>>/g;
    const matches = text.match(placeholderRegex) || [];
    
    matches.forEach(match => {
      if (!entities.some(e => e.placeholder === match)) {
        result.invalidFormatPlaceholders.push(match);
        result.isValid = false;
        // If the format is wrong but recognizable, it's potentially recoverable
        result.recoverable = true;
      }
    });
  }

  return result;
};

