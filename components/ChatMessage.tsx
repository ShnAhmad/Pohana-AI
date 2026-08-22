"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, User, Search, CloudSun, Loader2 } from "lucide-react";

export type Role = "user" | "assistant";

type ToolInvocationLite = {
  toolName: string;
  state: "partial-call" | "call" | "result";
};

function toolMeta(toolName: string) {
  switch (toolName) {
    case "webSearch":
      return { label: "Searching the web", icon: Search };
    case "getWeather":
      return { label: "Checking the weather", icon: CloudSun };
    default:
      return { label: "Using a tool", icon: Search };
  }
}

export default function ChatMessage({
  role,
  content,
  streaming,
  toolInvocations,
}: {
  role: Role;
  content: string;
  streaming?: boolean;
  toolInvocations?: ToolInvocationLite[];
}) {
  const isUser = role === "user";

  // "call" / "partial-call" = the tool is currently running, no result yet.
  // "result" = it finished and the model is about to (or is) writing the
  // real answer using that result.
  const activeTool = toolInvocations?.find((t) => t.state !== "result");
  const hasCompletedTool = toolInvocations?.some((t) => t.state === "result");
  const waitingOnFinalAnswer = hasCompletedTool && !content;

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
        className={
          isUser
            ? "max-w-[80%] sm:max-w-[70%] rounded-2xl rounded-tr-sm px-4 py-3 text-[15px] bg-panel2 border border-border"
            : "max-w-[85%] sm:max-w-[75%] px-1 py-1 text-[15px]"
        }
      >
        {activeTool && (
          <ToolStatus
            icon={toolMeta(activeTool.toolName).icon}
            label={`${toolMeta(activeTool.toolName).label}…`}
          />
        )}
        {waitingOnFinalAnswer && <ToolStatus icon={Loader2} label="Reading results…" spin />}

        {content && (
          <div className="prose-pohana">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
        {streaming && content && <span className="cursor-blink" />}
        {streaming && !content && !activeTool && !waitingOnFinalAnswer && (
          <span className="cursor-blink" />
        )}
      </div>
    </div>
  );
}

function ToolStatus({
  icon: Icon,
  label,
  spin,
}: {
  icon: typeof Search;
  label: string;
  spin?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-glow mb-2 animate-rise">
      <Icon size={14} className={spin ? "animate-spin" : "animate-glowPulse"} />
      <span>{label}</span>
    </div>
  );
}
