
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, Copy, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import {
  detectSensitiveData,
  maskText,
  restoreText,
  validatePlaceholders,
  type DetectedEntity,
} from "@/lib/text-processor";

type Step = {
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    title: "Enter Text",
    description: "Paste or type your content containing sensitive information.",
  },
  {
    title: "Review Detection",
    description: "Review automatically detected sensitive data.",
  },
  {
    title: "Mask & Export",
    description: "Copy the masked text for external processing.",
  },
  {
    title: "Process & Restore",
    description: "Paste processed text to restore original data.",
  },
];

export function StepProcessor() {
  const [currentStep, setCurrentStep] = useState(0);
  const [inputText, setInputText] = useState("");
  const [maskedText, setMaskedText] = useState("");
  const [entities, setEntities] = useState<DetectedEntity[]>([]);
  const [isMasked, setIsMasked] = useState(false);
  const { toast } = useToast();

  const handleDetect = () => {
    if (!inputText) {
      toast({
        title: "No text to process",
        description: "Please enter some text to detect sensitive data.",
        variant: "destructive",
      });
      return;
    }

    const detected = detectSensitiveData(inputText);
    setEntities(detected);
    
    toast({
      title: "Detection complete",
      description: `Found ${detected.length} sensitive items.`,
    });
  };

  const handleMask = () => {
    if (entities.length === 0) {
      toast({
        title: "No sensitive data",
        description: "No sensitive data was detected to mask.",
        variant: "destructive",
      });
      return;
    }

    const masked = maskText(inputText, entities);
    setMaskedText(masked);
    setIsMasked(true);

    toast({
      title: "Text masked successfully",
      description: `${entities.length} sensitive items were masked.`,
    });
  };

  const handleRestore = () => {
    if (!maskedText) {
      toast({
        title: "No masked text",
        description: "Please paste the masked text to restore.",
        variant: "destructive",
      });
      return;
    }

    if (!validatePlaceholders(maskedText, entities)) {
      toast({
        title: "Invalid masked text",
        description: "Some placeholders are missing or modified.",
        variant: "destructive",
      });
      return;
    }

    const restored = restoreText(maskedText, entities);
    setInputText(restored);
    setIsMasked(false);
    
    toast({
      title: "Text restored successfully",
      description: `${entities.length} items were restored.`,
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(maskedText);
      toast({
        title: "Copied to clipboard",
        description: "The masked text has been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try copying the text manually.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setInputText("");
    setMaskedText("");
    setEntities([]);
    setIsMasked(false);
    setCurrentStep(0);
    toast({
      title: "Reset successful",
      description: "All text and stored data has been cleared.",
    });
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text containing sensitive data..."
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button onClick={handleDetect}>
                Detect Sensitive Data
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <h3 className="font-medium mb-2">Detected Items:</h3>
              {entities.length > 0 ? (
                <ul className="space-y-2">
                  {entities.map((entity, idx) => (
                    <li key={idx} className="text-sm">
                      {entity.type}: <code className="text-xs bg-muted px-1 py-0.5 rounded">{entity.value}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No sensitive data detected</p>
              )}
            </div>
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleMask}>
                Mask Data
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <Textarea
              value={maskedText}
              readOnly
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Masked Text
              </Button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <Textarea
              value={maskedText}
              onChange={(e) => setMaskedText(e.target.value)}
              placeholder="Paste the processed masked text here..."
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleRestore}>
                <Eye className="mr-2 h-4 w-4" />
                Restore Original Data
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <Card className="p-6 backdrop-blur-sm bg-white/90 shadow-lg">
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {steps[currentStep].title}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {steps[currentStep].description}
              </p>
            </div>
            <div className="text-sm font-medium">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>

          <div className="min-h-[300px]">
            {renderStepContent(currentStep)}
          </div>
        </div>
      </Card>
    </div>
  );
}
