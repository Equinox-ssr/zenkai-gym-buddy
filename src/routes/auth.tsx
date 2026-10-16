import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Zenkai" },
      { name: "description", content: "Sign in to Zenkai to log your workouts and track PRs." },
      { property: "og:title", content: "Sign in — Zenkai" },
      { property: "og:description", content: "Sign in to Zenkai to log your workouts and track PRs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/home" },
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      if (data.session) navigate({ to: "/home", replace: true });
      else setSent(true);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-6xl text-primary">Zenkai</h1>
      <p className="mt-2 font-display text-lg uppercase tracking-widest text-muted-foreground">Level up every rep</p>

      {sent ? (
        <div className="mt-10 rounded-lg border border-primary/40 bg-card p-5">
          <h2 className="text-2xl">Check your email</h2>
          <p className="mt-2 text-sm text-muted-foreground">We sent a confirmation link to {email}. Tap it to finish signing up.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-10 space-y-3">
          <input className="z-input" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <input className="z-input" type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} />
          <button disabled={busy} className="z-btn-primary w-full">{busy ? "…" : mode === "in" ? "Sign in" : "Create account"}</button>
          <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full py-2 text-sm text-muted-foreground">
            {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
          </button>
        </form>
      )}
    </main>
  );
}
