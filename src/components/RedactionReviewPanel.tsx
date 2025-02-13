
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, AlertTriangle, Edit2, X } from "lucide-react";
import { SubstitutionMapping, updateMapping, approveMapping } from '@/lib/text-processor';
import { toast } from "@/components/ui/use-toast";

interface RedactionReviewPanelProps {
  mappings: SubstitutionMapping[];
  onUpdate: () => void;
}

export function RedactionReviewPanel({ mappings, onUpdate }: RedactionReviewPanelProps) {
  const [editStates, setEditStates] = React.useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = React.useState<Record<string, string>>({});

  const handleEdit = (original: string) => {
    setEditStates(prev => ({ ...prev, [original]: true }));
    setEditValues(prev => ({ ...prev, [original]: mappings.find(m => m.original === original)?.substitute || '' }));
  };

  const handleSave = (original: string) => {
    const newValue = editValues[original];
    if (newValue && newValue !== mappings.find(m => m.original === original)?.substitute) {
      updateMapping(original, newValue);
      onUpdate();
      toast({
        title: "Substitution updated",
        description: `Updated replacement for "${original}"`,
      });
    }
    setEditStates(prev => ({ ...prev, [original]: false }));
  };

  const handleApprove = (original: string) => {
    approveMapping(original);
    onUpdate();
    toast({
      title: "Substitution approved",
      description: `Approved replacement for "${original}"`,
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Review Redactions</CardTitle>
        <CardDescription>
          Review and approve the suggested replacements for sensitive information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mappings.map((mapping, index) => (
          <div
            key={index}
            className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
          >
            <div className="flex-1 grid grid-cols-[1fr,auto,1fr] items-center gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Original</Label>
                <code className="block mt-1 p-1.5 bg-background rounded text-sm">
                  {mapping.original}
                </code>
              </div>
              <span className="text-muted-foreground">→</span>
              <div>
                <Label className="text-xs text-muted-foreground">Replacement</Label>
                {editStates[mapping.original] ? (
                  <Input
                    value={editValues[mapping.original]}
                    onChange={(e) => setEditValues(prev => ({ ...prev, [mapping.original]: e.target.value }))}
                    className="mt-1"
                  />
                ) : (
                  <code className="block mt-1 p-1.5 bg-background rounded text-sm">
                    {mapping.substitute}
                  </code>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {editStates[mapping.original] ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditStates(prev => ({ ...prev, [mapping.original]: false }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleSave(mapping.original)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(mapping.original)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {!mapping.approved && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApprove(mapping.original)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
