import Link from "next/link";
import { FolderOpen, Play, Settings, Trophy } from "lucide-react";
import { AppFrame } from "@/components/app-frame";
import { BrandMark } from "@/components/brand-mark";

export default function Home() {
  return (
    <AppFrame>
      <div className="flex flex-1 flex-col justify-between bg-white">
        <div className="px-7 pt-16 text-center">
          <BrandMark className="mx-auto h-32 w-32" />
          <h1 className="mt-8 text-3xl font-black tracking-normal">Football Director Pro</h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-neutral-500">
            Build a club as chairman. Hire the manager, fund the future, and chase one more season.
          </p>
        </div>
        <div className="space-y-3 bg-[linear-gradient(180deg,_transparent,_#edf3ee)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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
    <Link href={href} className={`flex min-h-16 items-center gap-3 rounded-lg border px-4 py-3 transition ${primary ? "border-primary bg-primary text-white shadow-sm" : "border-line bg-white text-foreground hover:bg-surface-muted"}`}>
      <Icon size={22} />
      <span className="min-w-0">
        <span className="block text-sm font-bold">{title}</span>
        <span className={`block text-xs ${primary ? "text-white/80" : "text-neutral-500"}`}>{detail}</span>
      </span>
    </Link>
  );
}
