import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home, ListChecks, Dumbbell, TrendingUp, Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Layout,
});

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/routines", label: "Routines", icon: ListChecks },
  { to: "/workout", label: "Train", icon: Dumbbell },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Layout() {
  return (
    <div className="mx-auto min-h-screen max-w-lg pb-24">
      <Outlet />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {tabs.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 py-3 text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="h-5 w-5" />
              <span className="font-display text-xs font-bold uppercase tracking-wider">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
