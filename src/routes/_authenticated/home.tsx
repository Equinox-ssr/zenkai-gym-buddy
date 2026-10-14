import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, fmtW, useUnit } from "@/lib/zenkai";
import { Play, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — Zenkai" }, { name: "description", content: "Your routines and recent workouts." }] }),
  component: HomePage,
});

function HomePage() {
  const unit = useUnit();
  const routines = useQuery({
    queryKey: ["routines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("routines").select("id,name,routine_exercises(count)").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const recent = useQuery({
    queryKey: ["recent-workouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("id,date,routines(name),sets(weight,reps)")
        .order("date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="px-5 pt-8">
      <h1 className="text-5xl text-primary">Zenkai</h1>
      <p className="z-label mt-1">Level up every rep</p>

      <Link to="/workout" className="z-btn-primary mt-8 h-16 w-full text-2xl">
        <Play className="h-6 w-6 fill-current" /> Start workout
      </Link>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl">My routines</h2>
          <Link to="/routines" className="z-label text-primary">Edit</Link>
        </div>
        <div className="mt-3 space-y-2">
          {routines.data?.length === 0 && <p className="text-sm text-muted-foreground">No routines yet. Create one in Routines.</p>}
          {routines.data?.map((r) => (
            <Link key={r.id} to="/workout" search={{ routine: r.id }} className="z-card flex items-center justify-between p-4">
              <div>
                <div className="font-display text-xl font-bold uppercase">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.routine_exercises[0]?.count ?? 0} exercises</div>
              </div>
              <Play className="h-5 w-5 text-primary" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl">Last workouts</h2>
        <div className="mt-3 space-y-2">
          {recent.data?.length === 0 && <p className="text-sm text-muted-foreground">Nothing logged yet.</p>}
          {recent.data?.map((w) => {
            const vol = w.sets.reduce((a, s) => a + Number(s.weight) * s.reps, 0);
            return (
              <Link key={w.id} to="/workout/$id" params={{ id: w.id }} className="z-card flex items-center justify-between p-4">
                <div>
                  <div className="font-display text-lg font-bold uppercase">{w.routines?.name ?? "Free workout"}</div>
                  <div className="text-xs text-muted-foreground">
                    {fmtDate(w.date)} · {w.sets.length} sets · {fmtW(vol, unit)} {unit}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
