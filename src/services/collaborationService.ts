import { toast } from "react-hot-toast";
import { userService } from "./userService";

export interface LiveComment {
  id: string;
  eventId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  reactions: {
    [key: string]: string[]; // emoji -> userIds
  };
  mentions: string[];
  isEdited: boolean;
}

export interface SharedAnnotation {
  id: string;
  eventId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  position: {
    x: number;
    y: number;
  };
  type: "highlight" | "note" | "drawing";
  color?: string;
  collaborators: string[];
}

class CollaborationService {
  private static instance: CollaborationService;
  private ws: WebSocket | null = null;
  private comments: Map<string, LiveComment[]> = new Map();
  private annotations: Map<string, SharedAnnotation[]> = new Map();
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  private constructor() {
    this.initializeWebSocket();
  }

  static getInstance(): CollaborationService {
    if (!CollaborationService.instance) {
      CollaborationService.instance = new CollaborationService();
    }
    return CollaborationService.instance;
  }

  private initializeWebSocket() {
    // In a real application, this would connect to your WebSocket server
    this.ws = new WebSocket("ws://localhost:8080");

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    };

    this.ws.onclose = () => {
      setTimeout(() => this.initializeWebSocket(), 5000);
    };
  }

  private handleWebSocketMessage(data: any) {
    const listeners = this.listeners.get(data.type);
    if (listeners) {
      listeners.forEach((listener) => listener(data.payload));
    }
  }

  subscribe(type: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    return () => {
      const listeners = this.listeners.get(type);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  async addLiveComment(
    eventId: string,
    userId: string,
    content: string,
  ): Promise<LiveComment> {
    const user = await userService.getUserProfile(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const comment: LiveComment = {
      id: Date.now().toString(),
      eventId,
      userId,
      username: user.username,
      content,
      timestamp: new Date(),
      reactions: {},
      mentions: this.extractMentions(content),
      isEdited: false,
    };

    if (!this.comments.has(eventId)) {
      this.comments.set(eventId, []);
    }
    this.comments.get(eventId)!.push(comment);

    // Notify other users
    this.ws?.send(
      JSON.stringify({
        type: "new_comment",
        payload: comment,
      }),
    );

    return comment;
  }

  async editLiveComment(
    eventId: string,
    commentId: string,
    content: string,
  ): Promise<LiveComment> {
    const comments = this.comments.get(eventId);
    if (!comments) {
      throw new Error("Event not found");
    }

    const comment = comments.find((c) => c.id === commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    comment.content = content;
    comment.isEdited = true;
    comment.mentions = this.extractMentions(content);

    // Notify other users
    this.ws?.send(
      JSON.stringify({
        type: "edit_comment",
        payload: comment,
      }),
    );

    return comment;
  }

  async addReaction(
    eventId: string,
    commentId: string,
    userId: string,
    emoji: string,
  ): Promise<void> {
    const comments = this.comments.get(eventId);
    if (!comments) {
      throw new Error("Event not found");
    }

    const comment = comments.find((c) => c.id === commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (!comment.reactions[emoji]) {
      comment.reactions[emoji] = [];
    }

    if (!comment.reactions[emoji].includes(userId)) {
      comment.reactions[emoji].push(userId);
    }

    // Notify other users
    this.ws?.send(
      JSON.stringify({
        type: "add_reaction",
        payload: { eventId, commentId, userId, emoji },
      }),
    );
  }

  async addSharedAnnotation(
    eventId: string,
    userId: string,
    content: string,
    position: { x: number; y: number },
    type: SharedAnnotation["type"],
    color?: string,
  ): Promise<SharedAnnotation> {
    const user = await userService.getUserProfile(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const annotation: SharedAnnotation = {
      id: Date.now().toString(),
      eventId,
      userId,
      username: user.username,
      content,
      timestamp: new Date(),
      position,
      type,
      color,
      collaborators: [userId],
    };

    if (!this.annotations.has(eventId)) {
      this.annotations.set(eventId, []);
    }
    this.annotations.get(eventId)!.push(annotation);

    // Notify other users
    this.ws?.send(
      JSON.stringify({
        type: "new_annotation",
        payload: annotation,
      }),
    );

    return annotation;
  }

  async updateSharedAnnotation(
    eventId: string,
    annotationId: string,
    updates: Partial<SharedAnnotation>,
  ): Promise<SharedAnnotation> {
    const annotations = this.annotations.get(eventId);
    if (!annotations) {
      throw new Error("Event not found");
    }

    const annotation = annotations.find((a) => a.id === annotationId);
    if (!annotation) {
      throw new Error("Annotation not found");
    }

    Object.assign(annotation, updates);

    // Notify other users
    this.ws?.send(
      JSON.stringify({
        type: "update_annotation",
        payload: annotation,
      }),
    );

    return annotation;
  }

  async addCollaborator(
    eventId: string,
    annotationId: string,
    userId: string,
  ): Promise<void> {
    const annotations = this.annotations.get(eventId);
    if (!annotations) {
      throw new Error("Event not found");
    }

    const annotation = annotations.find((a) => a.id === annotationId);
    if (!annotation) {
      throw new Error("Annotation not found");
    }

    if (!annotation.collaborators.includes(userId)) {
      annotation.collaborators.push(userId);
    }

    // Notify other users
    this.ws?.send(
      JSON.stringify({
        type: "add_collaborator",
        payload: { eventId, annotationId, userId },
      }),
    );
  }

  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }

  getLiveComments(eventId: string): LiveComment[] {
    return this.comments.get(eventId) || [];
  }

  getSharedAnnotations(eventId: string): SharedAnnotation[] {
    return this.annotations.get(eventId) || [];
  }
}

export const collaborationService = CollaborationService.getInstance();
