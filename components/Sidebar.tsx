"use client";

import { useState } from "react";
import { Plus, LogOut, MessageSquare, X, Trash2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type Conversation = { id: string; title: string; created_at: string };

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  userEmail,
  open,
  onClose,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  userEmail: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleDeleteClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (confirmingId === id) {
      onDelete(id);
      setConfirmingId(null);
    } else {
      setConfirmingId(id);
    }
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 sm:hidden" onClick={onClose} />}

      <aside
        className={`fixed sm:static z-40 top-0 left-0 h-full w-64 bg-panel border-r border-border flex flex-col transition-transform duration-200 sm:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <button
            onClick={onNewChat}
            className="flex-1 flex items-center gap-2 text-sm bg-panel2 hover:bg-glow/10 border border-border hover:border-glow/40 rounded-lg px-3 py-2 transition-colors"
          >
            <Plus size={15} />
            New chat
          </button>
          <button onClick={onClose} className="sm:hidden text-text-muted" aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2">
          {conversations.length === 0 && (
            <p className="text-xs text-text-muted px-2 py-4 text-center">No conversations yet.</p>
          )}
          {conversations.map((c) => {
            const confirming = confirmingId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => !confirming && onSelect(c.id)}
                className={`group flex items-center gap-1 text-left text-sm px-2 py-2 rounded-lg mb-1 cursor-pointer transition-colors border ${
                  c.id === activeId
                    ? "bg-glow/10 text-glow border-glow/30"
                    : "text-text-muted hover:bg-panel2 hover:text-text border-transparent"
                }`}
              >
                <MessageSquare size={14} className="flex-shrink-0" />
                <span className="truncate flex-1">{c.title || "New chat"}</span>
                <button
                  onClick={(e) => handleDeleteClick(e, c.id)}
                  onMouseLeave={() => confirming && setConfirmingId((v) => (v === c.id ? null : v))}
                  aria-label={confirming ? "Confirm delete" : "Delete conversation"}
                  className={`flex-shrink-0 p-1 rounded transition-colors ${
                    confirming
                      ? "text-red-400 hover:text-red-300 opacity-100"
                      : "opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400"
                  }`}
                >
                  {confirming ? <Check size={13} /> : <Trash2 size={13} />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-border flex items-center justify-between gap-2">
          <span className="text-xs text-text-muted truncate">{userEmail}</span>
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            className="text-text-muted hover:text-text flex-shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>
    </>
  );
}
