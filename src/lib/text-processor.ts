
type SensitiveDataType = 'name' | 'email' | 'phone' | 'address' | 'ssn' | 'dob';

interface DetectedEntity {
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

  // Email detection
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  let match;
  while ((match = emailRegex.exec(text)) !== null) {
    entities.push({
      type: 'email',
      value: match[0],
      placeholder: generatePlaceholder('email', index++),
      index: match.index,
    });
  }

  // Phone number detection (basic US format)
  const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
  while ((match = phoneRegex.exec(text)) !== null) {
    entities.push({
      type: 'phone',
      value: match[0],
      placeholder: generatePlaceholder('phone', index++),
      index: match.index,
    });
  }

  // SSN detection (basic format)
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  while ((match = ssnRegex.exec(text)) !== null) {
    entities.push({
      type: 'ssn',
      value: match[0],
      placeholder: generatePlaceholder('ssn', index++),
      index: match.index,
    });
  }

  return entities;
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
