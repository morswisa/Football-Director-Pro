import { Shield } from "lucide-react";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div className={`grid place-items-center rounded-[1.4rem] border border-emerald-200 bg-gradient-to-br from-emerald-500 to-emerald-800 text-white shadow-lg ${className}`}>
      <Shield size={42} strokeWidth={2.4} />
    </div>
  );
}
