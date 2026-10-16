import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Trophy, Minus, SkipForward, Check } from "lucide-react";
import { ExercisePicker, useExercises } from "@/components/ExercisePicker";
import { epley, fmtDate, fromDisplay, toDisplay, useRestDefault, useUnit, type Unit } from "@/lib/zenkai";

export const Route = createFileRoute("/_authenticated/workout/$id")({
  head: () => ({ meta: [{ title: "Workout — Zenkai" }, { name: "description", content: "Log your sets." }] }),
  component: WorkoutPage,
});

type SetRow = { id: string; workout_id: string; exercise_id: string; weight: number; reps: number; created_at: string };
type HistRow = SetRow & { date: string };

function WorkoutPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const unit = useUnit();
  const restDefault = useRestDefault();
  const exercises = useExercises();
  const [added, setAdded] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(restDefault);

  const workout = useQuery({
    queryKey: ["workout", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("id,date,routine_id,routines(name,routine_exercises(exercise_id,position))")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const sets = useQuery({
    queryKey: ["workout-sets", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("sets").select("*").eq("workout_id", id).order("created_at");
      if (error) throw error;
      return data.map((s) => ({ ...s, weight: Number(s.weight) })) as SetRow[];
    },
  });

  const exerciseIds = useMemo(() => {
    const ids: string[] = [];
    const push = (x: string) => !ids.includes(x) && ids.push(x);
    [...(workout.data?.routines?.routine_exercises ?? [])].sort((a, b) => a.position - b.position).forEach((r) => push(r.exercise_id));
    sets.data?.forEach((s) => push(s.exercise_id));
    added.forEach(push);
    return ids;
  }, [workout.data, sets.data, added]);

  const history = useQuery({
    queryKey: ["history", exerciseIds.join(",")],
    enabled: exerciseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sets")
        .select("id,workout_id,exercise_id,weight,reps,created_at,workouts!inner(date)")
        .in("exercise_id", exerciseIds)
        .neq("workout_id", id)
        .order("created_at");
      if (error) throw error;
      return data.map((s) => ({ ...s, weight: Number(s.weight), date: s.workouts.date })) as HistRow[];
    },
  });

  async function logSet(exercise_id: string, weightKg: number, reps: number) {
    const prior = [...(history.data ?? []), ...(sets.data ?? [])].filter((s) => s.exercise_id === exercise_id);
    const { error } = await supabase.from("sets").insert({ workout_id: id, exercise_id, weight: weightKg, reps });
    if (error) { toast.error(error.message); return; }
    if (prior.length) {
      const bestW = Math.max(...prior.map((s) => s.weight));
      const bestE = Math.max(...prior.map((s) => epley(s.weight, s.reps)));
      if (weightKg > bestW || epley(weightKg, reps) > bestE) toast.success("🏆 New PR!");
    }
    setRestTotal(restDefault);
    setRestEnd(Date.now() + restDefault * 1000);
    qc.invalidateQueries({ queryKey: ["workout-sets", id] });
  }

  async function deleteSet(setId: string) {
    await supabase.from("sets").delete().eq("id", setId);
    qc.invalidateQueries({ queryKey: ["workout-sets", id] });
  }

  async function finish() {
    if (!sets.data?.length) await supabase.from("workouts").delete().eq("id", id);
    qc.invalidateQueries();
    navigate({ to: "/home" });
  }

  const nameOf = (eid: string) => exercises.data?.find((e) => e.id === eid)?.name ?? "…";

  return (
    <div className="px-5 pt-8 pb-28">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="z-label">{workout.data ? fmtDate(workout.data.date) : ""}</div>
          <h1 className="text-4xl">{workout.data?.routines?.name ?? "Free workout"}</h1>
        </div>
        <button onClick={finish} className="z-btn-primary h-10 px-4 text-base"><Check className="h-4 w-4" /> Finish</button>
      </div>

      <div className="mt-6 space-y-4">
        {exerciseIds.map((eid) => (
          <ExerciseCard
            key={eid}
            name={nameOf(eid)}
            unit={unit}
            current={(sets.data ?? []).filter((s) => s.exercise_id === eid)}
            history={(history.data ?? []).filter((s) => s.exercise_id === eid)}
            onLog={(w, r) => logSet(eid, w, r)}
            onDelete={deleteSet}
          />
        ))}
      </div>

      <button onClick={() => setPicking(true)} className="z-btn-ghost mt-4 w-full"><Plus className="h-4 w-4" /> Add exercise</button>
      <ExercisePicker open={picking} onClose={() => setPicking(false)} exclude={exerciseIds} onPick={(x) => setAdded((a) => [...a, x])} />

      {restEnd && (
        <RestTimer
          end={restEnd}
          total={restTotal}
          onAdjust={(d) => { setRestEnd((e) => (e ? e + d * 1000 : e)); setRestTotal((t) => Math.max(1, t + d)); }}
          onDone={() => setRestEnd(null)}
        />
      )}
    </div>
  );
}

function ExerciseCard({
  name, unit, current, history, onLog, onDelete,
}: {
  name: string; unit: Unit; current: SetRow[]; history: HistRow[];
  onLog: (wKg: number, reps: number) => void; onDelete: (id: string) => void;
}) {
  const prevWorkoutId = history.length ? history[history.length - 1]?.workout_id ?? null : null;
  const prev = history.filter((s) => s.workout_id === prevWorkoutId);
  const last = current[current.length - 1] ?? prev[prev.length - 1];
  const [w, setW] = useState("");
  const [r, setR] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (last) { setW(String(toDisplay(last.weight, unit))); setR(String(last.reps)); }
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last?.id, unit]);

  // PR flags: compare each current set to everything logged before it.
  const prFlags = current.map((s) => {
    const before = [...history, ...current].filter((x) => x.created_at < s.created_at);
    if (!before.length) return false;
    const bw = Math.max(...before.map((x) => x.weight));
    const be = Math.max(...before.map((x) => epley(x.weight, x.reps)));
    return s.weight > bw || epley(s.weight, s.reps) > be;
  });

  const step = unit === "kg" ? 2.5 : 5;
  const bump = (d: number) => { setTouched(true); setW(String(Math.max(0, Math.round(((parseFloat(w) || 0) + d) * 10) / 10))); };

  function submit() {
    const wv = parseFloat(w); const rv = parseInt(r);
    if (isNaN(wv) || isNaN(rv) || rv <= 0) { toast.error("Enter weight and reps"); return; }
    onLog(fromDisplay(wv, unit), rv);
  }

  return (
    <div className="z-card p-4">
      <h2 className="text-2xl">{name}</h2>
      {prev.length > 0 && (
        <div className="mt-1 text-xs text-muted-foreground">
          Last ({prev[0] ? fmtDate(prev[0].date) : ""}): {prev.map((s) => `${toDisplay(s.weight, unit)}×${s.reps}`).join(", ")}
        </div>
      )}

      {current.length > 0 && (
        <div className="mt-3 space-y-1">
          {current.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 rounded-md bg-muted px-3 py-2">
              <span className="w-5 font-display font-bold text-muted-foreground">{i + 1}</span>
              <span className="flex-1 font-display text-lg font-bold">
                {toDisplay(s.weight, unit)} <span className="text-sm text-muted-foreground">{unit}</span> × {s.reps}
              </span>
              {prFlags[i] && (
                <span className="animate-pr inline-flex items-center gap-1 rounded-full bg-flash px-2 py-0.5 font-display text-xs font-extrabold uppercase text-flash-foreground">
                  <Trophy className="h-3 w-3" /> New PR!
                </span>
              )}
              <button onClick={() => onDelete(s.id)} className="text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-[1fr_auto_5rem_auto] items-end gap-2">
        <div>
          <div className="z-label mb-1">{unit}</div>
          <div className="flex">
            <button onClick={() => bump(-step)} className="z-btn-ghost h-12 rounded-r-none px-3"><Minus className="h-4 w-4" /></button>
            <input inputMode="decimal" className="z-input rounded-none text-center font-display text-xl font-bold" value={w} onChange={(e) => { setTouched(true); setW(e.target.value); }} placeholder="0" />
            <button onClick={() => bump(step)} className="z-btn-ghost h-12 rounded-l-none px-3"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
        <span className="pb-3 text-muted-foreground">×</span>
        <div>
          <div className="z-label mb-1">Reps</div>
          <input inputMode="numeric" className="z-input text-center font-display text-xl font-bold" value={r} onChange={(e) => { setTouched(true); setR(e.target.value); }} placeholder="0" />
        </div>
        <button onClick={submit} aria-label="Log set" className="z-btn-primary h-12 w-12 px-0"><Plus className="h-6 w-6" /></button>
      </div>
      {!touched && last && <div className="sr-only">Prefilled from last set</div>}
    </div>
  );
}

function RestTimer({ end, total, onAdjust, onDone }: { end: number; total: number; onAdjust: (d: number) => void; onDone: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((end - now) / 1000));
  useEffect(() => {
    if (left === 0) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(300);
      toast("Rest over — next set!");
      onDone();
    }
  }, [left, onDone]);
  const pct = Math.min(100, (left / total) * 100);

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 px-4">
      <div className="z-card mx-auto max-w-lg overflow-hidden border-flash/40">
        <div className="h-1 bg-flash transition-all" style={{ width: `${pct}%` }} />
        <div className="flex items-center justify-between gap-2 p-3">
          <span className="z-label">Rest</span>
          <button onClick={() => onAdjust(-15)} className="z-btn-ghost h-9 px-2 text-sm">−15</button>
          <span className="font-display text-3xl font-extrabold text-flash tabular-nums">
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
          </span>
          <button onClick={() => onAdjust(15)} className="z-btn-ghost h-9 px-2 text-sm">+15</button>
          <button onClick={onDone} className="z-btn-ghost h-9 px-2 text-sm"><SkipForward className="h-4 w-4" /> Skip</button>
        </div>
      </div>
    </div>
  );
}
