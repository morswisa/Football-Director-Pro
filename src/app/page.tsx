import Link from "next/link";
import { FolderOpen, Play, Settings, Trophy } from "lucide-react";
import { AppFrame } from "@/components/app-frame";
import { BrandMark } from "@/components/brand-mark";

export default function Home() {
  return (
    <AppFrame>
      <div className="flex flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,_#ffffff,_#f5f8f4)]">
        <div className="relative px-7 pt-12 text-center">
          <div className="absolute inset-x-8 top-7 h-24 rounded-[2rem] border border-emerald-100 bg-[linear-gradient(135deg,_#eef8f0,_#edf4ff)]" />
          <BrandMark className="relative mx-auto h-28 w-28 shadow-[0_18px_38px_rgba(16,36,27,0.18)]" />
          <h1 className="mt-7 text-3xl font-black tracking-normal">Football Director Pro</h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-neutral-500">
            Build a club as chairman. Hire the manager, fund the future, and chase one more season.
          </p>
        </div>
        <div className="mt-10 space-y-3 bg-[linear-gradient(180deg,_transparent,_#e8f0ea)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
          <MenuLink href="/new-game" icon={FolderOpen} title="Create Club" detail="Start a new chairman career" primary />
          <MenuLink href="/game" icon={Play} title="Continue" detail="Open latest local career" />
          <MenuLink href="/load-game" icon={Trophy} title="Load Game" detail="Choose a save slot" />
          <MenuLink href="/game" icon={Settings} title="Settings" detail="Available in career screen" />
        </div>
      </div>
    </AppFrame>
  );
}

function MenuLink({ href, icon: Icon, title, detail, primary = false }: { href: string; icon: typeof Play; title: string; detail: string; primary?: boolean }) {
  return (
    <Link href={href} className={`flex min-h-16 items-center gap-3 rounded-lg border px-4 py-3 transition ${primary ? "border-primary bg-[linear-gradient(180deg,_#1aa24f,_#0f8139)] text-white shadow-[0_12px_24px_rgba(21,153,71,0.22)]" : "border-line bg-white text-foreground shadow-[0_8px_18px_rgba(23,33,27,0.05)] hover:bg-surface-muted"}`}>
      <span className={`grid h-10 w-10 place-items-center rounded-lg ${primary ? "bg-white/15" : "bg-emerald-50 text-primary"}`}>
        <Icon size={22} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{title}</span>
        <span className={`block text-xs ${primary ? "text-white/80" : "text-neutral-500"}`}>{detail}</span>
      </span>
    </Link>
  );
}
