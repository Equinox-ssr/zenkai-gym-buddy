import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { epley, fmtDate, toDisplay, useUnit, weekStart } from "@/lib/zenkai";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Progress — Zenkai" }, { name: "description", content: "Personal records and weekly volume." }] }),
  component: ProgressPage,
});

function ProgressPage() {
  const unit = useUnit();
  const all = useQuery({
    queryKey: ["all-sets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sets")
        .select("weight,reps,exercise_id,exercises(name),workouts!inner(date)")
        .limit(10000);
      if (error) throw error;
      return data.map((s) => ({ w: Number(s.weight), r: s.reps, ex: s.exercise_id, name: s.exercises?.name ?? "", date: s.workouts.date }));
    },
  });

  const prs = useMemo(() => {
    const m = new Map<string, { name: string; bw: number; bwDate: string; be: number; beDate: string }>();
    for (const s of all.data ?? []) {
      const e = epley(s.w, s.r);
      const cur = m.get(s.ex);
      if (!cur) { m.set(s.ex, { name: s.name, bw: s.w, bwDate: s.date, be: e, beDate: s.date }); continue; }
      if (s.w > cur.bw) { cur.bw = s.w; cur.bwDate = s.date; }
      if (e > cur.be) { cur.be = e; cur.beDate = s.date; }
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [all.data]);

  const weeks = useMemo(() => {
    const start = weekStart(new Date());
    const list = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() - (7 - i) * 7);
      return { start: d, vol: 0 };
    });
    for (const s of all.data ?? []) {
      const ws = weekStart(new Date(s.date)).getTime();
      const wk = list.find((x) => x.start.getTime() === ws);
      if (wk) wk.vol += s.w * s.r;
    }
    return list;
  }, [all.data]);
  const maxVol = Math.max(1, ...weeks.map((w) => w.vol));

  return (
    <div className="px-5 pt-8">
      <h1 className="text-5xl">Progress</h1>

      <section className="mt-8">
        <h2 className="text-2xl">Weekly volume</h2>
        <p className="z-label mt-1">Last 8 weeks · {unit}</p>
        <div className="z-card mt-3 p-4">
          <div className="flex h-40 items-end gap-2">
            {weeks.map((w, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="font-display text-[10px] font-bold text-muted-foreground">
                  {w.vol ? (toDisplay(w.vol, unit) >= 1000 ? `${Math.round(toDisplay(w.vol, unit) / 100) / 10}k` : Math.round(toDisplay(w.vol, unit))) : ""}
                </span>
                <div
                  className={i === 7 ? "w-full rounded-t bg-primary" : "w-full rounded-t bg-primary/40"}
                  style={{ height: `${(w.vol / maxVol) * 100}%`, minHeight: w.vol ? 4 : 2 }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            {weeks.map((w, i) => (
              <span key={i} className="flex-1 text-center text-[10px] text-muted-foreground">
                {w.start.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl">Personal records</h2>
        <div className="mt-3 space-y-2">
          {prs.length === 0 && <p className="text-sm text-muted-foreground">Log some sets to see your PRs.</p>}
          {prs.map((p) => (
            <div key={p.name} className="z-card p-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="font-display text-xl font-bold uppercase">{p.name}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="z-label">Best weight</div>
                  <div className="font-display text-3xl font-extrabold text-primary">
                    {toDisplay(p.bw, unit)}<span className="ml-1 text-base text-muted-foreground">{unit}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtDate(p.bwDate)}</div>
                </div>
                <div>
                  <div className="z-label">Est. 1RM</div>
                  <div className="font-display text-3xl font-extrabold">
                    {toDisplay(p.be, unit)}<span className="ml-1 text-base text-muted-foreground">{unit}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtDate(p.beDate)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
