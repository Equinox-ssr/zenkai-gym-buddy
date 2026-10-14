import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const { data, error } = await supabase.from("exercises").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function ExercisePicker({
  open,
  onClose,
  onPick,
  exclude = [],
}: {
  open: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
  exclude?: string[];
}) {
  const qc = useQueryClient();
  const { data } = useExercises();
  const [q, setQ] = useState("");
  const list = (data ?? []).filter((e) => !exclude.includes(e.id) && e.name.toLowerCase().includes(q.toLowerCase()));
  const exact = data?.some((e) => e.name.toLowerCase() === q.trim().toLowerCase());

  async function create() {
    const name = q.trim();
    if (!name) return;
    const { data: row, error } = await supabase.from("exercises").insert({ name }).select("id").single();
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["exercises"] });
    pick(row.id);
  }
  function pick(id: string) {
    onPick(id);
    setQ("");
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-border bg-background">
        <SheetHeader>
          <SheetTitle className="font-display text-3xl uppercase">Add exercise</SheetTitle>
        </SheetHeader>
        <div className="space-y-2 px-4 pb-6">
          <input autoFocus className="z-input" placeholder="Search or type a new exercise" value={q} onChange={(e) => setQ(e.target.value)} />
          {q.trim() && !exact && (
            <button onClick={create} className="z-card flex w-full items-center gap-2 border-primary/50 p-3 text-left text-primary">
              <Plus className="h-4 w-4" /> Create “{q.trim()}”
            </button>
          )}
          {list.map((e) => (
            <button key={e.id} onClick={() => pick(e.id)} className="z-card block w-full p-3 text-left font-medium">
              {e.name}
            </button>
          ))}
          {!q && list.length === 0 && <p className="text-sm text-muted-foreground">Type a name to create your first exercise.</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
