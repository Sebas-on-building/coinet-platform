import React, { ReactNode, useMemo } from "react";
import { RoomProvider } from "@liveblocks/react";

// Divine: Modular user info, theme, and extensibility
interface CollaborationProviderProps {
  roomId: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
    color?: string;
  };
  children: ReactNode;
}

export const CollaborationProvider = ({ roomId, user, children }: CollaborationProviderProps) => {
  // Memoize initial presence for performance
  const initialPresence = useMemo(
    () => ({
      name: user.name,
      avatarUrl: user.avatarUrl,
      color: user.color,
      userId: user.id,
    }),
    [user]
  );

  return (
    <RoomProvider id={roomId} initialPresence={initialPresence}>
      {children}
    </RoomProvider>
  );
}; 