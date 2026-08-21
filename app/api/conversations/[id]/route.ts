import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { title } = await request.json();
  const trimmed = typeof title === "string" ? title.trim().slice(0, 60) : "";
  if (!trimmed) {
    return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
  }

  // RLS ensures this only ever renames a conversation the user owns.
  const { data, error } = await supabase
    .from("conversations")
    .update({ title: trimmed })
    .eq("id", params.id)
    .select("id, title, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ conversation: data });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Delete messages explicitly first (now allowed independently of the
  // parent conversation still existing, since messages carries its own
  // user_id). RLS still ensures only this user's rows are ever touched.
  const { error: messagesError } = await supabase
    .from("messages")
    .delete()
    .eq("conversation_id", params.id);

  if (messagesError) {
    console.error("Failed to delete messages:", messagesError);
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  const { error } = await supabase.from("conversations").delete().eq("id", params.id);

  if (error) {
    console.error("Failed to delete conversation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
