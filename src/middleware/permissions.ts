import { getSession } from "next-auth/client";

export function requireRole(roles: string[]) {
  return async (req, res, next) => {
    const session = await getSession({ req });
    if (!session || !roles.includes(session.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
} 