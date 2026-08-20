"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, User } from "lucide-react";

export type Role = "user" | "assistant";

export default function ChatMessage({
  role,
  content,
  streaming,
}: {
  role: Role;
  content: string;
  streaming?: boolean;
}) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 w-full animate-rise ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${
          isUser
            ? "bg-panel2 border-border text-text-muted"
            : "bg-glow/10 border-glow/30 text-glow"
        }`}
      >
        {isUser ? <User size={15} /> : <Sparkles size={15} />}
      </div>

      <div
        className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-[15px] ${
          isUser
            ? "bg-panel2 border border-border rounded-tr-sm"
            : "bg-panel border border-border rounded-tl-sm"
        }`}
      >
        <div className="prose-pohana">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || (streaming ? "" : "")}</ReactMarkdown>
        </div>
        {streaming && <span className="cursor-blink" />}
      </div>
    </div>
  );
}
