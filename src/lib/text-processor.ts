export type SensitiveDataType = 'name' | 'email' | 'phone' | 'address' | 'ssn' | 'dob' | 'account' | 'custom' | 'place';

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
  duplicateSubstitutes: string[];
  inconsistentMappings: { value: string; substitutes: string[]; }[];
}

import { getRandomSubstitute } from './random-data';

const ZERO_WIDTH_SPACE = '\u200C';

const BRACKET_STYLES: Record<SensitiveDataType, { open: string; close: string }> = {
  name: { open: '{', close: '}' },
  email: { open: '⟦', close: '⟧' },
  phone: { open: '⟪', close: '⟫' },
  address: { open: '⟬', close: '⟭' },
  ssn: { open: '❲', close: '❳' },
  dob: { open: '⟨', close: '⟩' },
  account: { open: '❴', close: '❵' },
  custom: { open: '「', close: '」' },
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

export interface SubstitutionMapping {
  original: string;
  substitute: string;
  type: SensitiveDataType;
  approved?: boolean;
}

let currentSessionMappings = new Map<string, SubstitutionMapping>();

export const clearSessionMappings = () => {
  currentSessionMappings.clear();
};

export const generateSubstitute = (
  type: SensitiveDataType,
  value: string,
  usedSubstitutes: Map<string, string>
): string => {
  const existingMapping = currentSessionMappings.get(value);
  if (existingMapping) {
    return existingMapping.substitute;
  }

  const usedValues = new Set(usedSubstitutes.values());
  const substitute = getRandomSubstitute(type, usedValues);
  
  currentSessionMappings.set(value, {
    original: value,
    substitute,
    type,
    approved: false
  });
  
  usedSubstitutes.set(value, substitute);
  return substitute;
};

// Comprehensive exclusion list
const exclusions = new Set([
  // Months and Days
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  
  // Companies and Brands
  'Samsung', 'Apple', 'Google', 'Microsoft', 'Amazon', 'Facebook', 'Twitter', 'LinkedIn', 'Instagram',
  
  // Street Types
  'Street', 'Avenue', 'Road', 'Boulevard', 'Lane', 'Drive', 'Circle', 'Court', 'Way', 'Place',
  'St', 'Ave', 'Rd', 'Blvd', 'Ln', 'Dr', 'Cir', 'Ct', 'Pl',
  
  // Business Terms
  'Inc', 'LLC', 'Corp', 'Corporation', 'Company', 'Limited', 'International', 'Industries',
  
  // Locations and Institutions
  'New', 'York', 'City', 'Los', 'Angeles', 'San', 'Francisco', 'Chicago', 'Boston', 'Seattle',
  'North', 'South', 'East', 'West', 'Central', 'University', 'College', 'Institute', 'School',
  'Medical', 'Hospital', 'Center', 'Department',
  
  // Common Phrases and Terms
  'Social', 'Security', 'Medicare', 'Medicaid', 'Administration', 'Government',
  'There', 'That', 'This', 'Been', 'Done', 'Made', 'Corporate', 'Public', 'Private',
  'Northwestern', 'Southern', 'Eastern', 'Western', 'National', 'International',
  
  // Common Business Names
  'Bean', 'Coffee', 'Cafe', 'Restaurant', 'Shop', 'Store', 'Market', 'Bank', 'Financial',
  
  // States
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'Hampshire',
  'Jersey', 'Mexico', 'Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode',
  'Island', 'Carolina', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'Wisconsin', 'Wyoming'
]);

const detectPlaces = (text: string): DetectedEntity[] => {
  const placeRegex = /\b(?:(?:University|College|Hospital|School|Mall|Park|Station|Airport|Museum|Theater|Library|Restaurant|Cafe|Hotel|Plaza|Center|Centre|Building)\s+(?:of\s+)?[A-Z][a-zA-Z\s&]+|\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:University|College|Hospital|School|Mall|Park|Station|Airport|Museum|Theater|Library|Restaurant|Cafe|Hotel|Plaza|Center|Centre|Building))\b/g;
  const entities: DetectedEntity[] = [];
  const usedSubstitutes = new Map<string, string>();

  let match;
  while ((match = placeRegex.exec(text)) !== null) {
    const value = match[0];
    if (!exclusions.has(value)) {
      entities.push({
        type: 'place',
        value,
        substitute: generateSubstitute('place', value, usedSubstitutes),
        index: match.index,
      });
    }
  }
  return entities;
};

