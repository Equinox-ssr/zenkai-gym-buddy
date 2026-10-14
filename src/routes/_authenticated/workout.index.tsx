import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Play, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workout/")({
  validateSearch: (s: Record<string, unknown>): { routine?: string } => ({
    routine: typeof s.routine === "string" ? s.routine : undefined,
  }),
  head: () => ({ meta: [{ title: "Start workout — Zenkai" }, { name: "description", content: "Pick a routine or start an empty workout." }] }),
  component: StartWorkout,
});

function StartWorkout() {
  const { routine } = Route.useSearch();
  const navigate = useNavigate();
  const started = useRef(false);

  const routines = useQuery({
    queryKey: ["routines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("routines").select("id,name,routine_exercises(count)").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  async function start(routineId: string | null) {
    const { data, error } = await supabase.from("workouts").insert({ routine_id: routineId }).select("id").single();
    if (error) return toast.error(error.message);
    navigate({ to: "/workout/$id", params: { id: data.id }, replace: true });
  }

  useEffect(() => {
    if (routine && !started.current) {
      started.current = true;
      start(routine);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routine]);

  return (
    <div className="px-5 pt-8">
      <h1 className="text-5xl">Start workout</h1>
      <button onClick={() => start(null)} className="z-btn-primary mt-6 w-full">
        <Plus className="h-5 w-5" /> Empty workout
      </button>
      <div className="z-label mt-8">Or pick a routine</div>
      <div className="mt-2 space-y-2">
        {routines.data?.length === 0 && <p className="text-sm text-muted-foreground">No routines yet.</p>}
        {routines.data?.map((r) => (
          <button key={r.id} onClick={() => start(r.id)} className="z-card flex w-full items-center justify-between p-4 text-left">
            <div>
              <div className="font-display text-xl font-bold uppercase">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.routine_exercises[0]?.count ?? 0} exercises</div>
            </div>
            <Play className="h-5 w-5 text-primary" />
          </button>
        ))}
      </div>
    </div>
  );
}
