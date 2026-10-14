import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2, X, Pencil } from "lucide-react";
import { ExercisePicker, useExercises } from "@/components/ExercisePicker";

export const Route = createFileRoute("/_authenticated/routines")({
  head: () => ({ meta: [{ title: "Routines — Zenkai" }, { name: "description", content: "Build and edit your workout routines." }] }),
  component: RoutinesPage,
});

type Editing = { id?: string; name: string; exerciseIds: string[] };

function RoutinesPage() {
  const qc = useQueryClient();
  const exercises = useExercises();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [picking, setPicking] = useState(false);

  const routines = useQuery({
    queryKey: ["routines-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routines")
        .select("id,name,routine_exercises(exercise_id,position)")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const nameOf = (id: string) => exercises.data?.find((e) => e.id === id)?.name ?? "…";

  async function save() {
    if (!editing || !editing.name.trim()) return toast.error("Name your routine");
    let id = editing.id;
    if (id) {
      const { error } = await supabase.from("routines").update({ name: editing.name.trim() }).eq("id", id);
      if (error) return toast.error(error.message);
      await supabase.from("routine_exercises").delete().eq("routine_id", id);
    } else {
      const { data, error } = await supabase.from("routines").insert({ name: editing.name.trim() }).select("id").single();
      if (error) return toast.error(error.message);
      id = data.id;
    }
    if (editing.exerciseIds.length) {
      const { error } = await supabase
        .from("routine_exercises")
        .insert(editing.exerciseIds.map((exercise_id, position) => ({ routine_id: id!, exercise_id, position })));
      if (error) return toast.error(error.message);
    }
    setEditing(null);
    qc.invalidateQueries();
    toast.success("Routine saved");
  }

  async function remove(id: string) {
    if (!confirm("Delete this routine?")) return;
    await supabase.from("routines").delete().eq("id", id);
    qc.invalidateQueries();
  }

  function move(i: number, d: number) {
    if (!editing) return;
    const ids = [...editing.exerciseIds];
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setEditing({ ...editing, exerciseIds: ids });
  }

  if (editing) {
    return (
      <div className="px-5 pt-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl">{editing.id ? "Edit" : "New"} routine</h1>
          <button onClick={() => setEditing(null)} className="text-muted-foreground"><X /></button>
        </div>
        <input className="z-input mt-6" placeholder="Routine name (e.g. Push day)" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
        <div className="z-label mt-6">Exercises</div>
        <div className="mt-2 space-y-2">
          {editing.exerciseIds.map((id, i) => (
            <div key={id} className="z-card flex items-center gap-2 p-3">
              <span className="w-6 font-display text-lg font-bold text-primary">{i + 1}</span>
              <span className="flex-1 font-medium">{nameOf(id)}</span>
              <button onClick={() => move(i, -1)} className="p-1 text-muted-foreground"><ArrowUp className="h-4 w-4" /></button>
              <button onClick={() => move(i, 1)} className="p-1 text-muted-foreground"><ArrowDown className="h-4 w-4" /></button>
              <button onClick={() => setEditing({ ...editing, exerciseIds: editing.exerciseIds.filter((x) => x !== id) })} className="p-1 text-destructive"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <button onClick={() => setPicking(true)} className="z-btn-ghost mt-3 w-full"><Plus className="h-4 w-4" /> Add exercise</button>
        <button onClick={save} className="z-btn-primary mt-8 w-full">Save routine</button>
        <ExercisePicker
          open={picking}
          onClose={() => setPicking(false)}
          exclude={editing.exerciseIds}
          onPick={(id) => setEditing((e) => (e ? { ...e, exerciseIds: [...e.exerciseIds, id] } : e))}
        />
      </div>
    );
  }

  return (
    <div className="px-5 pt-8">
      <h1 className="text-5xl">Routines</h1>
      <button onClick={() => setEditing({ name: "", exerciseIds: [] })} className="z-btn-primary mt-6 w-full"><Plus className="h-5 w-5" /> New routine</button>
      <div className="mt-6 space-y-2">
        {routines.data?.length === 0 && <p className="text-sm text-muted-foreground">No routines yet.</p>}
        {routines.data?.map((r) => {
          const ids = [...r.routine_exercises].sort((a, b) => a.position - b.position).map((x) => x.exercise_id);
          return (
            <div key={r.id} className="z-card p-4">
              <div className="flex items-center justify-between">
                <div className="font-display text-xl font-bold uppercase">{r.name}</div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing({ id: r.id, name: r.name, exerciseIds: ids })} className="p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(r.id)} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{ids.map(nameOf).join(" · ") || "No exercises"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