export const detectSensitiveData = (text: string): DetectedEntity[] => {
  const entities: DetectedEntity[] = [];
  const usedSubstitutes = new Map<string, string>();

  // Detect places first to avoid conflicts with names
  const placeEntities = detectPlaces(text);
  entities.push(...placeEntities);

  // Name detection
  const nameRegex = /\b[A-Z][a-z]+(?:\s+(?:[A-Z][a-z]+|[A-Z]\.)){1,2}\b(?!\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Inc|LLC|Corp|University|College|Hospital|School))/g;
  let match;
  while ((match = nameRegex.exec(text)) !== null) {
    const value = match[0];
    const nameParts = value.split(/\s+/);
    const isExcluded = nameParts.some(part => exclusions.has(part));
    
    const isLikelyName = (
      nameParts.length >= 2 &&
      nameParts.every(part => part.length >= 2) &&
      !placeEntities.some(place => place.value.includes(value))
    );
    
    if (!isExcluded && isLikelyName) {
      entities.push({
        type: 'name',
        value,
        substitute: generateSubstitute('name', value, usedSubstitutes),
        index: match.index,
      });
    }
  }

  // Email pattern (unchanged)
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

  // Phone number pattern (unchanged)
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

  // More specific address pattern
  const addressRegex = /\b\d+(?:\s+[A-Za-z]+)+(?:\s+(?:Avenue|Ave|Street|St|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Circle|Cir|Court|Ct|Way|Place|Pl))\b(?!\s+(?:January|February|March|April|May|June|July|August|September|October|November|December))/gi;
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
    duplicateSubstitutes: [],
    inconsistentMappings: []
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

export const getMappings = (): SubstitutionMapping[] => {
  return Array.from(currentSessionMappings.values());
};

export const updateMapping = (original: string, newSubstitute: string) => {
  const mapping = currentSessionMappings.get(original);
  if (mapping) {
    mapping.substitute = newSubstitute;
    mapping.approved = true;
    currentSessionMappings.set(original, mapping);
  }
};

export const approveMapping = (original: string) => {
  const mapping = currentSessionMappings.get(original);
  if (mapping) {
    mapping.approved = true;
    currentSessionMappings.set(original, mapping);
  }
};

export const validateSubstitutions = (entities: DetectedEntity[]): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    missingPlaceholders: [],
    alteredPlaceholders: [],
    invalidFormatPlaceholders: [],
    recoverable: true,
    suggestedFixes: [],
    duplicateSubstitutes: [],
    inconsistentMappings: []
  };

  const substituteCounts = new Map<string, string[]>();
  const valueMappings = new Map<string, Set<string>>();

  for (const entity of entities) {
    // Check for duplicate substitutes
    if (!substituteCounts.has(entity.substitute)) {
      substituteCounts.set(entity.substitute, [entity.value]);
    } else {
      substituteCounts.get(entity.substitute)?.push(entity.value);
    }

    // Check for inconsistent mappings
    if (!valueMappings.has(entity.value)) {
      valueMappings.set(entity.value, new Set([entity.substitute]));
    } else {
      valueMappings.get(entity.value)?.add(entity.substitute);
    }
  }

  // Find duplicates
  for (const [substitute, originals] of substituteCounts) {
    if (originals.length > 1) {
      result.duplicateSubstitutes.push(substitute);
    }
  }

  // Find inconsistencies
  for (const [value, substitutes] of valueMappings) {
    if (substitutes.size > 1) {
      result.inconsistentMappings.push({
        value,
        substitutes: Array.from(substitutes)
      });
    }
  }

  result.isValid = result.duplicateSubstitutes.length === 0 && 
                   result.inconsistentMappings.length === 0;

  return result;
};
