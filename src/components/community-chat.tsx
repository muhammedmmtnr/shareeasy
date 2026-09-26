import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Msg = Database["public"]["Tables"]["community_messages"]["Row"];

export function CommunityChat({
  communityId, meId, members,
}: {
  communityId: string;
  meId: string;
  members: Record<string, { display_name: string | null; verified?: boolean }>;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    supabase.from("community_messages").select("*")
      .eq("community_id", communityId).order("created_at").limit(200)
      .then(({ data }) => { if (mounted && data) setMessages(data); });

    const channel = supabase.channel(`community:${communityId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages", filter: `community_id=eq.${communityId}` },
        (payload) => setMessages(prev => prev.some(m => m.id === (payload.new as Msg).id) ? prev : [...prev, payload.new as Msg]))
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [communityId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const { data, error } = await supabase.from("community_messages")
      .insert({ community_id: communityId, sender_id: meId, body: text })
      .select().single();
    setSending(false);
    if (error) return toast.error(error.message);
    setBody("");
    if (data) setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
  };

  return (
    <div className="flex flex-col h-[65vh] rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-6">
            Say hi to the community! 👋<br/>This chat is visible only to members.
          </div>
        ) : messages.map((m, i) => {
          const mine = m.sender_id === meId;
          const prev = messages[i - 1];
          const showAuthor = !prev || prev.sender_id !== m.sender_id;
          const name = members[m.sender_id]?.display_name ?? "Member";
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              {showAuthor && !mine && (
                <span className="text-[11px] text-muted-foreground font-medium px-1 mb-0.5">{name}</span>
              )}
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words
                ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                {m.body}
                <div className={`text-[10px] mt-0.5 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <form className="flex gap-2 p-3 border-t border-border/60"
        onSubmit={e => { e.preventDefault(); send(); }}>
        <Textarea value={body} onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message the community…" rows={1} maxLength={1000} className="resize-none min-h-[42px]" />
        <Button type="submit" disabled={sending || !body.trim()} className="rounded-full">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
