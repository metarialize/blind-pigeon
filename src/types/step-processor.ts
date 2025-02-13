
export type SensitiveDataType = 'name' | 'email' | 'phone' | 'address' | 'ssn' | 'dob' | 'account' | 'location' | 'custom';

export type Step = {
  title: string;
  description: string;
  validationMessage: {
    success: string;
    warning: string;
    error: string;
  };
};

export type CategoryColor = {
  bg: string;
  text: string;
  icon: string;
};

export type CategoryColors = Record<SensitiveDataType | 'custom', CategoryColor>;
