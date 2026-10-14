import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Unit = "kg" | "lbs";
const KG_TO_LB = 2.20462;

// ---------- local settings (per device) ----------
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function writeSetting<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
  listeners.forEach((l) => l());
}
function useSetting<T>(key: string, fallback: T): T {
  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key),
    () => null,
  );
  return raw == null ? fallback : (JSON.parse(raw) as T);
}
export const useUnit = () => useSetting<Unit>("zenkai.unit", "kg");
export const useRestDefault = () => useSetting<number>("zenkai.rest", 90);

export function toDisplay(kg: number, unit: Unit) {
  const v = unit === "kg" ? kg : kg * KG_TO_LB;
  return Math.round(v * 10) / 10;
}
export function fromDisplay(v: number, unit: Unit) {
  return unit === "kg" ? v : v / KG_TO_LB;
}
export function fmtW(kg: number, unit: Unit) {
  return `${toDisplay(kg, unit)}`;
}

export const epley = (w: number, r: number) => (r <= 1 ? w : w * (1 + r / 30));

export function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

export async function getUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export function weekStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  return x;
}
