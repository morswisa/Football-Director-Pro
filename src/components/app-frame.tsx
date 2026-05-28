import type { ReactNode } from "react";

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <main className="h-svh overflow-hidden bg-[radial-gradient(circle_at_top,_#dfeee2,_#f4f7f2_42%,_#e8efe9)] text-foreground sm:p-4">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col overflow-hidden bg-background shadow-2xl sm:rounded-[2rem] sm:border sm:border-emerald-950/10">
        {children}
      </div>
    </main>
  );
}
