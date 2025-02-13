
// Random data pools for generating realistic substitutes
const randomNames = [
  "Michael Carter", "Emma Thompson", "David Wilson", "Sarah Anderson", "James Taylor",
  "Lisa Morgan", "Robert Davis", "Jennifer White", "William Brown", "Emily Johnson",
  "John Smith", "Maria Garcia", "Daniel Lee", "Susan Miller", "Richard Moore"
];

const randomStreets = [
  "123 Pine Street", "456 Maple Avenue", "789 Oak Road", "321 Cedar Lane", "654 Elm Drive",
  "987 Birch Court", "147 Willow Way", "258 Cherry Street", "369 Spruce Avenue", "741 Ash Road"
];

const randomEmails = [
  "user1@email.com", "contact2@mail.net", "person3@inbox.com", "member4@webmail.com",
  "account5@mail.org", "info6@email.net", "user7@mail.com", "contact8@inbox.net",
  "person9@email.org", "member10@mail.com"
];

const randomPhones = [
  "(555) 123-4567", "(555) 234-5678", "(555) 345-6789", "(555) 456-7890",
  "(555) 567-8901", "(555) 678-9012", "(555) 789-0123", "(555) 890-1234"
];

export const getRandomSubstitute = (type: string, usedValues: Set<string>): string => {
  let pool: string[] = [];
  
  switch (type.toLowerCase()) {
    case 'name':
      pool = randomNames;
      break;
    case 'address':
      pool = randomStreets;
      break;
    case 'email':
      pool = randomEmails;
      break;
    case 'phone':
      pool = randomPhones;
      break;
    default:
      return `[REDACTED-${type.toUpperCase()}]`;
  }

  // Filter out already used values
  const availableValues = pool.filter(value => !usedValues.has(value));
  
  if (availableValues.length === 0) {
    // If all values are used, generate a numbered variant
    const baseValue = pool[Math.floor(Math.random() * pool.length)];
    let counter = 1;
    let newValue = `${baseValue} (${counter})`;
    while (usedValues.has(newValue)) {
      counter++;
      newValue = `${baseValue} (${counter})`;
    }
    return newValue;
  }

  return availableValues[Math.floor(Math.random() * availableValues.length)];
};
