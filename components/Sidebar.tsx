"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, LogOut, MessageSquare, X, Trash2, Pencil, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ConfirmModal from "@/components/ConfirmModal";

export type Conversation = { id: string; title: string; created_at: string };

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onRename,
  userEmail,
  open,
  onClose,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  userEmail: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function startEditing(e: React.MouseEvent | React.TouchEvent, c: Conversation) {
    e.stopPropagation();
    setMenuOpenId(null);
    setEditingId(c.id);
    setEditValue(c.title || "New chat");
  }

  function commitEdit(id: string) {
    const trimmed = editValue.trim();
    if (trimmed) onRename(id, trimmed);
    setEditingId(null);
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>, id: string) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit(id);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  }

  function confirmDelete() {
    if (pendingDelete) onDelete(pendingDelete.id);
    setPendingDelete(null);
  }

  const initial = userEmail?.trim()?.[0]?.toUpperCase() || "?";

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 sm:hidden" onClick={onClose} />}
      {menuOpenId && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
      )}

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
            const editing = editingId === c.id;
            const menuOpen = menuOpenId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => !editing && onSelect(c.id)}
                className={`group relative flex items-center gap-1 text-left text-sm px-2 py-2 rounded-lg mb-1 cursor-pointer transition-colors border ${
                  c.id === activeId
                    ? "bg-glow/10 text-glow border-glow/30"
                    : "text-text-muted hover:bg-panel2 hover:text-text border-transparent"
                }`}
              >
                <MessageSquare size={14} className="flex-shrink-0" />

                {editing ? (
                  <input
                    ref={editInputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, c.id)}
                    onBlur={() => commitEdit(c.id)}
                    onClick={(e) => e.stopPropagation()}
                    maxLength={60}
                    className="flex-1 min-w-0 bg-panel2 border border-glow/40 rounded px-1.5 py-0.5 text-sm text-text outline-none"
                  />
                ) : (
                  <span className="truncate flex-1">{c.title || "New chat"}</span>
                )}

                {!editing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpen ? null : c.id);
                    }}
                    aria-label="Conversation options"
                    className={`flex-shrink-0 p-1 rounded transition-colors ${
                      menuOpen
                        ? "opacity-100 text-text"
                        : "opacity-0 group-hover:opacity-100 text-text-muted hover:text-text"
                    }`}
                  >
                    <MoreHorizontal size={15} />
                  </button>
                )}

                {menuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-1 top-9 z-50 w-36 bg-panel2 border border-border rounded-lg shadow-xl py-1 animate-rise"
                  >
                    <button
                      onClick={(e) => startEditing(e, c)}
                      className="w-full flex items-center gap-2 text-left text-sm px-3 py-2 text-text-muted hover:text-text hover:bg-panel transition-colors"
                    >
                      <Pencil size={13} />
                      Rename
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(null);
                        setPendingDelete(c);
                      }}
                      className="w-full flex items-center gap-2 text-left text-sm px-3 py-2 text-red-400 hover:bg-panel transition-colors"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-border flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-glow/15 border border-glow/30 flex items-center justify-center text-glow text-xs font-semibold flex-shrink-0">
            {initial}
          </div>
          <span className="text-xs text-text-muted truncate flex-1">{userEmail}</span>
          <button
            onClick={() => setSignOutOpen(true)}
            aria-label="Sign out"
            className="text-text-muted hover:text-text flex-shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete chat"
        description={`Are you sure you want to delete "${pendingDelete?.title || "New chat"}"? This can't be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmModal
        open={signOutOpen}
        title="Sign out"
        description="Are you sure you want to sign out of Pohana AI?"
        confirmLabel="Sign out"
        danger
        onConfirm={handleSignOut}
        onCancel={() => setSignOutOpen(false)}
      />
    </>
  );
}
