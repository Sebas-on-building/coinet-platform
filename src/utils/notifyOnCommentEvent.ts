import type { LsonComment } from "@/contexts/CommentsContext";
import type { LsonNotification, NotificationType } from "@/contexts/NotificationContext";

interface User {
  userId: string;
  userName: string;
  avatarUrl: string | null;
}

interface NotifyOnCommentEventArgs {
  event: NotificationType;
  comment: LsonComment;
  threadId: string;
  parentComment?: LsonComment;
  userDirectory: User[];
  addNotification: (userId: string, notification: Omit<LsonNotification, "id" | "createdAt" | "read">) => void;
}

// Utility to find userId by username
function findUserIdByName(userDirectory: User[], name: string): string | null {
  const user = userDirectory.find(u => u.userName === name);
  return user ? user.userId : null;
}

// Parse @mentions from content
function parseMentions(content: string): string[] {
  const matches = content.match(/@([a-zA-Z0-9_]+)/g);
  return matches ? matches.map(m => m.slice(1)) : [];
}

export function notifyOnCommentEvent({ event, comment, threadId, parentComment, userDirectory, addNotification }: NotifyOnCommentEventArgs) {
  const fromUserId = comment.userId;
  const fromUserName = comment.userName;
  const fromUserAvatar = comment.userAvatar;
  const content = comment.content;
  const commentId = comment.id;

  // 1. @mentions
  if (event === "mention" || event === "comment" || event === "reply") {
    const mentionedNames = parseMentions(content);
    mentionedNames.forEach(name => {
      const userId = findUserIdByName(userDirectory, name);
      if (userId && userId !== fromUserId) {
        addNotification(userId, {
          type: "mention",
          threadId,
          commentId,
          fromUserId,
          fromUserName,
          fromUserAvatar,
          content,
        });
      }
    });
  }

  // 2. Reply: notify parent author (unless self)
  if (event === "reply" && parentComment && parentComment.userId !== fromUserId) {
    addNotification(parentComment.userId, {
      type: "reply",
      threadId,
      commentId,
      fromUserId,
      fromUserName,
      fromUserAvatar,
      content,
    });
  }

  // 3. New comment: notify all except author (could be all collaborators, here just userDirectory)
  if (event === "comment") {
    userDirectory.forEach(user => {
      if (user.userId !== fromUserId) {
        addNotification(user.userId, {
          type: "comment",
          threadId,
          commentId,
          fromUserId,
          fromUserName,
          fromUserAvatar,
          content,
        });
      }
    });
  }

  // 4. Resolve: notify comment author (unless self)
  if (event === "resolve" && parentComment && parentComment.userId !== fromUserId) {
    addNotification(parentComment.userId, {
      type: "resolve",
      threadId,
      commentId,
      fromUserId,
      fromUserName,
      fromUserAvatar,
      content,
    });
  }
} 