const seasonMonths = [
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
  "April",
  "May",
];

export function monthForWeek(week: number) {
  const index = Math.min(seasonMonths.length - 1, Math.max(0, Math.floor((week - 1) / 4)));
  return seasonMonths[index];
}

export function isTransferWindow(week: number) {
  const month = monthForWeek(week);
  return month === "August" || month === "January";
}

export function seasonLabel(season: number) {
  return `${season}/${String(season + 1).slice(2)}`;
}

export function seasonPrize(level: number, position: number) {
  if (level === 1) return 88_000_000 + Math.max(1, 21 - position) * 3_200_000;
  if (level === 2) return 11_000_000 + (position <= 3 ? 3_000_000 : 0);
  if (level === 3) return 2_000_000 + (position <= 3 ? 500_000 : 0);
  if (level === 4) return 1_500_000 + (position <= 3 ? 350_000 : 0);
  return Math.max(150_000, 1_200_000 - level * 125_000 + Math.max(0, 21 - position) * 12_000);
}

export function nextUpgradeCost(level: number, base: number) {
  return Math.round(base * Math.pow(1.08, Math.max(1, level)));
}
