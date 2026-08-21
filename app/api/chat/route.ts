import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are Pohana AI, a helpful, thoughtful, and honest AI assistant.
"Pohana" means "to shine" or "radiance" — reflect that in a warm, clear, and
illuminating communication style. Be concise by default, use markdown
(headings, lists, code blocks) when it improves clarity, and never invent
facts you are not confident about. If you don't know something, say so.`;

export async function POST(req: Request) {
  try {
    const { messages, conversationId } = await req.json();
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const lastMessage = messages[messages.length - 1];

    // Persist the user's message, and auto-title new conversations.
    if (conversationId && lastMessage?.role === "user") {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: lastMessage.content,
      });

      if (messages.length === 1) {
        await supabase
          .from("conversations")
          .update({ title: lastMessage.content.slice(0, 60) })
          .eq("id", conversationId);
      }
    }

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: SYSTEM_PROMPT,
      messages,
      temperature: 0.7,
      async onFinish({ text }) {
        // Persist the assistant's full reply once streaming completes.
        if (conversationId) {
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: text,
          });
        }
      },
    });

    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        console.error("streamText error:", error);
        return error instanceof Error ? error.message : "Unknown streaming error";
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return new Response(
      JSON.stringify({
        error:
          "Something went wrong talking to the model. Check that GROQ_API_KEY is set correctly.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}