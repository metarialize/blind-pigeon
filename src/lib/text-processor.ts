export type SensitiveDataType = 'name' | 'email' | 'phone' | 'address' | 'ssn' | 'dob' | 'account';

export interface DetectedEntity {
  type: SensitiveDataType;
  value: string;
  substitute: string;
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

const ZERO_WIDTH_SPACE = '\u200C';

const BRACKET_STYLES: Record<SensitiveDataType, { open: string; close: string }> = {
  name: { open: '{', close: '}' },
  email: { open: '⟦', close: '⟧' },
  phone: { open: '⟪', close: '⟫' },
  address: { open: '⟬', close: '⟭' },
  ssn: { open: '❲', close: '❳' },
  dob: { open: '⟨', close: '⟩' },
  account: { open: '❴', close: '❵' },
};

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

const findSimilarPlaceholder = (text: string, original: string): string | null => {
  const cleanText = text.replace(new RegExp(ZERO_WIDTH_SPACE, 'g'), '');
  const cleanOriginal = original.replace(new RegExp(ZERO_WIDTH_SPACE, 'g'), '');
  
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

const getRandomSubstitute = (type: SensitiveDataType, usedValues: Set<string>): string => {
  const { open, close } = BRACKET_STYLES[type];
  const placeholder = `${open}UID:${type.toUpperCase()}:${usedValues.size.toString().padStart(6, '0')}${close}`;
  return `${ZERO_WIDTH_SPACE}${placeholder}${ZERO_WIDTH_SPACE}`;
};

export const generateSubstitute = (type: SensitiveDataType, value: string, usedSubstitutes: Map<string, string>): string => {
  if (usedSubstitutes.has(value)) {
    return usedSubstitutes.get(value)!;
  }

  const usedValues = new Set(usedSubstitutes.values());
  const substitute = getRandomSubstitute(type, usedValues);
  usedSubstitutes.set(value, substitute);
  return substitute;
};

export const detectSensitiveData = (text: string): DetectedEntity[] => {
  const entities: DetectedEntity[] = [];
  const usedSubstitutes = new Map<string, string>();
  let index = 0;

  const nameRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;
  let match;
  while ((match = nameRegex.exec(text)) !== null) {
    const value = match[0];
    entities.push({
      type: 'name',
      value,
      substitute: generateSubstitute('name', value, usedSubstitutes),
      index: match.index,
    });
  }

  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  while ((match = emailRegex.exec(text)) !== null) {
    const value = match[0];
    entities.push({
      type: 'email',
      value,
      substitute: generateSubstitute('email', value, usedSubstitutes),
      index: match.index,
    });
  }

  const phoneRegex = /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  while ((match = phoneRegex.exec(text)) !== null) {
    const value = match[0];
    entities.push({
      type: 'phone',
      value,
      substitute: generateSubstitute('phone', value, usedSubstitutes),
      index: match.index,
    });
  }

  const addressRegex = /\b\d+\s+[A-Za-z\s,]+(?:Avenue|Ave|Street|St|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Circle|Cir|Court|Ct|Way|Place|Pl)\b/gi;
  while ((match = addressRegex.exec(text)) !== null) {
    const value = match[0];
    entities.push({
      type: 'address',
      value,
      substitute: generateSubstitute('address', value, usedSubstitutes),
      index: match.index,
    });
  }

  return entities.sort((a, b) => a.index - b.index);
};

export const maskText = (text: string, entities: DetectedEntity[]): string => {
  let maskedText = text;
  const sortedEntities = [...entities].sort((a, b) => b.index - a.index);
  
  for (const entity of sortedEntities) {
    maskedText = 
      maskedText.substring(0, entity.index) +
      entity.substitute +
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
    if (!maskedText.includes(entity.substitute)) {
      result.missingPlaceholders.push(entity.substitute);
      result.recoverable = false;
    }
  }

  result.isValid = result.missingPlaceholders.length === 0;
  return result;
};

export const restoreText = (
  maskedText: string,
  entities: DetectedEntity[]
): string => {
  let restoredText = maskedText;
  
  for (const entity of entities) {
    restoredText = restoredText.replace(entity.substitute, entity.value);
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
