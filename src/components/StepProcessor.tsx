
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
import { Eye, EyeOff, Copy, RotateCcw, ChevronLeft, ChevronRight, Plus, X, ChevronDown, MoreHorizontal } from "lucide-react";
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
  validatePlaceholdersDetailed,
  generatePlaceholder,
  type DetectedEntity,
  type SensitiveDataType,
  type ValidationResult,
} from "@/lib/text-processor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

const categoryColors: Record<SensitiveDataType, { bg: string; text: string; icon: string }> = {
  name: { bg: "bg-purple-100", text: "text-purple-700", icon: "🔵" },
  email: { bg: "bg-orange-100", text: "text-orange-700", icon: "🟠" },
  phone: { bg: "bg-blue-100", text: "text-blue-700", icon: "🟢" },
  address: { bg: "bg-yellow-100", text: "text-yellow-700", icon: "🟡" },
  dob: { bg: "bg-red-100", text: "text-red-700", icon: "🔴" },
  ssn: { bg: "bg-gray-100", text: "text-gray-700", icon: "⚪" },
  account: { bg: "bg-green-100", text: "text-green-700", icon: "🟣" },
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

const getSummaryByCategory = (entities: DetectedEntity[]) => {
  const summary = entities.reduce((acc, entity) => {
    acc[entity.type] = (acc[entity.type] || 0) + 1;
    return acc;
  }, {} as Record<SensitiveDataType, number>);

  return Object.entries(summary).map(([type, count]) => ({
    type: type as SensitiveDataType,
    count,
    ...categoryColors[type as SensitiveDataType],
  }));
};

export function StepProcessor() {
  const [currentStep, setCurrentStep] = useState(0);
  const [inputText, setInputText] = useState("");
  const [maskedText, setMaskedText] = useState("");
  const [entities, setEntities] = useState<DetectedEntity[]>([]);
  const [showOriginal, setShowOriginal] = useState(true);
  const [manualValue, setManualValue] = useState("");
  const [manualType, setManualType] = useState<keyof typeof categoryColors>("name");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<SensitiveDataType, boolean>>({
    name: false,
    email: false,
    phone: false,
    address: false,
    ssn: false,
    dob: false,
    account: false,
  });
  const { toast } = useToast();

  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    missingPlaceholders: [],
    alteredPlaceholders: [],
    invalidFormatPlaceholders: [],
  });

  const handleDetectAndMask = () => {
    if (!inputText) {
      toast({
        title: "No text to process",
        description: "Please enter some text to detect sensitive data.",
        variant: "destructive",
      });
      return;
    }

    const detected = detectSensitiveData(inputText);
    if (detected.length === 0) {
      toast({
        title: "No sensitive data found",
        description: "No sensitive data was detected in the provided text.",
        variant: "destructive",
      });
      return;
    }

    setEntities(detected);
    const masked = maskText(inputText, detected);
    setMaskedText(masked);
    setShowOriginal(false);
    setCurrentStep(1);
    
    toast({
      title: "Sensitive data masked",
      description: `${detected.length} items were detected and masked.`,
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(maskedText);
      toast({
        title: "✅ Masked text copied successfully!",
        description: "The text is ready for external processing.",
      });
      setCurrentStep(2);
      setMaskedText(maskedText);
    } catch (err) {
      toast({
        title: "❗ Failed to copy",
        description: "Please try copying the text manually.",
        variant: "destructive",
      });
    }
  };

  const handleProceedWithoutCopy = () => {
    if (!maskedText) {
      toast({
        title: "❗ Action required",
        description: "Please copy the masked text before proceeding to the next step.",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep(2);
  };

  const handleExport = (format: 'txt' | 'json') => {
    try {
      let content = '';
      let mimeType = '';
      let fileExtension = '';
      
      if (format === 'json') {
        content = JSON.stringify({
          maskedText,
          timestamp: new Date().toISOString(),
          entityCount: entities.length,
        }, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
      } else {
        content = maskedText;
        mimeType = 'text/plain';
        fileExtension = 'txt';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const link = document.createElement('a');
      link.href = url;
      link.download = `masked_text_${date}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "File exported successfully",
        description: `Saved as masked_text_${date}.${fileExtension}`,
      });
    } catch (err) {
      toast({
        title: "Export failed",
        description: "There was an error exporting the file.",
        variant: "destructive",
      });
    }
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
    setShowOriginal(true);
    
    toast({
      title: "Text restored successfully",
      description: `${entities.length} items were restored.`,
    });
  };

  const handleReset = () => {
    setInputText("");
    setMaskedText("");
    setEntities([]);
    setShowOriginal(true);
    setCurrentStep(0);
    toast({
      title: "Reset successful",
      description: "All text and stored data has been cleared.",
    });
  };

  const handleAddManualEntity = () => {
    if (!manualValue.trim()) {
      toast({
        title: "No value provided",
        description: "Please enter a value to mask.",
        variant: "destructive",
      });
      return;
    }

    const newEntity: DetectedEntity = {
      type: manualType,
      value: manualValue,
      placeholder: generatePlaceholder(manualType, entities.length),
      index: inputText.indexOf(manualValue),
    };

    if (newEntity.index === -1) {
      toast({
        title: "Value not found",
        description: "The provided value was not found in the text.",
        variant: "destructive",
      });
      return;
    }

    setEntities(prev => [...prev, newEntity].sort((a, b) => a.index - b.index));
    const newMaskedText = maskText(inputText, [...entities, newEntity]);
    setMaskedText(newMaskedText);
    setManualValue("");
    setDialogOpen(false);

    toast({
      title: "Item added",
      description: `Added new ${manualType} to masked items.`,
    });
  };

  const handleRemoveEntity = (type: SensitiveDataType, value: string) => {
    const newEntities = entities.filter(e => !(e.type === type && e.value === value));
    setEntities(newEntities);
    const newMaskedText = maskText(inputText, newEntities);
    setMaskedText(newMaskedText);

    toast({
      title: "Item removed",
      description: `Removed ${type} from masked items.`,
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
              className="min-h-[200px] font-mono text-sm transition-all duration-200"
            />
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button onClick={handleDetectAndMask}>
                Detect & Mask Sensitive Data
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <p className="text-sm text-yellow-800 flex items-center">
                <span className="mr-2">⚠️</span>
                Ensure placeholders remain unchanged when processing externally. Modifications may prevent successful re-identification.
              </p>
            </div>
            
            <div className="max-h-[200px] overflow-y-auto p-4 border rounded-lg bg-white font-mono text-sm whitespace-pre-wrap transition-all duration-300">
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

            <Collapsible className="border rounded-lg bg-muted/50">
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full flex justify-between items-center p-4 hover:bg-muted/80"
                >
                  <span className="font-medium">
                    Detected & Masked Items ({entities.length})
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  {entities.length > 0 ? (
                    <div className="space-y-2">
                      {getSummaryByCategory(entities).map(({ type, count, icon, text }) => {
                        const categoryEntities = entities.filter(e => e.type === type);
                        const isExpanded = expandedCategories[type] ?? false;
                        const hasWrappedItems = categoryEntities.length > 3;
                        
                        return (
                          <Collapsible 
                            key={type} 
                            open={isExpanded}
                            onOpenChange={(open) => setExpandedCategories(prev => ({ ...prev, [type]: open }))}
                          >
                            <CollapsibleTrigger asChild>
                              <Button 
                                variant="ghost" 
                                className={`w-full flex justify-between items-center p-2 hover:bg-muted/80 ${text} hover:${text}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{icon}</span>
                                  <span>{type} ({count})</span>
                                  {hasWrappedItems && !isExpanded && (
                                    <span className="text-xs text-muted-foreground">
                                      +{categoryEntities.length - 3} more
                                    </span>
                                  )}
                                </div>
                                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "transform rotate-180" : ""}`} />
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="flex flex-wrap gap-2 p-2">
                                {categoryEntities.map((entity, idx) => (
                                  <div
                                    key={`${type}-${idx}`}
                                    className={`group px-3 py-1.5 rounded-full text-sm flex items-center gap-2 animate-fade-in ${text} bg-white/50 hover:bg-white/80 transition-colors cursor-pointer`}
                                    onClick={() => handleRemoveEntity(entity.type, entity.value)}
                                  >
                                    <span>{entity.value}</span>
                                    <X className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No sensitive data detected</p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleCopy} className="w-full sm:w-auto">
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Masked Text
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to copy and proceed to the next step</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <p className="text-sm text-yellow-800 flex items-center">
                <span className="mr-2">⚠️</span>
                Ensure placeholders remain unchanged when processing externally. Modifications may prevent successful re-identification.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Original Masked Text (Reference)</Label>
              <div className="p-4 bg-muted/50 rounded-lg font-mono text-sm max-h-[100px] overflow-y-auto">
                {formatPlaceholderDisplay(maskedText, entities)}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Paste Modified Text</Label>
              <Textarea
                value={maskedText}
                onChange={(e) => {
                  const newText = e.target.value;
                  setMaskedText(newText);
                  setValidationResult(validatePlaceholdersDetailed(newText, entities));
                }}
                placeholder="Paste the modified masked text here after processing externally..."
                className="min-h-[150px] max-h-[150px] font-mono text-sm overflow-y-auto"
              />
            </div>
            
            {maskedText && (
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
                      <div className="text-sm text-yellow-700">
                        <p className="font-medium">Missing Placeholders:</p>
                        <ul className="list-disc pl-4 pt-1 space-y-1">
                          {validationResult.missingPlaceholders.map((placeholder, idx) => (
                            <li key={idx} className="font-mono text-xs">{placeholder}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {validationResult.invalidFormatPlaceholders.length > 0 && (
                      <div className="text-sm text-yellow-700">
                        <p className="font-medium">Invalid Format Placeholders:</p>
                        <ul className="list-disc pl-4 pt-1 space-y-1">
                          {validationResult.invalidFormatPlaceholders.map((placeholder, idx) => (
                            <li key={idx} className="font-mono text-xs">{placeholder}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setMaskedText(maskedText);
                    setValidationResult(validatePlaceholdersDetailed(maskedText, entities));
                  }}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset & Revalidate
                </Button>
              </div>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={handleRestore}
                      variant={validationResult.isValid ? "default" : "outline"}
                      disabled={!maskedText || !validationResult.isValid}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Restore Original Data
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!maskedText 
                      ? "Please paste the masked text to proceed"
                      : !validationResult.isValid
                      ? "All placeholders must be intact to restore data"
                      : "Click to restore the original text"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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

export default StepProcessor;
