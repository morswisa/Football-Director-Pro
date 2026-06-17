import type { ReactNode } from "react";

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <main className="h-[100svh] overflow-hidden bg-[linear-gradient(145deg,_#e3f0e6_0%,_#f5f7f3_38%,_#eaf0fb_100%)] text-foreground sm:p-4">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col overflow-hidden bg-background shadow-[0_28px_80px_rgba(16,36,27,0.22)] sm:rounded-[2rem] sm:border sm:border-emerald-950/10">
        {children}
      </div>
    </main>
  );
}
