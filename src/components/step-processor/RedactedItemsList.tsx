
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, Plus, X, Edit2, Check } from "lucide-react";
import { DetectedEntity, SensitiveDataType } from "@/lib/text-processor";
import { categoryColors } from "@/constants/step-processor";
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
import { useToast } from "@/components/ui/use-toast";

interface RedactedItemsListProps {
  entities: DetectedEntity[];
  maskedText: string;
}

export function RedactedItemsList({ entities, maskedText }: RedactedItemsListProps) {
  const [manualValue, setManualValue] = useState("");
  const [manualType, setManualType] = useState<SensitiveDataType | "custom">("name");
  const [editStates, setEditStates] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const { toast } = useToast();

  const handleEdit = (original: string) => {
    setEditStates(prev => ({ ...prev, [original]: true }));
    setEditValues(prev => ({ ...prev, [original]: entities.find(m => m.value === original)?.substitute || '' }));
  };

  const handleSave = (original: string) => {
    const newValue = editValues[original];
    if (newValue && newValue !== entities.find(m => m.value === original)?.substitute) {
      toast({
        title: "Substitution updated",
        description: `Updated replacement for "${original}"`,
      });
    }
    setEditStates(prev => ({ ...prev, [original]: false }));
  };

  const handleCategoryClick = (category: string) => {
    setOpenCategory(openCategory === category ? null : category);
  };

  return (
    <Collapsible className="border rounded-lg bg-muted/50">
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full flex justify-between items-center p-4 hover:bg-muted/80"
        >
          <span className="font-medium">
            Redacted Items ({entities.length})
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 space-y-4">
          {/* Add Custom Redaction Dialog */}
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
                <Button onClick={() => {}}>
                  Add Entry
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Redacted Items List */}
          <div className="space-y-2">
            {Object.entries(
              entities.reduce((acc, entity) => {
                if (!acc[entity.type]) {
                  acc[entity.type] = [];
                }
                acc[entity.type].push(entity);
                return acc;
              }, {} as Record<SensitiveDataType, DetectedEntity[]>)
            ).map(([type, items]) => (
              <Collapsible key={type} open={openCategory === type}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={`w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/50 rounded-lg ${categoryColors[type as SensitiveDataType].text}`}
                    onClick={() => handleCategoryClick(type)}
                  >
                    <span>{categoryColors[type as SensitiveDataType].icon}</span>
                    <span className="capitalize font-medium">{type} ({items.length})</span>
                    <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-200 ${openCategory === type ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 ml-6 max-h-[300px] overflow-y-auto">
                    <div className="space-y-2">
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
                                <code className="p-1.5 bg-muted/50 rounded text-xs truncate">
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
                                  onClick={() => {}}
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
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
