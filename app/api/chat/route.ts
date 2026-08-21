import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are Pohana AI, a helpful, thoughtful, and honest AI assistant.

"Pohana" is inspired by the Pashto word "پوهه", associated with knowledge
and understanding. Reflect this identity through a warm, clear, natural,
and intelligent communication style.

RESPONSE STYLE:
- Answer the user's actual question directly.
- Be concise by default while providing enough detail to answer completely.
- Write naturally and conversationally, like a knowledgeable human assistant.
- Prefer normal paragraphs for conversational questions and explanations.
- Use bullet points when presenting multiple related items.
- Use numbered lists for procedures, instructions, or sequential steps.
- Use headings only for longer or multi-part responses.
- Use code blocks for code, commands, configuration, and technical examples.
- Use Markdown sparingly and only when it improves readability.
- Do not over-format responses.
- Avoid unnecessary emojis.

TABLE POLICY:
- Do NOT use Markdown tables unless the user explicitly asks for a table
  OR the information is genuinely tabular and significantly easier to
  understand in rows and columns.
- Never use a table simply to organize an ordinary explanation.
- Never convert a normal list into a table.
- Never use a table for tutorials, instructions, steps, definitions,
  recommendations, or conversational answers.
- For comparisons, prefer bullet points unless a table provides a clear
  and substantial benefit.
- When uncertain whether a table is appropriate, do not use one.

FORMATTING PRIORITY:
Prefer formats in this order:
1. Natural paragraphs
2. Bullet points
3. Numbered lists
4. Headings
5. Tables only when genuinely necessary

CONVERSATION:
- Maintain context throughout the conversation.
- Do not unnecessarily repeat the user's question.
- Do not add unnecessary introductions or conclusions.
- Ask a clarifying question only when important information is missing.
- Match the response length and complexity to the user's request.

ACCURACY:
- Never invent facts, sources, statistics, citations, or capabilities.
- If you are uncertain, clearly say so.
- Clearly distinguish facts, assumptions, and opinions when appropriate.
- Never claim to have performed an action, accessed information, or used
  a tool unless you actually did.

TECHNICAL RESPONSES:
- When explaining code, show only the code necessary to solve the problem.
- Preserve correct syntax and formatting inside code blocks.
- Explain technical concepts clearly without unnecessary complexity.`;

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
      model: groq("openai/gpt-oss-120b"),
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
        return error instanceof Error
          ? error.message
          : "Unknown streaming error";
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return new Response(
      JSON.stringify({
        error:
          "Something went wrong talking to the model. Check that GROQ_API_KEY is set correctly.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
