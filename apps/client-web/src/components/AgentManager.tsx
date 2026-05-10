import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Search, 
  Edit2, 
  Copy, 
  Trash2,
  CheckCircle,
  Zap,
  MoreVertical
} from "lucide-react";
import { CustomAgent } from "@/types/agents";
import { useCustomAgents } from "@/hooks/useCustomAgents";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { triggerHaptic } from "@/utils/haptics";

interface AgentManagerProps {
  onCreateAgent: () => void;
  onEditAgent?: (agent: CustomAgent) => void;
  onSelectAgent?: (agent: CustomAgent) => void;
}

export function AgentManager({ onCreateAgent, onEditAgent, onSelectAgent }: AgentManagerProps) {
  const { agents, activeAgent, setActiveAgent, updateAgent, deleteAgent, duplicateAgent } = useCustomAgents();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.expertise.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleActivateAgent = (agent: CustomAgent) => {
    triggerHaptic('light');
    setActiveAgent(agent);
    updateAgent(agent.id, { isActive: true });
    toast({
      title: `Switched to ${agent.name}`,
      description: "Agent is now active",
    });
    onSelectAgent?.(agent);
  };

  const handleDelete = (id: string) => {
    deleteAgent(id);
    toast({
      title: "Agent Deleted",
      description: "The agent has been removed successfully.",
    });
  };

  const handleDuplicate = (id: string) => {
    const duplicated = duplicateAgent(id);
    if (duplicated) {
      toast({
        title: "Agent Duplicated",
        description: `${duplicated.name} has been created successfully.`,
      });
    }
  };

  const getAgentInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`space-y-4 sm:space-y-6 ${isMobile ? 'p-4 pb-24' : 'p-6'}`}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Agents</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Your specialized AI assistants
          </p>
        </div>
        <Button 
          onClick={onCreateAgent} 
          size="default"
          className="w-full sm:w-auto"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Agent
        </Button>
      </div>

      {/* Active Agent Card */}
      {activeAgent && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-white font-bold text-base sm:text-xl shrink-0"
                  style={{ backgroundColor: activeAgent.color }}
                >
                  {getAgentInitials(activeAgent.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                    <CardTitle className="text-base sm:text-xl truncate">{activeAgent.name}</CardTitle>
                    <Badge variant="default" className="gap-1 text-xs w-fit">
                      <Zap className="w-3 h-3" />
                      Active
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2">{activeAgent.description}</p>
                </div>
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 self-start sm:self-auto" onClick={() => onEditAgent?.(activeAgent)}>
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Quick Switch - Wrapping Row */}
      {agents.length > 1 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Quick Switch</h3>
          <div className="flex flex-wrap gap-2 overflow-x-hidden">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleActivateAgent(agent)}
                className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all hover:border-primary/50 ${
                  activeAgent?.id === agent.id ? 'border-primary bg-primary/5' : 'border-transparent'
                }`}
              >
                <Avatar className="w-10 h-10" style={{ backgroundColor: agent.color }}>
                  <AvatarFallback className="text-white font-semibold text-sm" style={{ backgroundColor: agent.color }}>
                    {getAgentInitials(agent.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium max-w-[60px] truncate">{agent.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {filteredAgents.length} of {agents.length}
        </div>
      </div>

      {/* Agent List */}
      {filteredAgents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Plus className="w-10 h-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-xl mb-2">
                  {searchQuery ? "No agents found" : "Create your first agent"}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery 
                    ? "Try adjusting your search criteria" 
                    : "Agents help you automate tasks and enhance your workflow"}
                </p>
              </div>
              {!searchQuery && (
                <Button onClick={onCreateAgent} size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Agent
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : isMobile ? (
        /* Mobile Card View */
        <div className="space-y-3">
          {filteredAgents.map((agent) => (
            <Card 
              key={agent.id}
              className={`transition-all active:scale-[0.98] ${
                activeAgent?.id === agent.id ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => handleActivateAgent(agent)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <Avatar className="w-12 h-12 shrink-0" style={{ backgroundColor: agent.color }}>
                    <AvatarFallback className="text-white font-bold text-base" style={{ backgroundColor: agent.color }}>
                      {getAgentInitials(agent.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-tight mb-1">{agent.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
                      </div>
                      
                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {activeAgent?.id !== agent.id && (
                            <>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleActivateAgent(agent);
                              }}>
                                <Zap className="w-4 h-4 mr-2" />
                                Activate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onEditAgent?.(agent);
                          }}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(agent.id);
                          }}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(agent.id);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Expertise */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {agent.expertise.slice(0, 3).map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0">
                          {skill}
                        </Badge>
                      ))}
                      {agent.expertise.length > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{agent.expertise.length - 3}
                        </Badge>
                      )}
                    </div>

                    {/* Status */}
                    {activeAgent?.id === agent.id && (
                      <Badge variant="default" className="gap-1.5">
                        <CheckCircle className="w-3 h-3" />
                        Currently Active
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Desktop Table View */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Agent</TableHead>
                <TableHead>Expertise</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[180px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.map((agent) => (
                <TableRow 
                  key={agent.id}
                  className={`cursor-pointer ${activeAgent?.id === agent.id ? 'bg-primary/5' : ''}`}
                  onClick={() => handleActivateAgent(agent)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10" style={{ backgroundColor: agent.color }}>
                        <AvatarFallback className="text-white font-semibold" style={{ backgroundColor: agent.color }}>
                          {getAgentInitials(agent.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">{agent.description}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {agent.expertise.slice(0, 2).map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {agent.expertise.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{agent.expertise.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {activeAgent?.id === agent.id ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeAgent?.id !== agent.id) {
                            handleActivateAgent(agent);
                          }
                        }}
                        disabled={activeAgent?.id === agent.id}
                      >
                        <Zap className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAgent?.(agent);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(agent.id);
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(agent.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
