import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/haptics';
import {
  Users,
  Share2,
  MessageSquare,
  GitFork,
  Star,
  Copy,
  Check,
  Send,
  Eye,
  Lock,
  Globe,
  UserPlus,
  Shield,
  Crown,
  Edit2,
  Trash2,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { CustomAgent } from '@/types/agents';
import { toast } from 'sonner';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: number;
  likes: number;
  replies: Comment[];
}

interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: number;
}

interface CollaborativeAgentFeaturesProps {
  agent: CustomAgent;
  onUpdate: (updates: Partial<CustomAgent>) => void;
  className?: string;
}

export function CollaborativeAgentFeatures({
  agent,
  onUpdate,
  className,
}: CollaborativeAgentFeaturesProps) {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isForkDialogOpen, setIsForkDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'editor' | 'viewer'>('viewer');
  const [newComment, setNewComment] = useState('');
  const [copied, setCopied] = useState(false);

  // Mock data
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'owner',
      joinedAt: Date.now() - 86400000 * 30,
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'editor',
      joinedAt: Date.now() - 86400000 * 7,
    },
  ]);

  const [comments, setComments] = useState<Comment[]>([
    {
      id: '1',
      userId: '1',
      userName: 'John Doe',
      content: 'Great agent! The performance metrics look solid.',
      timestamp: Date.now() - 3600000 * 2,
      likes: 5,
      replies: [],
    },
    {
      id: '2',
      userId: '2',
      userName: 'Jane Smith',
      content: 'Would it be possible to adjust the risk management settings?',
      timestamp: Date.now() - 3600000,
      likes: 2,
      replies: [
        {
          id: '2-1',
          userId: '1',
          userName: 'John Doe',
          content: 'Good idea! Let me update that.',
          timestamp: Date.now() - 1800000,
          likes: 1,
          replies: [],
        },
      ],
    },
  ]);

  const handleShare = () => {
    if (!shareEmail) {
      toast.error('Please enter an email address');
      return;
    }

    const newCollaborator: Collaborator = {
      id: Math.random().toString(),
      name: shareEmail.split('@')[0],
      email: shareEmail,
      role: shareRole,
      joinedAt: Date.now(),
    };

    setCollaborators([...collaborators, newCollaborator]);
    setShareEmail('');
    toast.success('Invitation sent!');
    triggerHaptic('success');
  };

  const handleFork = () => {
    toast.success('Agent forked successfully!');
    setIsForkDialogOpen(false);
    triggerHaptic('success');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://coinet.ai/agents/${agent.id}`);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    triggerHaptic('light');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTogglePublic = () => {
    onUpdate({ isPublic: !agent.isPublic });
    toast.success(agent.isPublic ? 'Agent made private' : 'Agent made public');
    triggerHaptic('light');
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Math.random().toString(),
      userId: '1',
      userName: 'Current User',
      content: newComment,
      timestamp: Date.now(),
      likes: 0,
      replies: [],
    };

    setComments([...comments, comment]);
    setNewComment('');
    toast.success('Comment added!');
    triggerHaptic('light');
  };

  const handleRemoveCollaborator = (id: string) => {
    setCollaborators(collaborators.filter((c) => c.id !== id));
    toast.success('Collaborator removed');
    triggerHaptic('light');
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Collaboration
          </h2>
          <p className="text-muted-foreground">
            Share, fork, and collaborate on {agent.name}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTogglePublic}>
            {agent.isPublic ? <Globe className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
            {agent.isPublic ? 'Public' : 'Private'}
          </Button>
          <Button variant="outline" onClick={() => setIsForkDialogOpen(true)}>
            <GitFork className="w-4 h-4 mr-2" />
            Fork
          </Button>
          <Button onClick={() => setIsShareDialogOpen(true)}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collaborators Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Collaborators</span>
                <Badge variant="secondary">{collaborators.length}</Badge>
              </CardTitle>
              <CardDescription>People with access to this agent</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {collaborators.map((collaborator) => (
                    <div
                      key={collaborator.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={collaborator.avatar} />
                          <AvatarFallback>
                            {collaborator.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {collaborator.name}
                            {collaborator.role === 'owner' && (
                              <Crown className="w-3 h-3 text-yellow-500" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {collaborator.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={collaborator.role === 'owner' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {collaborator.role}
                        </Badge>
                        {collaborator.role !== 'owner' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleRemoveCollaborator(collaborator.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setIsShareDialogOpen(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Collaborator
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Comments & Activity Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Share Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <Eye className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">1.2K</div>
                <div className="text-xs text-muted-foreground">Views</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <GitFork className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">47</div>
                <div className="text-xs text-muted-foreground">Forks</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <Star className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold">234</div>
                <div className="text-xs text-muted-foreground">Stars</div>
              </CardContent>
            </Card>
          </div>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Comments
              </CardTitle>
              <CardDescription>Discussion and feedback</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarImage src={comment.userAvatar} />
                          <AvatarFallback>
                            {comment.userName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{comment.userName}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {comment.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              <ThumbsUp className="w-3 h-3 mr-1" />
                              {comment.likes}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              Reply
                            </Button>
                          </div>

                          {/* Replies */}
                          {comment.replies.length > 0 && (
                            <div className="ml-6 mt-3 space-y-3 border-l-2 border-border pl-4">
                              {comment.replies.map((reply) => (
                                <div key={reply.id}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="w-6 h-6">
                                      <AvatarFallback className="text-xs">
                                        {reply.userName.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium text-sm">
                                      {reply.userName}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(reply.timestamp).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1 ml-8">
                                    {reply.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Add Comment */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Agent</DialogTitle>
            <DialogDescription>
              Invite others to collaborate on this agent
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Copy Link */}
            <div>
              <label className="text-sm font-medium">Share Link</label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={`https://coinet.ai/agents/${agent.id}`}
                  readOnly
                  className="flex-1"
                />
                <Button onClick={handleCopyLink}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Invite by Email */}
            <div>
              <label className="text-sm font-medium">Invite by Email</label>
              <div className="space-y-2 mt-2">
                <Input
                  placeholder="email@example.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant={shareRole === 'viewer' ? 'default' : 'outline'}
                    onClick={() => setShareRole('viewer')}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Viewer
                  </Button>
                  <Button
                    variant={shareRole === 'editor' ? 'default' : 'outline'}
                    onClick={() => setShareRole('editor')}
                    className="flex-1"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editor
                  </Button>
                </div>
                <Button className="w-full" onClick={handleShare}>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invitation
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fork Dialog */}
      <Dialog open={isForkDialogOpen} onOpenChange={setIsForkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fork Agent</DialogTitle>
            <DialogDescription>
              Create your own copy of this agent to customize
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Agent Name</label>
              <Input
                placeholder={`${agent.name} (Fork)`}
                className="mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Describe your modifications..."
                className="mt-2"
              />
            </div>

            <Button className="w-full" onClick={handleFork}>
              <GitFork className="w-4 h-4 mr-2" />
              Create Fork
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
