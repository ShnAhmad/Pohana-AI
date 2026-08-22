"use client";

import { useChat } from "ai/react";
import { useCallback, useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import Sidebar, { type Conversation } from "@/components/Sidebar";

type DbMessage = { id: string; role: "user" | "assistant"; content: string };

export default function ChatApp({
  initialConversations,
  userEmail,
}: {
  initialConversations: Conversation[];
  userEmail: string;
}) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { messages, input, setInput, append, isLoading, stop, setMessages } = useChat({
    api: "/api/chat",
    body: { conversationId },
  });

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // load the very first conversation's messages on mount, if one exists
  useEffect(() => {
    if (initialConversations[0]?.id) {
      loadConversation(initialConversations[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConversation = useCallback(
    async (id: string) => {
      setConversationId(id);
      setSidebarOpen(false);
      const res = await fetch(`/api/conversations/${id}/messages`);
      const json = await res.json();
      const loaded: DbMessage[] = json.messages ?? [];
      setMessages(loaded.map((m) => ({ id: m.id, role: m.role, content: m.content })));
    },
    [setMessages]
  );

  async function startNewChat() {
    const res = await fetch("/api/conversations", { method: "POST" });
    const json = await res.json();
    const conv: Conversation | undefined = json.conversation;
    if (conv) {
      setConversations((prev) => [conv, ...prev]);
      setConversationId(conv.id);
      setMessages([]);
    }
    setSidebarOpen(false);
  }

  async function handleRenameConversation(id: string, title: string) {
    const previous = conversations;
    // optimistic UI update
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));

    const res = await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!res.ok) {
      setConversations(previous); // roll back on failure
    }
  }

  async function handleDeleteConversation(id: string) {
    // optimistic UI update
    const wasActive = id === conversationId;
    setConversations((prev) => prev.filter((c) => c.id !== id));

    if (wasActive) {
      setConversationId(null);
      setMessages([]);
    }

    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      console.error("Delete conversation failed:", json.error ?? res.statusText);
      // roll back on failure by refetching the list
      const listRes = await fetch("/api/conversations");
      const listJson = await listRes.json();
      setConversations(listJson.conversations ?? []);
    }
  }

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    let activeId = conversationId;

    // lazily create a conversation on the very first message
    if (!activeId) {
      const res = await fetch("/api/conversations", { method: "POST" });
      const json = await res.json();
      const conv: Conversation | undefined = json.conversation;
      if (conv) {
        activeId = conv.id;
        setConversations((prev) => [conv, ...prev]);
        setConversationId(conv.id);
      }
    }

    setInput("");
    append({ role: "user", content }, { body: { conversationId: activeId } });

    // reflect the auto-generated title locally without a refetch
    if (activeId && messages.length === 0) {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, title: content.slice(0, 60) } : c))
      );
    }
  }

  return (
    <div className="flex h-dvh">
      <Sidebar
        conversations={conversations}
        activeId={conversationId}
        onSelect={loadConversation}
        onNewChat={startNewChat}
        onDelete={handleDeleteConversation}
        onRename={handleRenameConversation}
        userEmail={userEmail}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <Header
          onReset={startNewChat}
          hasMessages={messages.length > 0}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto h-full px-4 sm:px-6">
            {messages.length === 0 ? (
              <EmptyState onPick={(text) => handleSend(text)} />
            ) : (
              <div className="flex flex-col gap-6 py-6">
                {messages.map((m, idx) => (
                  <ChatMessage
                    key={m.id}
                    role={m.role as "user" | "assistant"}
                    content={m.content}
                    toolInvocations={m.toolInvocations}
                    streaming={isLoading && idx === messages.length - 1 && m.role === "assistant"}
                  />
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <ChatMessage role="assistant" content="" streaming />
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </main>

        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-5 pt-2">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={() => handleSend()}
            isLoading={isLoading}
            onStop={stop}
          />
        </div>
      </div>
    </div>
  );
}
