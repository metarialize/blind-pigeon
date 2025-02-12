
type SensitiveDataType = 'name' | 'email' | 'phone' | 'address' | 'ssn' | 'dob' | 'account';

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
  // Sort entities by index in descending order to replace from end to start
  const sortedEntities = [...entities].sort((a, b) => b.index - a.index);
  
  for (const entity of sortedEntities) {
    maskedText = 
      maskedText.substring(0, entity.index) +
      entity.placeholder +
      maskedText.substring(entity.index + entity.value.length);
  }
  
  return maskedText;
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
