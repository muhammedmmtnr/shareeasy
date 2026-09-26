import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Message = Database["public"]["Tables"]["messages"]["Row"];

export function ChatThread({ conversationId, meId }: { conversationId: string; meId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at")
      .then(({ data }) => { if (mounted && data) setMessages(data); });

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => setMessages(prev => prev.some(m => m.id === (payload.new as Message).id) ? prev : [...prev, payload.new as Message]))
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const { error, data } = await supabase.from("messages")
      .insert({ conversation_id: conversationId, sender_id: meId, body: text })
      .select().single();
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setBody("");
    if (data) setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
  };

  return (
    <div className="flex flex-col h-[60vh] rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="px-4 py-2 border-b border-border/60 bg-muted/30 text-xs text-muted-foreground">
        🔒 Anonymous chat — phone numbers and emails are never shown. Stay in-app for safety.
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Say hi 👋
          </div>
        ) : messages.map(m => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap
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
      <form
        className="flex gap-2 p-3 border-t border-border/60"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message…"
          rows={1}
          maxLength={1000}
          className="resize-none min-h-[42px]"
        />
        <Button type="submit" disabled={sending || !body.trim()} className="rounded-full">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
