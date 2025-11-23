import React, { useState } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Brain, Target, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertCondition, AlertAction } from "@/types/alerts";
import { toast } from "@/hooks/use-toast";

interface AlertCreationWizardProps {
  onClose: () => void;
  onCreate: (alert: Omit<Alert, "id" | "createdAt" | "updatedAt" | "triggerCount">) => Promise<Alert>;
}

export function AlertCreationWizard({ onClose, onCreate }: AlertCreationWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [alertData, setAlertData] = useState<Partial<Alert>>({
    name: "",
    description: "",
    type: "price",
    priority: "medium",
    status: "active",
    tags: [],
    trigger: {
      conditions: [],
      logicalOperator: "AND",
    },
    actions: [],
  });

  const [currentCondition, setCurrentCondition] = useState<Partial<AlertCondition>>({
    type: "price",
    field: "price",
    operator: "gt",
    value: "",
  });

  const [selectedActions, setSelectedActions] = useState<string[]>(["notification"]);

  const steps = [
    { id: 1, title: "Basic Info", icon: Target },
    { id: 2, title: "Conditions", icon: Brain },
    { id: 3, title: "Actions", icon: Bell },
    { id: 4, title: "Review", icon: Sparkles },
  ];

  const alertTypes = [
    { value: "price", label: "Price Alert", description: "Monitor price movements" },
    { value: "technical", label: "Technical Indicator", description: "RSI, MACD, moving averages" },
    { value: "sentiment", label: "Sentiment Alert", description: "Social sentiment changes" },
    { value: "volume", label: "Volume Alert", description: "Unusual volume activity" },
    { value: "ai_insight", label: "AI Insight", description: "Coinet AI discoveries" },
    { value: "multi_dimensional", label: "Multi-Condition", description: "Complex multi-factor alerts" },
  ];

  const priorityLevels = [
    { value: "low", label: "Low", color: "bg-green-500" },
    { value: "medium", label: "Medium", color: "bg-blue-500" },
    { value: "high", label: "High", color: "bg-orange-500" },
    { value: "critical", label: "Critical", color: "bg-red-500" },
  ];

  const operators = [
    { value: "gt", label: "Greater than (>)" },
    { value: "lt", label: "Less than (<)" },
    { value: "gte", label: "Greater than or equal (≥)" },
    { value: "lte", label: "Less than or equal (≤)" },
    { value: "eq", label: "Equal to (=)" },
    { value: "contains", label: "Contains" },
    { value: "crosses_above", label: "Crosses above" },
    { value: "crosses_below", label: "Crosses below" },
  ];

  const actionTypes = [
    { 
      value: "notification", 
      label: "In-App Notification", 
      description: "Show notification in the app",
      icon: Bell 
    },
    { 
      value: "email", 
      label: "Email Alert", 
      description: "Send email notification",
      icon: Bell 
    },
    { 
      value: "push", 
      label: "Push Notification", 
      description: "Mobile push notification",
      icon: Bell 
    },
  ];

  const handleNext = () => {
    if (step < steps.length) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const addCondition = () => {
    if (!currentCondition.field || !currentCondition.operator || currentCondition.value === "") {
      toast({
        title: "Invalid Condition",
        description: "Please fill in all condition fields.",
        variant: "destructive",
      });
      return;
    }

    const newCondition: AlertCondition = {
      id: crypto.randomUUID(),
      type: currentCondition.type!,
      field: currentCondition.field!,
      operator: currentCondition.operator!,
      value: currentCondition.value!,
      asset: currentCondition.asset,
      timeframe: currentCondition.timeframe,
    };

    setAlertData(prev => ({
      ...prev,
      trigger: {
        ...prev.trigger,
        conditions: [...(prev.trigger?.conditions || []), newCondition],
      },
    }));

    // Reset current condition
    setCurrentCondition({
      type: "price",
      field: "price",
      operator: "gt",
      value: "",
    });
  };

  const removeCondition = (conditionId: string) => {
    setAlertData(prev => ({
      ...prev,
      trigger: {
        ...prev.trigger,
        conditions: prev.trigger?.conditions?.filter(c => c.id !== conditionId) || [],
      },
    }));
  };

  const handleCreate = async () => {
    if (!alertData.name || !alertData.trigger?.conditions?.length) {
      toast({
        title: "Incomplete Alert",
        description: "Please provide a name and at least one condition.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const actions: AlertAction[] = selectedActions.map(actionType => ({
        id: crypto.randomUUID(),
        type: actionType as AlertAction["type"],
        config: {
          channels: actionType === "notification" ? ["in_app"] : [actionType as any],
          message: `Alert: ${alertData.name}`,
        },
        enabled: true,
      }));

      await onCreate({
        ...alertData,
        actions,
      } as Omit<Alert, "id" | "createdAt" | "updatedAt" | "triggerCount">);

      toast({
        title: "Alert Created",
        description: `"${alertData.name}" is now monitoring the market.`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create alert. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="name">Alert Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Bitcoin Price Alert"
                value={alertData.name || ""}
                onChange={(e) => setAlertData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this alert monitors..."
                value={alertData.description || ""}
                onChange={(e) => setAlertData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Alert Type *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {alertTypes.map((type) => (
                  <Card 
                    key={type.value}
                    className={`cursor-pointer transition-all ${
                      alertData.type === type.value 
                        ? "border-primary bg-primary/5" 
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setAlertData(prev => ({ ...prev, type: type.value as Alert["type"] }))}
                  >
                    <CardContent className="p-4">
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-muted-foreground">{type.description}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <Label>Priority Level</Label>
              <RadioGroup 
                value={alertData.priority || "medium"}
                onValueChange={(value) => setAlertData(prev => ({ ...prev, priority: value as Alert["priority"] }))}
                className="flex flex-wrap gap-4 mt-2"
              >
                {priorityLevels.map((priority) => (
                  <Label 
                    key={priority.value}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <RadioGroupItem value={priority.value} />
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${priority.color}`} />
                      <span>{priority.label}</span>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Add Conditions</h3>
              
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Field</Label>
                    <Select 
                      value={currentCondition.field}
                      onValueChange={(value) => setCurrentCondition(prev => ({ ...prev, field: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="volume">Volume</SelectItem>
                        <SelectItem value="market_cap">Market Cap</SelectItem>
                        <SelectItem value="rsi">RSI</SelectItem>
                        <SelectItem value="sentiment">Sentiment Score</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Operator</Label>
                    <Select 
                      value={currentCondition.operator}
                      onValueChange={(value) => setCurrentCondition(prev => ({ ...prev, operator: value as AlertCondition["operator"] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Value</Label>
                    <Input
                      type="number"
                      placeholder="Enter value..."
                      value={currentCondition.value}
                      onChange={(e) => setCurrentCondition(prev => ({ ...prev, value: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Asset (Optional)</Label>
                    <Select 
                      value={currentCondition.asset}
                      onValueChange={(value) => setCurrentCondition(prev => ({ ...prev, asset: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                        <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                        <SelectItem value="SOL">Solana (SOL)</SelectItem>
                        <SelectItem value="ADA">Cardano (ADA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={addCondition} className="w-full">
                  Add Condition
                </Button>
              </div>
            </div>

            {alertData.trigger?.conditions && alertData.trigger.conditions.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Current Conditions</h4>
                <div className="space-y-2">
                  {alertData.trigger.conditions.map((condition, index) => (
                    <div key={condition.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="text-sm">
                        {condition.asset && `${condition.asset} `}
                        {condition.field} {condition.operator} {condition.value}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(condition.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {alertData.trigger.conditions.length > 1 && (
                  <div className="mt-4">
                    <Label>Logical Operator</Label>
                    <RadioGroup 
                      value={alertData.trigger.logicalOperator}
                      onValueChange={(value) => setAlertData(prev => ({
                        ...prev,
                        trigger: {
                          ...prev.trigger!,
                          logicalOperator: value as "AND" | "OR",
                        },
                      }))}
                      className="flex gap-4 mt-2"
                    >
                      <Label className="flex items-center space-x-2">
                        <RadioGroupItem value="AND" />
                        <span>AND (all conditions must be true)</span>
                      </Label>
                      <Label className="flex items-center space-x-2">
                        <RadioGroupItem value="OR" />
                        <span>OR (any condition can be true)</span>
                      </Label>
                    </RadioGroup>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Choose Actions</h3>
              <p className="text-muted-foreground mb-4">
                Select how you want to be notified when this alert triggers.
              </p>

              <div className="space-y-3">
                {actionTypes.map((action) => (
                  <Label key={action.value} className="flex items-start space-x-3 cursor-pointer">
                    <Checkbox
                      checked={selectedActions.includes(action.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedActions(prev => [...prev, action.value]);
                        } else {
                          setSelectedActions(prev => prev.filter(a => a !== action.value));
                        }
                      }}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">{action.label}</div>
                      <div className="text-sm text-muted-foreground">{action.description}</div>
                    </div>
                  </Label>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Review & Create</h3>
              
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label className="text-base">Alert Name</Label>
                    <p className="font-medium">{alertData.name}</p>
                  </div>

                  {alertData.description && (
                    <div>
                      <Label className="text-base">Description</Label>
                      <p className="text-muted-foreground">{alertData.description}</p>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <Label className="text-base">Type & Priority</Label>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{alertData.type?.replace('_', ' ')}</Badge>
                      <Badge className={priorityLevels.find(p => p.value === alertData.priority)?.color + " text-white"}>
                        {alertData.priority}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-base">Conditions</Label>
                    <div className="space-y-2 mt-2">
                      {alertData.trigger?.conditions?.map((condition, index) => (
                        <div key={condition.id} className="text-sm p-2 bg-muted rounded">
                          {condition.asset && `${condition.asset} `}
                          {condition.field} {condition.operator} {condition.value}
                        </div>
                      ))}
                    </div>
                    {(alertData.trigger?.conditions?.length || 0) > 1 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Operator: {alertData.trigger?.logicalOperator}
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-base">Actions</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedActions.map((action) => (
                        <Badge key={action} variant="outline">
                          {actionTypes.find(a => a.value === action)?.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isMobile = useIsMobile();

  // Mobile render
  if (isMobile) {
    const currentStep = steps[step - 1];
    const StepIcon = currentStep.icon;
    
    return (
      <Sheet open onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[92vh] p-0 flex flex-col">
          {/* Header with current step */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <StepIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-lg">{currentStep.title}</SheetTitle>
                <p className="text-xs text-muted-foreground">Step {step} of {steps.length}</p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(step / steps.length) * 100}%` }}
              />
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {renderStep()}
          </div>

          {/* Navigation - Fixed at bottom */}
          <div className="px-6 py-4 border-t bg-background flex gap-3">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="flex-1"
                size="lg"
              >
                <ChevronLeft className="h-5 w-5 mr-2" />
                Back
              </Button>
            )}

            {step < steps.length ? (
              <Button
                onClick={handleNext}
                disabled={
                  (step === 1 && !alertData.name) ||
                  (step === 2 && !alertData.trigger?.conditions?.length) ||
                  (step === 3 && !selectedActions.length)
                }
                className="flex-1"
                size="lg"
              >
                Continue
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 bg-gradient-primary"
                size="lg"
              >
                {loading ? "Creating..." : "Create Alert"}
                <Sparkles className="h-5 w-5 ml-2" />
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop render
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Smart Alert
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((stepInfo, index) => {
            const StepIcon = stepInfo.icon;
            const isActive = step === stepInfo.id;
            const isCompleted = step > stepInfo.id;
            
            return (
              <React.Fragment key={stepInfo.id}>
                <div className="flex items-center gap-2">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${isActive ? 'bg-primary text-primary-foreground' : ''}
                    ${isCompleted ? 'bg-success text-success-foreground' : ''}
                    ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                  `}>
                    <StepIcon className="h-4 w-4" />
                  </div>
                  <span className={`text-sm ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                    {stepInfo.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-4 ${isCompleted ? 'bg-success' : 'bg-muted'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={step === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {step < steps.length ? (
            <Button
              onClick={handleNext}
              disabled={
                (step === 1 && !alertData.name) ||
                (step === 2 && !alertData.trigger?.conditions?.length) ||
                (step === 3 && !selectedActions.length)
              }
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={loading}
              className="bg-gradient-primary"
            >
              {loading ? "Creating..." : "Create Alert"}
              <Sparkles className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}