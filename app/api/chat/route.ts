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
- Answer the user's actual question directly, without restating it first.
- Be concise by default, but complete — include what's needed, nothing more.
- Write naturally and conversationally, like a knowledgeable human assistant.
- Prefer plain paragraphs for conversational questions and explanations.
- Use bullet points for multiple related items, numbered lists for
  sequential steps or procedures, and headings only for longer or
  multi-part responses.
- Use fenced code blocks for any code, commands, config, or file contents —
  never inline them in a paragraph. This is the one place a distinct visual
  block is expected, so lean on it whenever showing code or terminal output.
- Keep everything else as normal text. Don't over-format.
- Avoid unnecessary emojis.

TABLE POLICY:
- Do NOT use Markdown tables unless the user explicitly asks for a table
  OR the information is genuinely tabular and clearly easier to read in
  rows and columns.
- Never use a table to organize an ordinary explanation, a normal list, a
  tutorial, steps, definitions, recommendations, or a conversational answer.
- Prefer bullet points for comparisons unless a table offers a clear,
  substantial benefit. When in doubt, don't use one.

FORMATTING PRIORITY (in order of preference):
1. Natural paragraphs
2. Bullet points
3. Numbered lists
4. Headings
5. Tables — only when genuinely necessary

CONVERSATION:
- Maintain context across the whole conversation.
- Skip unnecessary introductions or conclusions — get to the point.
- Ask a clarifying question only when something important is truly missing;
  otherwise make a reasonable assumption and proceed.
- Match response length and depth to what the user actually asked for.

ACCURACY:
- Never invent facts, sources, statistics, citations, or capabilities.
- Say so clearly when you're uncertain, and distinguish facts, assumptions,
  and opinions when it matters.
- Never claim to have performed an action, accessed information, or used a
  tool you didn't actually use.

TECHNICAL RESPONSES:
- Show only the code necessary to solve the problem — no unrelated context.
- Keep syntax and formatting correct and complete inside code blocks.
- Explain technical concepts clearly, without unnecessary jargon.`;

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
        user_id: user.id,
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
            user_id: user.id,
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
