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
import { Eye, EyeOff, Copy, RotateCcw, ChevronLeft, ChevronRight, Plus, X, ChevronDown, Shield, Download } from "lucide-react";
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
  generateSubstitute,
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
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
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
    title: "Redact Text",
    description: "Automatically detect and redact sensitive information in one click.",
  },
  {
    title: "Review & Customize",
    description: "Effortlessly identify and redact names, addresses, dates, and other sensitive details while maintaining context.",
  },
  {
    title: "Copy & Export",
    description: "Securely copy your redacted text for external use.",
  },
  {
    title: "Restore Text",
    description: "Safely restore your original text when needed.",
  },
];

const categoryColors: Record<SensitiveDataType | 'custom', { bg: string; text: string; icon: string }> = {
  name: { bg: "bg-purple-100", text: "text-purple-700", icon: "🔵" },
  email: { bg: "bg-orange-100", text: "text-orange-700", icon: "🟠" },
  phone: { bg: "bg-blue-100", text: "text-blue-700", icon: "🟢" },
  address: { bg: "bg-yellow-100", text: "text-yellow-700", icon: "🟡" },
  dob: { bg: "bg-red-100", text: "text-red-700", icon: "🔴" },
  ssn: { bg: "bg-gray-100", text: "text-gray-700", icon: "⚪" },
  account: { bg: "bg-green-100", text: "text-green-700", icon: "🟣" },
  custom: { bg: "bg-pink-100", text: "text-pink-700", icon: "💫" },
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
    
    lastIndex = entity.index + entity.value.length;
  });
  
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
  const [manualType, setManualType] = useState<SensitiveDataType | "custom">("name");
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
    recoverable: true,
    suggestedFixes: []
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

  const handlePaste = (newText: string) => {
    setMaskedText(newText);
    const validation = validatePlaceholdersDetailed(newText, entities);
    setValidationResult(validation);
    
    if (!validation.isValid) {
      const message = validation.recoverable 
        ? "Some placeholders were modified but may be recoverable."
        : "Some placeholders are missing or severely modified.";
      
      toast({
        title: "Validation Warning",
        description: message,
        variant: "destructive",
      });
    }
  };

  const renderValidationWarnings = () => {
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
                          setMaskedText(newText);
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
  };

  const handleCopy = async () => {
    if (!maskedText) {
      toast({
        title: "No text to copy",
        description: "Please process some text first.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(maskedText);
      toast({
        title: "✅ Text copied successfully!",
        description: "You can now edit the text externally and paste it back when done.",
      });
      setCurrentStep(2);
    } catch (err) {
      toast({
        title: "❗ Failed to copy",
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
        description: "Please enter a value to redact.",
        variant: "destructive",
      });
      return;
    }

    const newEntity: DetectedEntity = {
      type: manualType,
      value: manualValue,
      substitute: generateSubstitute(manualType, manualValue, new Map()),
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
    
    toast({
      title: "Item added",
      description: `Added new ${manualType} to redacted items.`,
    });
  };

  const handleRemoveEntity = (type: SensitiveDataType, value: string) => {
    const newEntities = entities.filter(e => !(e.type === type && e.value === value));
    setEntities(newEntities);
    const newMaskedText = maskText(inputText, newEntities);
    setMaskedText(newMaskedText);

    toast({
      title: "Item removed",
      description: `Removed ${type} from redacted items.`,
    });
  };

  const renderStepIndicator = () => {
    return (
      <div className="w-full mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className={`flex-1 ${idx !== steps.length - 1 ? 'mr-4' : ''}`}
            >
              <div className="relative">
                <div className="flex items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-300 ${
                      idx === currentStep 
                        ? 'bg-primary text-primary-foreground ring-2 ring-offset-2 ring-primary'
                        : idx < currentStep
                        ? 'bg-primary/80 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  {idx !== steps.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          idx < currentStep ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    </div>
                  )}
                </div>
                <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap ${
                  idx === currentStep ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <h2 className="text-lg font-medium text-gray-900">
            {steps[currentStep].title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {steps[currentStep].description}
          </p>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    return (
      <div className="space-y-6">
        {renderStepIndicator()}

        <div className="transition-all duration-300">
          {(() => {
            switch (currentStep) {
              case 0:
                return (
                  <div className="space-y-4">
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
                        Redact
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

                    <Collapsible className="border rounded-lg bg-muted/50">
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="w-full flex justify-between items-center p-4 hover:bg-muted/80"
                        >
                          <span className="font-medium flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Redacted Items ({entities.length})
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-4 space-y-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                className="w-full border-dashed"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Custom Redaction
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Custom Redaction</DialogTitle>
                                <DialogDescription>
                                  Enter the text you want to redact and select its category.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Text to Redact</Label>
                                  <Input
                                    value={manualValue}
                                    onChange={(e) => setManualValue(e.target.value)}
                                    placeholder="Enter text to redact..."
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Category</Label>
                                  <Select
                                    value={manualType}
                                    onValueChange={(value) => setManualType(value as SensitiveDataType | "custom")}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.keys(categoryColors).map((type) => (
                                        <SelectItem key={type} value={type}>
                                          <span className="flex items-center gap-2">
                                            <span>{categoryColors[type as SensitiveDataType].icon}</span>
                                            <span className="capitalize">{type}</span>
                                          </span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={handleAddManualEntity}>
                                  Add Entry
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {Object.entries(
                            entities.reduce((acc, entity) => {
                              if (!acc[entity.type]) {
                                acc[entity.type] = [];
                              }
                              acc[entity.type].push(entity);
                              return acc;
                            }, {} as Record<SensitiveDataType, DetectedEntity[]>)
                          ).map(([type, items]) => (
                            <Collapsible key={type}>
                              <CollapsibleTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  className={`w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/50 rounded-lg ${categoryColors[type as SensitiveDataType].text}`}
                                >
                                  <span>{categoryColors[type as SensitiveDataType].icon}</span>
                                  <span className="capitalize font-medium">{type} ({items.length})</span>
                                  <ChevronDown className="h-4 w-4 ml-auto" />
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="mt-2 ml-6 space-y-2">
                                  {items.map((item, idx) => (
                                    <div 
                                      key={idx} 
                                      className="flex items-center gap-2 p-2 bg-white/50 rounded-lg hover:bg-white/80 transition-colors"
                                    >
                                      <div className="flex-1 grid grid-cols-[1fr,auto,1fr] items-center gap-4">
                                        <code className="p-1.5 bg-muted/50 rounded text-xs">
                                          {item.substitute.replace(/[\u200B-\u200D\uFEFF]/g, '')}
                                        </code>
                                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                        <code className="p-1.5 bg-muted/50 rounded text-xs truncate" title={item.value}>
                                          {item.value}
                                        </code>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveEntity(item.type, item.value)}
                                        className="opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <div className="flex justify-between items-center">
                      <Button 
                        variant="outline" 
                        onClick={() => setCurrentStep(0)}
                        className="transition-colors duration-200"
                      >
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
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                      <p className="text-sm text-yellow-800 flex items-center">
                        <span className="mr-2">⚠️</span>
                        After editing externally, paste your modified text below. Ensure placeholders remain intact for successful restoration.
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
                        value=""
                        onChange={(e) => {
                          const newText = e.target.value;
                          handlePaste(newText);
                        }}
                        placeholder="Paste the modified masked text here after processing externally..."
                        className="min-h-[150px] font-mono text-sm"
                      />
                    </div>
                    
                    {maskedText && renderValidationWarnings()}
                    
                    <div className="flex justify-between items-center">
                      <Button variant="outline" onClick={() => setCurrentStep(1)}>
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              onClick={() => setCurrentStep(3)}
                              variant={validationResult.isValid ? "default" : "outline"}
                              disabled={!maskedText || !validationResult.isValid}
                            >
                              <ChevronRight className="mr-2 h-4 w-4" />
                              Continue to Restore
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {!maskedText 
                              ? "Please paste the modified text to proceed"
                              : !validationResult.isValid
                              ? "All placeholders must be intact to proceed"
                              : "Click to proceed to restoration"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                );

              case 3:
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
                        value=""
                        onChange={(e) => {
                          const newText = e.target.value;
                          setMaskedText(newText);
                          setValidationResult(validatePlaceholdersDetailed(newText, entities));
                        }}
                        placeholder="Paste the modified masked text here after processing externally..."
                        className="min-h-[150px] font-mono text-sm"
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

              case 4:
                return (
                  <div className="space-y-6 animate-fade-in">
                    <div className="p-6 rounded-lg bg-white shadow-sm border space-y-4">
                      <div className="flex items-center justify-center mb-4">
                        <Shield className="h-12 w-12 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-center">
                        Text Successfully Restored!
                      </h3>
                      <p className="text-center text-muted-foreground">
                        Your text has been fully restored. You can now copy or download it.
                      </p>
                      <div className="flex justify-center gap-4 mt-4">
                        <Button variant="outline" onClick={handleReset}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Start Over
                        </Button>
                        <Button onClick={() => {/* Add download handler */}}>
                          <Download className="mr-2 h-4 w-4" />
                          Download Text
                        </Button>
                      </div>
                    </div>
                  </div>
                );

              default:
                return null;
            }
          })()}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card className="p-6 backdrop-blur-sm bg-white/90 shadow-lg">
        {renderStepContent()}
      </Card>
    </div>
  );
}

export default StepProcessor;
