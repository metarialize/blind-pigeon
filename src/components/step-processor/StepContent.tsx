
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, Copy, RotateCcw, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { DetectedEntity } from "@/lib/text-processor";
import { RedactedItemsList } from "./RedactedItemsList";
import { ValidationWarnings } from "./ValidationWarnings";

interface StepContentProps {
  currentStep: number;
  inputText: string;
  setInputText: (text: string) => void;
  maskedText: string;
  entities: DetectedEntity[];
  showOriginal: boolean;
  setShowOriginal: (show: boolean) => void;
  handleDetectAndMask: () => void;
  handleCopy: () => void;
  handleReset: () => void;
  handleBack: () => void;
  handleNext: () => void;
  isStepValid: (step: number) => boolean;
  formatPlaceholderDisplay: (text: string, entities: DetectedEntity[]) => JSX.Element;
}

export function StepContent({
  currentStep,
  inputText,
  setInputText,
  maskedText,
  entities,
  showOriginal,
  setShowOriginal,
  handleDetectAndMask,
  handleCopy,
  handleReset,
  handleBack,
  handleNext,
  isStepValid,
  formatPlaceholderDisplay,
}: StepContentProps) {
  switch (currentStep) {
    case 0:
      return (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Enter your text below. Names, emails, and phone numbers will be automatically detected and redacted.
              You can add more custom redactions in the next step.
            </p>
          </div>
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your text here to detect and redact sensitive information..."
            className="min-h-[200px] font-mono text-sm transition-all duration-200 focus:ring-2 focus:ring-primary"
          />
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="transition-colors duration-200"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button 
              onClick={handleDetectAndMask}
              disabled={!inputText.trim()}
              className={`transition-all duration-300 ${
                !inputText.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
              }`}
            >
              <Shield className="mr-2 h-4 w-4" />
              Detect & Redact
            </Button>
          </div>
        </div>
      );

    case 1:
      return (
        <div className="space-y-4 animate-fade-in">
          <div className="relative p-4 border rounded-lg bg-white shadow-sm">
            <div className="absolute top-4 right-4 space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOriginal(!showOriginal)}
                className="hover:bg-muted/50"
              >
                {showOriginal ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="font-mono text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto scrollbar-hide">
              {showOriginal ? (
                <div className="animate-fade-in">
                  {inputText}
                </div>
              ) : (
                <div className="animate-fade-in">
                  {formatPlaceholderDisplay(maskedText, entities)}
                </div>
              )}
            </div>
          </div>

          <RedactedItemsList
            entities={entities}
            maskedText={maskedText}
          />

          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={handleCopy}
              disabled={!maskedText}
              className={`transition-all duration-300 ${
                !maskedText ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
              }`}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Redacted Text
            </Button>
          </div>
        </div>
      );

    case 2:
      return (
        <div className="space-y-4">
          <ValidationWarnings maskedText={maskedText} entities={entities} />
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isStepValid(currentStep)}
              className={`transition-all duration-300 ${
                !isStepValid(currentStep) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
              }`}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      );

    default:
      return null;
  }
}
