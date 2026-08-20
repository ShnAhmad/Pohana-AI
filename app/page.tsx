import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatApp from "@/components/ChatApp";
import SetupNeeded from "@/components/SetupNeeded";

export default async function Home() {
  const missingEnv =
    !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (missingEnv) {
    return <SetupNeeded />;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });

  return <ChatApp initialConversations={conversations ?? []} userEmail={user.email ?? ""} />;
}
