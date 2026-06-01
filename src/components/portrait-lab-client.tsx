"use client";

import { PersonAvatar } from "./person-avatar";

const portraitSamples = [
  "Daniel Foster",
  "Nathan Davis",
  "Marco Bennett",
  "Lewis Carter",
  "Owen Hughes",
  "Elliot Thompson",
  "Samir Clarke",
  "Jonas Ellis",
  "Kian Morgan",
  "Rafael Turner",
  "Mason Cooper",
  "Jack King",
  "Noah Walker",
  "Tariq Howard",
  "Viktor Goddard",
  "Cillian Walsh",
  "Ben Parker",
  "Aaron Price",
  "Isaac Palmer",
  "Leo Brooks",
  "Theo Fisher",
  "Adam Cole",
  "Max Spencer",
  "Felix Grant",
  "James Wilson",
  "Gareth Morris",
  "Patrick Shaw",
  "Neil Hamilton",
  "Simon Reeves",
  "Craig Foster",
  "Martin Doyle",
  "Ross Bennett",
  "Adrian Hayes",
  "Colin Fraser",
  "Darren Blake",
  "Ewan Knight",
];

export function PortraitLabClient() {
  return (
    <main className="min-h-screen bg-[#09140f] px-4 py-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-3xl border border-white/10 bg-[linear-gradient(135deg,#123424,#0b6a34_55%,#0e2437)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-100/75">Internal visual audit</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Portrait Lab</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/72">
            Seeded player and manager portraits rendered together to judge variety, maturity, lighting, and card-scale readability.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {portraitSamples.map((name, index) => {
            const isManager = index >= 24;
            const position = ["G", "D", "M", "F"][index % 4];
            return (
              <article key={name} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_18px_36px_rgba(0,0,0,0.25)]">
                <PersonAvatar
                  name={name}
                  seedKey={`portrait-lab-${index}-${name}`}
                  kind={isManager ? "manager" : "player"}
                  variant="portrait"
                  className="h-44 w-full rounded-none border-0 bg-transparent shadow-none"
                />
                <div className="border-t border-white/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-black">{name}</p>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-emerald-950">
                      {isManager ? "MGR" : position}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">Seed {index + 1}</p>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
