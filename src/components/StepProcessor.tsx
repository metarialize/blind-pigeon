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
  generatePlaceholder,
  type DetectedEntity,
  type SensitiveDataType,
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
  const [expandedCategories, setExpandedCategories] = useState<Record<SensitiveDataType, boolean>>({});
  const { toast } = useToast();

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
        title: "Copied to clipboard",
        description: "The masked text has been copied to your clipboard.",
      });
      setCurrentStep(2);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try copying the text manually.",
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
            <div className="flex justify-end mb-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Manual Mask
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Item to Mask</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="value">Text to Mask</Label>
                      <Input
                        id="value"
                        value={manualValue}
                        onChange={(e) => setManualValue(e.target.value)}
                        placeholder="Enter text to mask..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={manualType}
                        onValueChange={(value: keyof typeof categoryColors) => setManualType(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(categoryColors).map(([type, { icon }]) => (
                            <SelectItem key={type} value={type}>
                              {icon} {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddManualEntity}>Add Item</Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOriginal(!showOriginal)}
                className="ml-2 transition-all duration-200"
              >
                {showOriginal ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Show Masked
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Show Original
                  </>
                )}
              </Button>
            </div>
            <div className="p-4 border rounded-lg bg-white font-mono text-sm whitespace-pre-wrap transition-all duration-300">
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
              <Button onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Masked Text
              </Button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <Textarea
              value={maskedText}
              onChange={(e) => setMaskedText(e.target.value)}
              placeholder="Paste the processed masked text here..."
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
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

export default StepProcessor;
