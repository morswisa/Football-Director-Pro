import { monthForWeek, seasonLabel } from "../game/calendar";
import type { GameEventType, GameSave } from "../game/types";

export function eventCategory(type: GameEventType) {
  if (["match_preview", "match_result"].includes(type)) return "Match day";
  if (["financial_report", "bank_warning", "transfer_budget"].includes(type)) return "Club finance";
  if (["contract_offer", "contract_response", "incoming_bid", "sale_ready", "sale_confirmed"].includes(type)) return "Squad business";
  if (["manager_frustrated", "manager_retirement_hint", "manager_contract_decision"].includes(type)) return "Manager office";
  if (["youth_contract", "youth_promoted"].includes(type)) return "Academy";
  if (["season_intro", "season_summary", "transfer_window_open", "average_crowd_report"].includes(type)) return "Season desk";
  if (type === "hall_of_fame") return "Club legacy";
  return "Club update";
}

export function eventToneClasses(variant?: "positive" | "negative" | "neutral") {
  if (variant === "negative") {
    return {
      header: "bg-[linear-gradient(135deg,_#331116,_#9f1d32)] text-white",
      chip: "bg-white/14 text-white ring-white/20",
      accent: "bg-red-50 text-danger ring-red-100",
    };
  }
  if (variant === "positive") {
    return {
      header: "bg-[linear-gradient(135deg,_#10241b,_#108842_60%,_#2bbf64)] text-white",
      chip: "bg-white/14 text-white ring-white/20",
      accent: "bg-emerald-50 text-primary ring-emerald-100",
    };
  }
  return {
    header: "bg-[linear-gradient(135deg,_#10241b,_#155f3a_58%,_#295e9c)] text-white",
    chip: "bg-white/14 text-white ring-white/20",
    accent: "bg-surface-muted text-neutral-700 ring-line",
  };
}

export function buildEventPresentation(save: GameSave) {
  const event = save.currentEvent;
  if (!event) return undefined;
  const hasContractProposal = event.type === "contract_offer" && Boolean(event.proposal);
  return {
    category: eventCategory(event.type),
    statusLabel: event.requiresDecision ? "Decision required" : event.type === "match_preview" ? "Match choice" : "Club update",
    periodLabel: `${seasonLabel(save.season)} · ${monthForWeek(event.createdWeek || save.week)} · Period ${event.createdWeek || save.week}`,
    queueLabel: save.eventQueue.length > 0 ? `${save.eventQueue.length} queued` : "Current item",
    showEventNote: Boolean(event.note && event.type !== "season_summary" && !hasContractProposal),
    tone: eventToneClasses(event.variant),
  };
}
