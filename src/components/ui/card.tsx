import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("rounded-lg border border-line bg-white p-4 shadow-sm", className)} {...props} />;
}

export function StatCard({ label, value, detail, className }: { label: string; value: string; detail?: string; className?: string }) {
  return (
    <Card className={cn("space-y-1", className)}>
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="text-2xl font-bold tracking-normal text-foreground">{value}</p>
      {detail ? <p className="text-xs text-neutral-500">{detail}</p> : null}
    </Card>
  );
}
