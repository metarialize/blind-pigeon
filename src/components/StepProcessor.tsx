
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
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

const categoryColors: Record<string, { bg: string; text: string; icon: string }> = {
  name: { bg: "bg-purple-100", text: "text-purple-700", icon: "🔵" },
  email: { bg: "bg-orange-100", text: "text-orange-700", icon: "🟠" },
  phone: { bg: "bg-blue-100", text: "text-blue-700", icon: "🟢" },
  address: { bg: "bg-yellow-100", text: "text-yellow-700", icon: "🟡" },
  dob: { bg: "bg-red-100", text: "text-red-700", icon: "🔴" },
  ssn: { bg: "bg-gray-100", text: "text-gray-700", icon: "⚪" },
};

const formatPlaceholderDisplay = (text: string, entities: DetectedEntity[]): JSX.Element => {
  let lastIndex = 0;
  const elements: JSX.Element[] = [];
  
  entities.forEach((entity, idx) => {
    // Add text before the placeholder
    if (lastIndex < entity.index) {
      elements.push(
        <span key={`text-${idx}`}>
          {text.slice(lastIndex, entity.index)}
        </span>
      );
    }
    
    // Add the styled placeholder with hover/click reveal
    const category = categoryColors[entity.type] || categoryColors.name;
    elements.push(
      <HoverCard key={`placeholder-${idx}`}>
        <HoverCardTrigger asChild>
          <span
            className={`px-1.5 py-0.5 rounded cursor-help transition-colors ${category.bg} ${category.text} hover:opacity-90`}
          >
            {category.icon} {entity.placeholder}
          </span>
        </HoverCardTrigger>
        <HoverCardContent className="w-fit p-2">
          <div className="text-sm">
            <div className="font-semibold mb-1">{entity.type.toUpperCase()}</div>
            <code className="px-2 py-1 bg-muted rounded text-xs">
              {entity.value}
            </code>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
    
    lastIndex = entity.index + entity.placeholder.length;
  });
  
  // Add remaining text after last placeholder
  if (lastIndex < text.length) {
    elements.push(
      <span key="text-end">{text.slice(lastIndex)}</span>
    );
  }
  
  return <>{elements}</>;
};

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
                      <span className={`${categoryColors[entity.type]?.text || ""}`}>
                        {categoryColors[entity.type]?.icon} {entity.type}:
                      </span>{" "}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {entity.value}
                      </code>
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
            <div className="p-4 border rounded-lg bg-white font-mono text-sm whitespace-pre-wrap">
              {formatPlaceholderDisplay(maskedText, entities)}
            </div>
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
    <TooltipProvider>
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
    </TooltipProvider>
  );
}
