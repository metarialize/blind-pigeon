
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  detectSensitiveData,
  maskText,
  restoreText,
  validatePlaceholders,
  type DetectedEntity,
} from "@/lib/text-processor";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, Copy, RotateCcw } from "lucide-react";

export function TextProcessor() {
  const [inputText, setInputText] = useState("");
  const [maskedText, setMaskedText] = useState("");
  const [entities, setEntities] = useState<DetectedEntity[]>([]);
  const [isMasked, setIsMasked] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (inputText && !isMasked) {
      const detected = detectSensitiveData(inputText);
      setEntities(detected);
    }
  }, [inputText, isMasked]);

  const handleMask = () => {
    if (!inputText) {
      toast({
        title: "No text to process",
        description: "Please enter some text to mask sensitive data.",
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
    toast({
      title: "Reset successful",
      description: "All text and stored data has been cleared.",
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6 animate-fade-in">
      <Card className="p-6 backdrop-blur-sm bg-white/90 shadow-lg">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              {isMasked ? "Masked Text" : "Original Text"}
            </h2>
            <div className="space-x-2">
              {isMasked && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="transition-all hover:scale-105"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={handleReset}
                className="transition-all hover:scale-105"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Textarea
            value={isMasked ? maskedText : inputText}
            onChange={(e) => isMasked ? setMaskedText(e.target.value) : setInputText(e.target.value)}
            placeholder={isMasked ? "Paste processed text here..." : "Enter text to process..."}
            className="min-h-[200px] font-mono text-sm transition-all duration-200"
          />
          
          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-muted-foreground">
              {entities.length > 0 && !isMasked
                ? `${entities.length} sensitive items detected`
                : "No sensitive data detected"}
            </div>
            <Button
              onClick={isMasked ? handleRestore : handleMask}
              className="transition-all hover:scale-105"
            >
              {isMasked ? (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Restore Original
                </>
              ) : (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Mask Sensitive Data
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
