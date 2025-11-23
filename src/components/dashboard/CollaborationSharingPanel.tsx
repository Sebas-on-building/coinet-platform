import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiUsers, FiLink, FiCheck, FiUserPlus, FiCircle } from "react-icons/fi";

const mockUsers = [
  { name: "Alice", color: "#00ffa3", avatar: "A" },
  { name: "Bob", color: "#0057ff", avatar: "B" },
  { name: "Eve", color: "#ffb300", avatar: "E" },
];

export function CollaborationSharingPanel() {
  const [invite, setInvite] = useState("");
  const [copied, setCopied] = useState(false);
  const [users, setUsers] = useState(mockUsers);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (invite.trim()) {
      setUsers([
        ...users,
        {
          name: invite,
          color: "#7c3aed",
          avatar: invite.charAt(0).toUpperCase(),
        },
      ]);
      setInvite("");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText("https://coinnet.app/dashboard/your-id");
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <FiUsers /> Collaboration & Sharing
      </h3>
      {/* Invite users */}
      <form onSubmit={handleInvite} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Invite by name (mock)"
          className="flex-1 px-3 py-2 rounded bg-[#1a1a2e] text-white"
          value={invite}
          onChange={(e) => setInvite(e.target.value)}
        />
        <button
          type="submit"
          className="bg-[#00ffa3] text-[#23234d] px-4 py-2 rounded-lg font-bold shadow hover:bg-[#0057ff] hover:text-white transition flex items-center gap-1"
        >
          <FiUserPlus /> Invite
        </button>
      </form>
      {/* Online users */}
      <div className="flex gap-3 mb-4">
        {users.map((user, idx) => (
          <motion.div
            key={user.name}
            className="relative flex flex-col items-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * idx, type: "spring" }}
          >
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg border-2"
              style={{
                background: user.color + "22",
                color: user.color,
                borderColor: user.color,
              }}
            >
              {user.avatar}
            </span>
            <span className="text-xs text-blue-300 mt-1">{user.name}</span>
            <span
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#23234d]"
              style={{ background: "#00ffa3" }}
            >
              <FiCircle className="text-[#00ffa3]" size={10} />
            </span>
          </motion.div>
        ))}
      </div>
      {/* Share dashboard link */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-blue-300 font-mono text-xs">
          https://coinnet.app/dashboard/your-id
        </span>
        <button
          onClick={handleCopy}
          className="bg-[#0057ff] text-white px-3 py-1 rounded-lg font-bold shadow flex items-center gap-1 hover:bg-[#00ffa3] hover:text-[#23234d] transition"
        >
          <FiLink /> Copy Link
        </button>
        <AnimatePresence>
          {copied && (
            <motion.span
              className="text-green-400 font-bold ml-2 flex items-center gap-1"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, type: "spring" }}
            >
              <FiCheck /> Copied!
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {/* Real-time presence (mock) */}
      <div className="text-xs text-blue-300 mt-2 flex items-center gap-2">
        <FiCircle className="text-[#00ffa3]" /> {users.length} online
      </div>
    </motion.div>
  );
}
