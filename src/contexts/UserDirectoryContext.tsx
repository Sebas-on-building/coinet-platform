import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { useOthers, useSelf } from "@liveblocks/react";

export interface UserDirectoryUser {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  color: string | null;
  isSelf: boolean;
  presence?: any;
}

const UserDirectoryContext = createContext<UserDirectoryUser[]>([]);

export const UserDirectoryProvider = ({ children }: { children: ReactNode }) => {
  const others = useOthers();
  const me = useSelf();

  const users = useMemo(() => {
    const otherUsers = others.map(({ connectionId, presence }) => ({
      userId: String(presence?.userId || connectionId),
      userName: String(presence?.name || `User ${connectionId}`),
      avatarUrl: presence?.avatarUrl ? String(presence.avatarUrl) : null,
      color: presence?.color ? String(presence.color) : null,
      isSelf: false,
      presence,
    }));
    const selfUser = me?.presence
      ? [{
        userId: String(me.presence.userId || "me"),
        userName: String(me.presence.name || "Me"),
        avatarUrl: me.presence.avatarUrl ? String(me.presence.avatarUrl) : null,
        color: me.presence.color ? String(me.presence.color) : null,
        isSelf: true,
        presence: me.presence,
      }]
      : [];
    return [...selfUser, ...otherUsers];
  }, [others, me]);

  return (
    <UserDirectoryContext.Provider value={users}>{children}</UserDirectoryContext.Provider>
  );
};

export const useUserDirectory = () => useContext(UserDirectoryContext); 