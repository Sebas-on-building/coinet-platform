import React, { useState, useEffect } from "react";
import { Mic, MicOff, Volume2, VolumeX, Play, Pause, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert } from "@/types/alerts";
import { toast } from "@/hooks/use-toast";

interface VoiceAlertInterfaceProps {
  onClose: () => void;
  alerts: Alert[];
  onUpdate: (id: string, updates: Partial<Alert>) => void;
}

export function VoiceAlertInterface({ onClose, alerts, onUpdate }: VoiceAlertInterfaceProps) {
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [volume, setVolume] = useState([0.8]);
  const [lastCommand, setLastCommand] = useState<any>(null);
  const [recognitionSupported, setRecognitionSupported] = useState(false);

  useEffect(() => {
    // Check if speech recognition is supported
    const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setRecognitionSupported(supported);

    if (!supported) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in your browser.",
        variant: "destructive",
      });
    }
  }, []);

  const startListening = () => {
    if (!recognitionSupported) return;

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      speakResponse("Listening for your command...");
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setCurrentTranscript(transcript);

      // Process final results
      if (event.results[event.results.length - 1].isFinal) {
        processVoiceCommand(transcript);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      speakResponse("Sorry, I couldn't understand that. Please try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const stopListening = () => {
    setIsListening(false);
    setCurrentTranscript("");
  };

  const processVoiceCommand = async (transcript: string) => {
    const lowerTranscript = transcript.toLowerCase();
    
    try {
      // Parse the command
      const command = parseVoiceCommand(lowerTranscript);
      setLastCommand(command);

      switch (command.intent) {
        case "list_alerts":
          await handleListAlerts();
          break;
        case "pause_alert":
          await handlePauseAlert(command.parameters.alertName);
          break;
        case "resume_alert":
          await handleResumeAlert(command.parameters.alertName);
          break;
        case "get_status":
          await handleGetStatus();
          break;
        case "create_alert":
          await handleCreateAlert(command.parameters);
          break;
        default:
          speakResponse("I didn't understand that command. Try saying 'list my alerts' or 'pause Bitcoin alert'.");
      }
    } catch (error) {
      speakResponse("Sorry, I had trouble processing that command.");
    }
  };

  const parseVoiceCommand = (transcript: string) => {
    const command = {
      transcript,
      intent: "",
      parameters: {} as any,
      confidence: 0.8,
    };

    if (transcript.includes("list") && (transcript.includes("alert") || transcript.includes("my"))) {
      command.intent = "list_alerts";
    } else if (transcript.includes("pause") && transcript.includes("alert")) {
      command.intent = "pause_alert";
      command.parameters.alertName = extractAlertName(transcript);
    } else if ((transcript.includes("resume") || transcript.includes("start")) && transcript.includes("alert")) {
      command.intent = "resume_alert";
      command.parameters.alertName = extractAlertName(transcript);
    } else if (transcript.includes("status") || transcript.includes("how many")) {
      command.intent = "get_status";
    } else if (transcript.includes("create") || transcript.includes("make") || transcript.includes("new")) {
      command.intent = "create_alert";
      command.parameters = extractCreateAlertParams(transcript);
    }

    return command;
  };

  const extractAlertName = (transcript: string) => {
    // Simple pattern matching for common alert names
    const patterns = [
      /bitcoin|btc/i,
      /ethereum|eth/i,
      /solana|sol/i,
      /cardano|ada/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(transcript)) {
        return pattern.source.split('|')[0];
      }
    }

    return "unknown";
  };

  const extractCreateAlertParams = (transcript: string) => {
    const params: any = {};
    
    // Extract asset
    if (transcript.includes("bitcoin") || transcript.includes("btc")) {
      params.asset = "BTC";
    } else if (transcript.includes("ethereum") || transcript.includes("eth")) {
      params.asset = "ETH";
    }
    
    // Extract price
    const priceMatch = transcript.match(/\$?(\d+(?:,\d{3})*(?:\.\d+)?)/);
    if (priceMatch) {
      params.price = parseFloat(priceMatch[1].replace(/,/g, ''));
    }
    
    // Extract condition
    if (transcript.includes("above") || transcript.includes("over")) {
      params.condition = "above";
    } else if (transcript.includes("below") || transcript.includes("under")) {
      params.condition = "below";
    }
    
    return params;
  };

  const handleListAlerts = async () => {
    const activeAlerts = alerts.filter(alert => alert.status === "active");
    
    if (activeAlerts.length === 0) {
      speakResponse("You have no active alerts.");
      return;
    }

    const alertList = activeAlerts.slice(0, 5).map(alert => alert.name).join(", ");
    speakResponse(`You have ${activeAlerts.length} active alerts: ${alertList}`);
  };

  const handlePauseAlert = async (alertName: string) => {
    const alert = findAlertByName(alertName);
    
    if (!alert) {
      speakResponse(`I couldn't find an alert matching "${alertName}".`);
      return;
    }

    if (alert.status === "paused") {
      speakResponse(`${alert.name} is already paused.`);
      return;
    }

    await onUpdate(alert.id, { status: "paused" });
    speakResponse(`${alert.name} has been paused.`);
  };

  const handleResumeAlert = async (alertName: string) => {
    const alert = findAlertByName(alertName);
    
    if (!alert) {
      speakResponse(`I couldn't find an alert matching "${alertName}".`);
      return;
    }

    if (alert.status === "active") {
      speakResponse(`${alert.name} is already active.`);
      return;
    }

    await onUpdate(alert.id, { status: "active" });
    speakResponse(`${alert.name} has been resumed.`);
  };

  const handleGetStatus = async () => {
    const activeCount = alerts.filter(alert => alert.status === "active").length;
    const pausedCount = alerts.filter(alert => alert.status === "paused").length;
    const totalCount = alerts.length;

    speakResponse(`You have ${totalCount} total alerts: ${activeCount} active and ${pausedCount} paused.`);
  };

  const handleCreateAlert = async (params: any) => {
    if (!params.asset || !params.price || !params.condition) {
      speakResponse("I need more information to create the alert. Please specify the asset, price, and condition.");
      return;
    }

    speakResponse(`I would create a ${params.asset} alert for when the price goes ${params.condition} $${params.price}. Please use the main interface to complete the alert creation.`);
  };

  const findAlertByName = (name: string) => {
    return alerts.find(alert => 
      alert.name.toLowerCase().includes(name.toLowerCase()) ||
      alert.tags.some(tag => tag.toLowerCase().includes(name.toLowerCase()))
    );
  };

  const speakResponse = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume[0];
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    speechSynthesis.speak(utterance);
  };

  const voiceCommands = [
    { command: "List my alerts", description: "Shows all your active alerts" },
    { command: "Pause Bitcoin alert", description: "Pauses alerts containing 'Bitcoin'" },
    { command: "Resume Ethereum alert", description: "Resumes alerts containing 'Ethereum'" },
    { command: "What's my status", description: "Shows alert statistics" },
    { command: "Create Bitcoin alert above $100,000", description: "Starts alert creation process" },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Voice Alert Control
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!recognitionSupported ? (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardContent className="p-4">
                <p className="text-red-700">
                  Voice commands are not supported in your browser. Please use a modern browser like Chrome or Edge.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Voice Control */}
              <Card>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <Button
                        size="lg"
                        onClick={isListening ? stopListening : startListening}
                        className={`
                          w-24 h-24 rounded-full
                          ${isListening 
                            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                            : 'bg-primary hover:bg-primary/90'
                          }
                        `}
                      >
                        {isListening ? (
                          <MicOff className="h-8 w-8" />
                        ) : (
                          <Mic className="h-8 w-8" />
                        )}
                      </Button>
                    </div>
                    
                    <div>
                      <p className="text-lg font-medium">
                        {isListening ? "Listening..." : "Press to speak"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isListening 
                          ? "Say your command now" 
                          : "Click the microphone and speak your command"
                        }
                      </p>
                    </div>

                    {currentTranscript && (
                      <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-3">
                          <p className="text-sm">
                            <strong>Heard:</strong> "{currentTranscript}"
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {lastCommand && (
                      <Card className="bg-green-500/5 border-green-500/20">
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <p className="text-sm">
                              <strong>Command:</strong> {lastCommand.intent.replace('_', ' ')}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-green-700">
                                Confidence: {Math.round(lastCommand.confidence * 100)}%
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Voice Settings */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="voice-enabled">Voice Responses</Label>
                    <Switch
                      id="voice-enabled"
                      checked={voiceEnabled}
                      onCheckedChange={setVoiceEnabled}
                    />
                  </div>

                  {voiceEnabled && (
                    <div className="space-y-2">
                      <Label>Volume</Label>
                      <div className="flex items-center gap-2">
                        <VolumeX className="h-4 w-4" />
                        <Slider
                          value={volume}
                          onValueChange={setVolume}
                          max={1}
                          min={0}
                          step={0.1}
                          className="flex-1"
                        />
                        <Volume2 className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Voice Commands Help */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Available Commands</h3>
                  <div className="space-y-2">
                    {voiceCommands.map((cmd, index) => (
                      <div key={index} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                        <Badge variant="outline" className="mt-0.5 text-xs">
                          Say
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">"{cmd.command}"</p>
                          <p className="text-xs text-muted-foreground">{cmd.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Extend Window interface for speech recognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}