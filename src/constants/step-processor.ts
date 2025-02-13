
import { Step, CategoryColors } from "@/types/step-processor";

export const steps: Step[] = [
  {
    title: "Enter Text & Detect",
    description: "Input your text and let us detect sensitive information automatically.",
    validationMessage: {
      success: "Text ready for detection",
      warning: "Please enter some text to continue",
      error: "No text to process",
    },
  },
  {
    title: "Review & Customize",
    description: "Review detected items and customize redactions as needed.",
    validationMessage: {
      success: "All redactions reviewed and approved",
      warning: "Please review all redacted items",
      error: "No redactions to review",
    },
  },
  {
    title: "Copy & Export",
    description: "Copy your redacted text for external use.",
    validationMessage: {
      success: "Text copied successfully",
      warning: "Copy the text to proceed",
      error: "Failed to copy text",
    },
  },
  {
    title: "Restore",
    description: "Paste modified text to restore original data.",
    validationMessage: {
      success: "Ready to restore original text",
      warning: "Paste the modified text to continue",
      error: "Invalid text format",
    },
  },
];

export const categoryColors: CategoryColors = {
  name: { bg: "bg-purple-100", text: "text-purple-700", icon: "🔵" },
  email: { bg: "bg-orange-100", text: "text-orange-700", icon: "🟠" },
  phone: { bg: "bg-blue-100", text: "text-blue-700", icon: "🟢" },
  address: { bg: "bg-yellow-100", text: "text-yellow-700", icon: "🟡" },
  dob: { bg: "bg-red-100", text: "text-red-700", icon: "🔴" },
  ssn: { bg: "bg-gray-100", text: "text-gray-700", icon: "⚪" },
  account: { bg: "bg-green-100", text: "text-green-700", icon: "🟣" },
  custom: { bg: "bg-pink-100", text: "text-pink-700", icon: "💫" },
};
