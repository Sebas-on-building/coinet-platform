import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft,
  ArrowRight,
  Brain,
  Bot,
  Palette,
  CheckCircle,
  X,
  Sparkles
} from "lucide-react";
import { CustomAgent } from "@/types/agents";
import { useCustomAgents } from "@/hooks/useCustomAgents";
import { useToast } from "@/hooks/use-toast";

interface AgentBuilderProps {
  onClose: () => void;
  editAgent?: CustomAgent | null;
}

const colorOptions = [
  "#192CFC", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4",
  "#84CC16", "#F97316", "#EC4899", "#6366F1", "#14B8A6", "#F472B6"
];

const examplePrompts = [
  "Create an agent that buys Bitcoin when the price drops 5% and RSI is below 30",
  "Monitor Ethereum whale transactions and alert me when transfers above $10M happen",
  "Build a DCA agent that doubles purchases when Fear & Greed index is below 25",
];

export function AgentBuilder({ onClose, editAgent }: AgentBuilderProps) {
  const { createAgent, updateAgent } = useCustomAgents();
  const { toast } = useToast();
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(editAgent ? 2 : 1);
  
  // Form data
  const [nlDescription, setNlDescription] = useState(editAgent?.description || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: editAgent?.name || "",
    description: editAgent?.description || "",
    personality: editAgent?.personality || "Professional and analytical",
    expertise: editAgent?.expertise || [] as string[],
    systemPrompt: editAgent?.systemPrompt || "",
    color: editAgent?.color || colorOptions[0],
    isActive: editAgent?.isActive ?? true,
  });
  const [newExpertise, setNewExpertise] = useState("");

  const parseNaturalLanguage = async () => {
    if (!nlDescription.trim()) {
      toast({
        title: "Description Required",
        description: "Please describe what you want your agent to do.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Auto-populate form data
    setFormData(prev => ({
      ...prev,
      name: prev.name || "Smart Trading Agent",
      description: nlDescription,
      systemPrompt: `You are a specialized trading assistant. ${nlDescription}\n\nProvide clear, data-driven recommendations.`,
      expertise: ["Trading", "Market Analysis", "Risk Management"],
    }));

    setIsProcessing(false);
    setWizardStep(2);

    toast({
      title: "Agent Interpreted",
      description: "Your description has been processed.",
    });
  };

  const addExpertise = () => {
    if (newExpertise.trim() && !formData.expertise.includes(newExpertise.trim())) {
      setFormData(prev => ({
        ...prev,
        expertise: [...prev.expertise, newExpertise.trim()]
      }));
      setNewExpertise("");
    }
  };

  const removeExpertise = (expertise: string) => {
    setFormData(prev => ({
      ...prev,
      expertise: prev.expertise.filter(e => e !== expertise)
    }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and description are required.",
        variant: "destructive",
      });
      return;
    }

    if (editAgent) {
      updateAgent(editAgent.id, formData);
      toast({
        title: "Agent Updated",
        description: `${formData.name} has been updated successfully.`,
      });
    } else {
      createAgent(formData);
      toast({
        title: "Agent Created",
        description: `${formData.name} has been created successfully.`,
      });
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-xl z-50 overflow-auto">
      <div className="min-h-full p-4 sm:p-6 pb-24 sm:pb-6">
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">
                {editAgent ? "Edit Agent" : "Create Agent"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {editAgent ? "Update agent configuration" : (
                  <>
                    {wizardStep === 1 && "What should your agent do?"}
                    {wizardStep === 2 && "Configure details"}
                    {wizardStep === 3 && "Review and create"}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Progress Indicator - Only for new agents */}
          {!editAgent && (
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`h-1 w-full rounded-full transition-colors ${
                    wizardStep >= step ? 'bg-primary' : 'bg-muted'
                  }`} />
                </div>
              ))}
            </div>
          )}

          {/* Edit Mode - Single Form */}
          {editAgent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  Edit Agent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Agent Name</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-color">Color Theme</Label>
                    <Select value={formData.color} onValueChange={(color) => setFormData(prev => ({ ...prev, color }))}>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: formData.color }}
                          />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {colorOptions.map((color) => (
                          <SelectItem key={color} value={color}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: color }}
                              />
                              <span>{color}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expertise Areas</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add expertise area"
                      value={newExpertise}
                      onChange={(e) => setNewExpertise(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addExpertise()}
                    />
                    <Button type="button" onClick={addExpertise} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.expertise.map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        {skill}
                        <button
                          onClick={() => removeExpertise(skill)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4 border-t">
                  <Button onClick={handleSubmit} size="lg">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Update Agent
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Creation Wizard - Step 1: Natural Language Description */}
          {!editAgent && wizardStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  What should your agent do?
                </CardTitle>
                <CardDescription>
                  Describe your agent's purpose in plain English
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Example: Monitor Bitcoin price and create an alert when it drops 10% below the 7-day moving average with RSI below 30..."
                  value={nlDescription}
                  onChange={(e) => setNlDescription(e.target.value)}
                  rows={6}
                  className="text-base resize-none"
                />
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {nlDescription.length} characters
                  </span>
                  <Button 
                    onClick={parseNaturalLanguage}
                    disabled={isProcessing || !nlDescription.trim()}
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Brain className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Example Prompts */}
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Quick Start Examples</p>
                  <div className="grid gap-2">
                    {examplePrompts.map((prompt, index) => (
                      <button
                        key={index}
                        className="text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors text-sm"
                        onClick={() => setNlDescription(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Creation Wizard - Step 2: Basic Configuration */}
          {!editAgent && wizardStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  Agent Configuration
                </CardTitle>
                <CardDescription>
                  Customize your agent's identity and capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name and Color */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Agent Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Portfolio Optimizer"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color Theme</Label>
                    <Select value={formData.color} onValueChange={(color) => setFormData(prev => ({ ...prev, color }))}>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: formData.color }}
                          />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {colorOptions.map((color) => (
                          <SelectItem key={color} value={color}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: color }}
                              />
                              <span>{color}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What does this agent do?"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                {/* Expertise */}
                <div className="space-y-2">
                  <Label>Expertise Areas</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add expertise area"
                      value={newExpertise}
                      onChange={(e) => setNewExpertise(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addExpertise()}
                    />
                    <Button type="button" onClick={addExpertise} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.expertise.map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        {skill}
                        <button
                          onClick={() => removeExpertise(skill)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setWizardStep(1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={() => setWizardStep(3)} size="lg">
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Creation Wizard - Step 3: Review and Create */}
          {!editAgent && wizardStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Review Agent
                </CardTitle>
                <CardDescription>
                  Confirm your agent configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Agent Preview */}
                <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl"
                    style={{ backgroundColor: formData.color }}
                  >
                    {formData.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{formData.name}</h3>
                    <p className="text-sm text-muted-foreground">{formData.description}</p>
                  </div>
                </div>

                {/* Expertise Summary */}
                {formData.expertise.length > 0 && (
                  <div>
                    <Label className="mb-2 block">Expertise</Label>
                    <div className="flex flex-wrap gap-2">
                      {formData.expertise.map((skill, idx) => (
                        <Badge key={idx} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Personality */}
                <div>
                  <Label className="mb-2 block">Personality</Label>
                  <p className="text-sm text-muted-foreground">{formData.personality}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setWizardStep(2)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleSubmit} size="lg">
                    <Sparkles className="w-4 h-4 mr-2" />
                    {editAgent ? "Update" : "Create"} Agent
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
