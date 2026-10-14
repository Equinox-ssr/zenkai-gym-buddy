import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestDefault, useUnit, writeSetting } from "@/lib/zenkai";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Zenkai" }, { name: "description", content: "Units and rest timer settings." }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const unit = useUnit();
  const rest = useRestDefault();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="px-5 pt-8">
      <h1 className="text-5xl">Settings</h1>

      <div className="z-label mt-8">Weight unit</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(["kg", "lbs"] as const).map((u) => (
          <button
            key={u}
            onClick={() => writeSetting("zenkai.unit", u)}
            className={u === unit ? "z-btn-primary" : "z-btn-ghost h-12"}
          >
            {u}
          </button>
        ))}
      </div>

      <div className="z-label mt-8">Default rest timer</div>
      <div className="mt-2 flex items-center justify-between z-card p-3">
        <button className="z-btn-ghost" onClick={() => writeSetting("zenkai.rest", Math.max(15, rest - 15))}>−15</button>
        <span className="font-display text-3xl font-bold">{Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}</span>
        <button className="z-btn-ghost" onClick={() => writeSetting("zenkai.rest", Math.min(600, rest + 15))}>+15</button>
      </div>

      <div className="z-label mt-8">Account</div>
      <div className="mt-2 text-sm text-muted-foreground">{email}</div>
      <button onClick={signOut} className="z-btn-ghost mt-3 w-full">Sign out</button>
    </div>
  );
}
