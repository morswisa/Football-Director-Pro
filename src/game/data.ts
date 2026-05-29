import type { Achievement, ManagerStyle, Personality, Position } from "./types";

export const positions: Position[] = ["G", "D", "D", "D", "D", "M", "M", "M", "M", "M", "M", "F", "F", "F", "F", "G", "D", "M"];

export const firstNames = [
  "James",
  "Marcus",
  "Elliot",
  "Daniel",
  "Oliver",
  "Noah",
  "Harry",
  "Lewis",
  "Adam",
  "Ryan",
  "Theo",
  "Ben",
  "Mason",
  "Callum",
  "Ethan",
  "Jack",
  "Luke",
  "Nathan",
];

export const lastNames = [
  "Walker",
  "King",
  "Thompson",
  "Davies",
  "Cooper",
  "Hughes",
  "Young",
  "Howard",
  "Morgan",
  "Clarke",
  "Reed",
  "Parker",
  "Bennett",
  "Foster",
  "Hayes",
  "Carter",
  "Morris",
  "Ellis",
];

export const clubPrefixes = [
  "Sunnyvale",
  "Greenfield",
  "Redbridge",
  "Ashford",
  "Kingsport",
  "Northgate",
  "Lakeside",
  "Fairview",
  "Oakwell",
  "Brookmere",
  "Hillcrest",
  "Westhaven",
  "Stoneford",
  "Riverton",
  "Eastbury",
  "Crownford",
  "Mapleton",
  "Ironvale",
  "Southmere",
  "Clearwater",
];

export const clubSuffixes = ["FC", "United", "Town", "City", "Athletic", "Rovers", "Albion", "County"];

export const divisionNames = [
  "Premier Division",
  "Championship Division",
  "National Division",
  "League One",
  "League Two",
  "Regional League",
  "Foundation League",
];

export const personalities: Personality[] = ["Winner", "Builder", "Pragmatist", "Maverick", "Mentor"];
export const managerStyles: ManagerStyle[] = ["Attacking", "Balanced", "Defensive"];

export const starterAchievements: Achievement[] = [
  { id: "first_win", title: "First Win", description: "Win your first match.", progress: 0, target: 1 },
  { id: "profit_month", title: "In The Black", description: "End a week with positive profit.", progress: 0, target: 1 },
  { id: "stadium_upgrade", title: "Concrete Plans", description: "Upgrade any stadium stand.", progress: 0, target: 1 },
  { id: "promotion", title: "Going Up", description: "Win promotion.", progress: 0, target: 1 },
  { id: "youth_debut", title: "Academy Pathway", description: "Promote a youth player.", progress: 0, target: 1 },
  { id: "cup_run", title: "Cup Glory", description: "Win the Chairman's Cup.", progress: 0, target: 1 },
];
