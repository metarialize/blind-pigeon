
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  detectSensitiveData,
  maskText,
  restoreText,
  validatePlaceholders,
  validatePlaceholdersDetailed,
  type DetectedEntity,
} from "@/lib/text-processor";
import { StepIndicator } from "./step-processor/StepIndicator";
import { StepContent } from "./step-processor/StepContent";
import { steps } from "@/constants/step-processor";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { categoryColors } from "@/constants/step-processor";
import { Copy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGesture } from "@use-gesture/react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export function StepProcessor() {
  const [currentStep, setCurrentStep] = useState(0);
  const [inputText, setInputText] = useState("");
  const [maskedText, setMaskedText] = useState("");
  const [entities, setEntities] = useState<DetectedEntity[]>([]);
  const [showOriginal, setShowOriginal] = useState(true);
  const [allItemsReviewed, setAllItemsReviewed] = useState(false);
  const [textCopied, setTextCopied] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const { toast } = useToast();

  const [validationResult, setValidationResult] = useState(() =>
    validatePlaceholdersDetailed("", [])
  );

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return inputText.trim().length > 0;
      case 1:
        return entities.length > 0;
      case 2:
        return textCopied && maskedText.length > 0;
      case 3:
        return validationResult.isValid;
      default:
        return false;
    }
  };

  const getStepStatus = (step: number): 'success' | 'warning' | 'error' | undefined => {
    if (!isStepValid(step)) {
      return currentStep === step ? 'warning' : 'error';
    }
    return 'success';
  };

  const bind = useGesture(
    {
      onDrag: ({ swipe: [swipeX] }) => {
        if (swipeX < 0 && currentStep < steps.length - 1) {
          handleNext();
        } else if (swipeX > 0 && currentStep > 0) {
          handleBack();
        }
      },
    },
    {
      drag: {
        from: [0, 0],
        filterTaps: true,
        threshold: 10,
      },
    }
  );

  const handleDetectAndMask = () => {
    if (!inputText) {
      toast({
        title: "No text to process",
        description: "Please enter some text to detect sensitive data.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    const detected = detectSensitiveData(inputText);
    if (detected.length === 0) {
      toast({
        title: "No sensitive data found",
        description: "No sensitive data was detected in the text.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setEntities(detected);
    const masked = maskText(inputText, detected);
    setMaskedText(masked);
    setShowOriginal(false);
    setCurrentStep(1);
    setAllItemsReviewed(false);
    setTextCopied(false);
    
    toast({
      title: "Sensitive data masked",
      description: `${detected.length} items were automatically detected and masked.`,
      duration: 3000,
    });
  };

  const handleCopy = async () => {
    if (!maskedText) {
      toast({
        title: "No text to copy",
        description: steps[2].validationMessage.error,
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(maskedText);
      setTextCopied(true);
      toast({
        title: "✅ Text copied successfully!",
        description: steps[2].validationMessage.success,
        duration: 3000,
      });
      setCurrentStep(prev => prev + 1);
    } catch (err) {
      toast({
        title: "❗ Failed to copy",
        description: steps[2].validationMessage.error,
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleNext = () => {
    if (isStepValid(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else {
      setShowValidationDialog(true);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleReset = () => {
    setInputText("");
    setMaskedText("");
    setEntities([]);
    setShowOriginal(true);
    setCurrentStep(0);
    setAllItemsReviewed(false);
    setTextCopied(false);
    toast({
      title: "Reset successful",
      description: "All text and stored data has been cleared.",
    });
  };

  const formatPlaceholderDisplay = (text: string, entities: DetectedEntity[]): JSX.Element => {
    let lastIndex = 0;
    const elements: JSX.Element[] = [];
    
    entities.forEach((entity, idx) => {
      if (lastIndex < entity.index) {
        elements.push(
          <span key={`text-${idx}`}>
            {text.slice(lastIndex, entity.index)}
          </span>
        );
      }
      
      const category = categoryColors[entity.type] || categoryColors.custom;
      elements.push(
        <HoverCard key={`substitute-${idx}`}>
          <HoverCardTrigger asChild>
            <span
              className={`px-1.5 py-0.5 rounded cursor-help transition-colors ${category.bg} ${category.text} hover:opacity-90`}
            >
              {category.icon} {entity.substitute}
            </span>
          </HoverCardTrigger>
          <HoverCardContent className="w-fit p-3 space-y-2">
            <div className="text-sm space-y-1.5">
              <div className="font-semibold">{entity.type.toUpperCase()}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Original:</span>
                <div className="flex items-center gap-1.5">
                  <code className="px-2 py-1 bg-muted rounded text-xs">
                    {entity.value}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      navigator.clipboard.writeText(entity.value);
                      toast({
                        title: "Copied to clipboard",
                        duration: 2000,
                      });
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      );
      
      lastIndex = entity.index + entity.value.length;
    });
    
    if (lastIndex < text.length) {
      elements.push(
        <span key="text-end">{text.slice(lastIndex)}</span>
      );
    }
    
    return <>{elements}</>;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card 
        className="p-6 backdrop-blur-sm bg-white/90 shadow-lg transition-all duration-300"
        {...bind.bind}
      >
        <div className="space-y-6">
          <StepIndicator
            currentStep={currentStep}
            getStepStatus={getStepStatus}
          />
          
          <StepContent
            currentStep={currentStep}
            inputText={inputText}
            setInputText={setInputText}
            maskedText={maskedText}
            entities={entities}
            showOriginal={showOriginal}
            setShowOriginal={setShowOriginal}
            handleDetectAndMask={handleDetectAndMask}
            handleCopy={handleCopy}
            handleReset={handleReset}
            handleBack={handleBack}
            handleNext={handleNext}
            isStepValid={isStepValid}
            formatPlaceholderDisplay={formatPlaceholderDisplay}
          />
        </div>
      </Card>

      <AlertDialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Action Required
            </AlertDialogTitle>
            <AlertDialogDescription>
              {steps[currentStep].validationMessage.warning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Got it</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default StepProcessor;
