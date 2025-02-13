
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RotateCcw } from "lucide-react";
import { DetectedEntity, validatePlaceholdersDetailed } from "@/lib/text-processor";
import { useState } from "react";

interface ValidationWarningsProps {
  maskedText: string;
  entities: DetectedEntity[];
}

export function ValidationWarnings({ maskedText, entities }: ValidationWarningsProps) {
  const [validationResult, setValidationResult] = useState(() => 
    validatePlaceholdersDetailed(maskedText, entities)
  );

  if (!maskedText) return null;

  return (
    <div className={`p-4 rounded-lg space-y-2 ${
      validationResult.isValid 
        ? 'bg-green-50 border border-green-200'
        : 'bg-yellow-50 border border-yellow-200'
    }`}>
      <div className="flex items-center gap-2">
        <span>{validationResult.isValid ? '✅' : '❗'}</span>
        <p className={`text-sm font-medium ${
          validationResult.isValid ? 'text-green-700' : 'text-yellow-700'
        }`}>
          {validationResult.isValid 
            ? "Validation successful! Ready to restore original data."
            : "Warning: Some placeholders have been altered. Review before proceeding."}
        </p>
      </div>

      {!validationResult.isValid && (
        <div className="pl-6 space-y-2">
          {validationResult.missingPlaceholders.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-yellow-700">Missing Placeholders:</p>
              <div className="space-y-2">
                {validationResult.missingPlaceholders.map((placeholder, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input 
                      placeholder={`Enter value for ${placeholder}`}
                      className="text-sm font-mono bg-white/50"
                      onChange={(e) => {
                        const newText = maskedText.replace(
                          new RegExp(placeholder, 'g'),
                          e.target.value
                        );
                        setValidationResult(validatePlaceholdersDetailed(newText, entities));
                      }}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setValidationResult(validatePlaceholdersDetailed(maskedText, entities));
                      }}
                    >
                      Verify
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setValidationResult(validatePlaceholdersDetailed(maskedText, entities));
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset & Revalidate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
