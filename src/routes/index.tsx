import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zenkai — Level up every rep" },
      { name: "description", content: "A minimal gym tracker. Log sets fast, beat your PRs, watch your weekly volume climb." },
      { property: "og:title", content: "Zenkai — Level up every rep" },
      { property: "og:description", content: "A minimal gym tracker. Log sets fast, beat your PRs, watch your weekly volume climb." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-6 py-12">
      <div className="z-label">Gym tracker</div>
      <div>
        <h1 className="text-[5.5rem] text-primary">Zenkai</h1>
        <p className="mt-3 font-display text-2xl font-bold uppercase tracking-wide">Level up every rep</p>
        <p className="mt-4 text-muted-foreground">Log sets in seconds. Rest timer built in. PRs and weekly volume, nothing else.</p>
      </div>
      <Link to="/auth" className="z-btn-primary w-full">Get started</Link>
    </main>
  );
}
