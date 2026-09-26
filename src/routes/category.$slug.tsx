import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { ListingCard } from "@/components/listing-card";
import { CATEGORY_BY_SLUG } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/category/$slug")({
  beforeLoad: ({ params }) => {
    if (!CATEGORY_BY_SLUG[params.slug]) throw notFound();
  },
  head: ({ params }) => {
    const cat = CATEGORY_BY_SLUG[params.slug];
    return {
      meta: [
        { title: `${cat?.label ?? "Category"} sharing — ShareX` },
        { name: "description", content: cat?.tagline ?? "ShareX category" },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const cat = CATEGORY_BY_SLUG[slug]!;
  const Icon = cat.icon;

  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings-by-cat", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings").select("*")
        .eq("category", slug as never)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className={`relative overflow-hidden bg-gradient-to-br ${cat.color}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 text-white">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 mb-4">
            <Icon className="h-7 w-7" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">{cat.label}</h1>
          <p className="mt-2 text-lg text-white/90">{cat.tagline}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {cat.examples.map(e => (
              <span key={e} className="rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1 text-sm">{e}</span>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Loading…</div>
        ) : !listings || listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <h3 className="text-lg font-semibold">No {cat.label.toLowerCase()} shares yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Start the first one.</p>
            <Link to="/new" className="inline-flex mt-6 items-center justify-center rounded-full bg-[image:var(--gradient-hero)] text-white px-5 py-2 text-sm font-medium">
              Post a share
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </div>
    </div>
  );
}
