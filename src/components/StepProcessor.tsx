<lov-code>
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
import { Eye, EyeOff, Copy, RotateCcw, ChevronLeft, ChevronRight, Plus, X, ChevronDown, Shield, Download, Check, Edit2 } from "lucide-react";
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
import { getMappings, clearSessionMappings } from '@/lib/text-processor';

type Step = {
  title: string;
  description: string;
  validationMessage: {
    success: string;
    warning: string;
    error: string;
  };
};

const steps: Step[] = [
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
    custom: false
  });
  const { toast } = useToast();

  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    missingPlaceholders: [],
    alteredPlaceholders: [],
    invalidFormatPlaceholders: [],
    recoverable: true,
    suggestedFixes: [],
    duplicateSubstitutes: [],
    inconsistentMappings: []
  });

  const [allItemsReviewed, setAllItemsReviewed] = useState(false);
  const [textCopied, setTextCopied] = useState(false);

  const [editStates, setEditStates] = React.useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = React.useState<Record<string, string>>({});

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return inputText.trim().length > 0;
      case 1:
        return allItemsReviewed && entities.length > 0;
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
        description: "No sensitive data (names, emails, phone numbers) was detected in the text.",
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
      description: `${detected.length} items were automatically detected and masked. You can now review and add custom redactions if needed.`,
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
        description: steps[2].validationMessage.error,
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(maskedText);
      setTextCopied(true);
      toast({
        title: "✅ Text copied successfully!",
        description: steps[2].validationMessage.success,
      });
      handleNext();
    } catch (err) {
      toast({
        title: "❗ Failed to copy",
        description: steps[2].validationMessage.error,
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
    clearSessionMappings();
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
    setDialogOpen(false);
    
    toast({
      title: "Custom redaction added",
      description: `Added "${manualValue}" to redacted items.`,
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

  const renderStepIndicator = () => (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, idx) => (
          <div 
            key={idx} 
            className={`flex-1 ${idx !== steps.length - 1 ? 'mr-4' : ''}`}
          >
            <div className="relative">
              <div className="flex items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
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
      <div className="mt-12 text-center space-y-2">
        <h2 className="text-lg font-medium text-gray-900">
          {steps[currentStep].title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {steps[currentStep].description}
        </p>
        {currentStep > 0 && (
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
            getStepStatus(currentStep) === 'success'
              ? 'bg-green-50 text-green-700'
              : getStepStatus(currentStep) === 'warning'
              ? 'bg-yellow-50 text-yellow-700'
              : 'bg-red-50 text-red-700'
          }`}>
            <span className="mr-2">
              {getStepStatus(currentStep) === 'success' ? '✅' : 
               getStepStatus(currentStep) === 'warning' ? '⚠️' : '❌'}
            </span>
            {steps[currentStep].validationMessage[getStepStatus(currentStep) || 'warning']}
          </div>
        )}
      </div>
    </div>
  );

  const handleEdit = (original: string) => {
    setEditStates(prev => ({ ...prev, [original]: true }));
    setEditValues(prev => ({ ...prev, [original]: entities.find(m => m.value === original)?.substitute || '' }));
  };

  const handleSave = (original: string) => {
    const newValue = editValues[original];
    if (newValue && newValue !== entities.find(m => m.value === original)?.substitute) {
      // updateMapping(original, newValue);
      // onUpdate();
      toast({
        title: "Substitution updated",
        description: `Updated replacement for "${original}"`,
      });
    }
    setEditStates(prev => ({ ...prev, [original]: false }));
  };

  const handleNext = () => {
    if (isStepValid(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else {
      toast({
        title: "Action Required",
        description: steps[currentStep].validationMessage.warning,
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
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
                                          <div className="flex items-center gap-2">
                                            <span>{categoryColors[type as SensitiveDataType].icon}</span>
                                            <span className="capitalize">{type}</span>
                                          </div>
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
                                        <div className="flex flex-col space-y-1">
                                          <span className="text-xs text-muted-foreground">Original</span>
                                          <code className="p-1.5 bg-muted/50 rounded text-xs truncate" title={item.value}>
                                            {item.value}
                                          </code>
                                        </div>
                                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                        <div className="flex flex-col space-y-1">
                                          <span className="text-xs text-muted-foreground">Placeholder</span>
                                          {editStates[item.value] ? (
                                            <Input
                                              value={editValues[item.value] || item.substitute}
                                              onChange={(e) => setEditValues(prev => ({ ...prev, [item.value]: e.target.value }))}
                                              className="text-xs"
                                            />
                                          ) : (
                                            <code className="p-1.5 bg-muted/50 rounded text-xs">
                                              {item.substitute}
                                            </code>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {editStates[item.value] ? (
                                          <>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => setEditStates(prev => ({ ...prev, [item.value]: false }))}
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="default"
                                              size="sm"
                                              onClick={() => handleSave(item.value)}
                                            >
                                              <Check className="h-4 w-4" />
                                            </Button>
                                          </>
                                        ) : (
                                          <>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleEdit(item.value)}
                                            >
                                              <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleRemoveEntity(item.type, item.value)}
                                              className="hover:bg-destructive/10 hover:text-destructive"
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
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
                      <Button variant="outline" onClick={() => setCurrentStep(0)}>
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
