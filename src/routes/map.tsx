import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Compass,
  MapPin,
  Menu,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Map of shares — ShareCheya" },
      {
        name: "description",
        content:
          "See shares near you on a map — rides, stays, group buys and trips around your city.",
      },
      { property: "og:title", content: "Map of shares — ShareCheya" },
      { property: "og:description", content: "See shares near you on a map." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["map-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id,title,location,category,description,owner_id")
        .not("location", "is", null)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected = data?.find((l) => l.id === selectedId) ?? data?.[0];

  const floatingPins = [
    { label: "Ben", x: "48%", y: "18%", color: "bg-[#27c0c2]" },
    { label: "Kai", x: "66%", y: "32%", color: "bg-[#ff8c6b]" },
    { label: "Chloe", x: "50%", y: "46%", color: "bg-[#48a0ff]" },
    { label: "Mia", x: "60%", y: "67%", color: "bg-[#b873ff]" },
    { label: "Ava", x: "76%", y: "54%", color: "bg-[#00b894]" },
  ];

  return (
    <div className="min-h-screen bg-[#edf4fb] text-slate-900">
      <div className="mx-auto max-w-[480px] bg-[#edf4fb] pb-28 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="px-4 pt-3">
          <div className="flex items-center justify-between pb-2 text-[11px] font-medium text-slate-600">
            <span className="text-[13px] font-semibold">9:41 AM</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px]">◔</span>
              <span className="text-[12px]">▣</span>
            </div>
          </div>
        </div>

        <header className="px-4 pb-2 pt-1">
          <div className="flex items-center justify-between">
            <button className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur">
              <Menu className="h-5 w-5 text-slate-700" />
            </button>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-sm backdrop-blur">
              <span className="text-[11px] font-medium text-slate-500">Top</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffe7b3,#d9a1ff_45%,#4e7cff_100%)] text-[10px] font-bold text-white shadow-md">
                A
              </div>
            </div>
          </div>

          <div className="mt-5">
            <h1 className="text-4xl font-black tracking-[-0.06em] text-slate-900">WeFriends</h1>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              aria-label="Search people and groups"
              placeholder="Search friends, events, groups"
              className="w-full border-0 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
          </div>
        </header>

        <div className="relative mx-4 mt-4 overflow-hidden rounded-[30px] border border-white/60 bg-[#dfeaf5] shadow-[0_20px_30px_-24px_rgba(15,23,42,0.35)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.72),transparent_30%),linear-gradient(135deg,#dfeaf5_0%,#dfeaf5_54%,#c3d4e4_100%)]" />
          <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:28px_28px]" />

          <div className="relative z-10 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/85 px-3 py-2 shadow-sm backdrop-blur-sm">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffe8d6] text-sm">
                  ☕
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-900">Coffee Meetup</div>
                  <div className="text-[10px] text-slate-500">3 friends nearby</div>
                </div>
              </div>
              <button className="rounded-full border border-slate-200 bg-white/80 p-2 shadow-sm">
                <Bell className="h-4 w-4 text-slate-600" />
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-[#f0d9ff] bg-white/85 px-3 py-2 shadow-sm backdrop-blur-sm">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fff1cc] text-sm">
                  ⛺
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-900">Camping Trip</div>
                  <div className="text-[10px] text-slate-500">This weekend</div>
                </div>
              </div>
              <button className="rounded-full border border-slate-200 bg-white/80 p-2 shadow-sm">
                <Sparkles className="h-4 w-4 text-slate-600" />
              </button>
            </div>

            <div className="relative h-[500px] overflow-hidden rounded-[28px]">
              <div className="absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.15),rgba(255,255,255,0.05))]" />

              {floatingPins.map((pin, index) => (
                <div
                  key={pin.label}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: pin.x, top: pin.y }}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-lg ${pin.color}`}
                  >
                    {pin.label.slice(0, 1)}
                  </div>
                  {index === 0 && (
                    <div className="mt-1 rounded-full border border-slate-200 bg-white/85 px-2 py-0.5 text-[9px] font-medium text-slate-700 shadow-sm">
                      {pin.label}
                    </div>
                  )}
                </div>
              ))}

              <div className="absolute left-1/2 top-[48%] z-10 -translate-x-1/2 -translate-y-1/2">
                <div className="rounded-[28px] border border-slate-200 bg-white/85 px-4 py-3 text-center shadow-[0_20px_40px_-24px_rgba(15,23,42,0.35)] backdrop-blur-sm">
                  <div className="text-3xl font-black tracking-[-0.06em] text-slate-900">
                    San Francisco
                  </div>
                  <div className="mt-2 text-sm text-slate-500">WeFriends</div>
                </div>
              </div>

              <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between gap-2">
                <div className="flex-1 rounded-full border border-slate-200 bg-white/85 px-3 py-2 text-center text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm">
                  Home
                </div>
                <div className="flex-1 rounded-full border border-slate-200 bg-primary/10 px-3 py-2 text-center text-xs font-semibold text-primary shadow-sm">
                  Explore
                </div>
                <div className="flex-1 rounded-full border border-slate-200 bg-white/85 px-3 py-2 text-center text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm">
                  Events
                </div>
                <div className="flex-1 rounded-full border border-slate-200 bg-white/85 px-3 py-2 text-center text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm">
                  Chats
                </div>
                <div className="flex-1 rounded-full border border-slate-200 bg-white/85 px-3 py-2 text-center text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm">
                  Profile
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="space-y-3">
            {data?.map((l, index) => {
              const active = selected?.id === l.id;
              return (
                <div
                  key={l.id}
                  className={`rounded-2xl border p-3 transition ${
                    active ? "border-primary bg-primary/5 shadow-sm" : "border-white/80 bg-white/75"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(l.id)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ${index % 2 === 0 ? "bg-[#2ec4b6]" : "bg-[#7c6cff]"}`}
                        >
                          {l.title.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-900">{l.title}</div>
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{l.location}</span>
                          </div>
                        </div>
                      </div>
                      {l.description && (
                        <p className="mt-2 line-clamp-2 text-xs text-slate-600">{l.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                        {l.category}
                      </span>
                      <Link
                        to="/listings/$id"
                        params={{ id: l.id }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"
                        aria-label={`Open ${l.title}`}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
