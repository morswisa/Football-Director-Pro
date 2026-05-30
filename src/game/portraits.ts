export type PortraitKind = "player" | "manager";
export type PortraitVariant = "thumb" | "portrait";

export interface FaceGenome {
  version: 1;
  seed: number;
  seedKey: string;
  kind: PortraitKind;
  variant: PortraitVariant;
  palette: {
    skin: string;
    skinLight: string;
    skinMid: string;
    skinShadow: string;
    hair: string;
    hairLight: string;
    shirt: string;
    accent: string;
    bgHue: number;
  };
  geometry: {
    faceShape: "blade" | "square" | "narrow" | "heavy";
    portraitArchetype: "athletic" | "angular" | "veteran" | "lean" | "broad";
    jawStyle: "chiselled" | "soft-square" | "pointed" | "wide";
    earStyle: "low" | "sharp" | "round";
    headTilt: number;
    mirror: boolean;
  };
  hair: {
    style: "undercut" | "swept" | "textured" | "spikes" | "tight" | "fringe";
    hairlineStyle: "low" | "widow" | "receding" | "broken" | "straight";
    texture: "chunky" | "wispy" | "crop" | "wet" | "brush";
    volume: "flat" | "crest" | "messy" | "slick";
    depth: "temple-fade" | "forelock" | "crown" | "taper";
  };
  face: {
    eyeY: number;
    browTilt: number;
    noseX: number;
    mouthY: number;
    eyeStyle: "focused" | "narrow" | "round" | "heavy" | "wide";
    browStyle: "straight" | "arched" | "low" | "split" | "severe";
    noseStyle: "straight" | "hook" | "wide" | "sharp" | "flat";
    mouthStyle: "flat" | "pressed" | "smirk" | "downturn" | "soft";
    cheekStyle: "blade" | "soft" | "hollow" | "high";
    expressionAsymmetry: "left" | "right" | "center";
    facePlaneStyle: "hard-left" | "hard-right" | "center-ridge" | "soft-mask";
    eyeSpread: number;
    underEyeDepth: "clean" | "tired" | "sharp" | "heavy";
    highlightBias: "temple" | "cheek" | "nose" | "jaw";
    lightAngle: "left" | "front" | "right";
  };
  details: {
    facialHairStyle: "clean" | "stubble" | "beard" | "moustache" | "goatee";
    hasStubble: boolean;
    hasBeard: boolean;
    hasMoustache: boolean;
    hasGlasses: boolean;
    hasScar: boolean;
    hasAgeLines: boolean;
    hasSideburns: boolean;
    jerseyStripe: boolean;
  };
}

export function faceGenomeSeed(value: string) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(seed: number, values: readonly T[], offset = 0) {
  return values[Math.abs(seed + offset * 2654435761) % values.length];
}

function range(seed: number, min: number, max: number, offset = 0) {
  return min + (Math.abs(seed + offset * 1103515245) % (max - min + 1));
}

export function createFaceGenome(input: { name: string; seedKey?: string; kind?: PortraitKind; variant?: PortraitVariant }): FaceGenome {
  const kind = input.kind ?? "player";
  const variant = input.variant ?? "thumb";
  const seedKey = input.seedKey ?? input.name;
  const seed = faceGenomeSeed(seedKey);
  const facialHairStyle = kind === "manager"
    ? pick(seed, ["stubble", "beard", "moustache", "goatee", "clean"] as const, 23)
    : pick(seed, ["clean", "clean", "clean", "stubble", "stubble"] as const, 23);
  const hairStyle = pick(seed, ["undercut", "swept", "textured", "spikes", "tight", "fringe"] as const, 11);
  const portraitArchetype = pick(seed, ["athletic", "angular", "veteran", "lean", "broad"] as const, 24);

  return {
    version: 1,
    seed,
    seedKey,
    kind,
    variant,
    palette: {
      skin: pick(seed, ["#f1b889", "#d9966b", "#bd7855", "#95573e", "#e3a06f", "#c9865f"] as const, 1),
      skinLight: pick(seed, ["#ffd0a6", "#efb280", "#da8d62", "#b36c4b", "#f4bf91"] as const, 2),
      skinMid: pick(seed, ["#c87952", "#aa6044", "#87503b", "#70402f", "#b66e4b"] as const, 3),
      skinShadow: pick(seed, ["#7b3e30", "#633328", "#553025", "#8b4a35", "#49281f"] as const, 4),
      hair: pick(seed, ["#15100e", "#241711", "#352113", "#101827", "#4b2f1e", "#5c3a21"] as const, 5),
      hairLight: pick(seed, ["#5a351f", "#7a4b28", "#8a5d35", "#2d3a50", "#6b4327"] as const, 6),
      shirt: kind === "manager" ? pick(seed, ["#16221b", "#24313a", "#303946", "#123d2a"] as const, 7) : pick(seed, ["#138947", "#0f6f6e", "#2455b8", "#5527a8", "#1f3e8a", "#8f1734"] as const, 7),
      accent: pick(seed, ["#f8fafc", "#f5c542", "#2fe37f", "#8dc5ff", "#f97835", "#d8e1ef"] as const, 8),
      bgHue: range(seed, 145, 250, 9),
    },
    geometry: {
      faceShape: pick(seed, ["blade", "square", "narrow", "heavy"] as const, 10),
      portraitArchetype,
      jawStyle: pick(seed, ["chiselled", "soft-square", "pointed", "wide"] as const, 27),
      earStyle: pick(seed, ["low", "sharp", "round"] as const, 28),
      headTilt: range(seed, -4, 4, 16),
      mirror: seed % 2 === 0,
    },
    hair: {
      style: hairStyle,
      hairlineStyle: pick(seed, ["low", "widow", "receding", "broken", "straight"] as const, 22),
      texture: pick(seed, ["chunky", "wispy", "crop", "wet", "brush"] as const, 26),
      volume: pick(seed, ["flat", "crest", "messy", "slick"] as const, 30),
      depth: pick(seed, ["temple-fade", "forelock", "crown", "taper"] as const, 34),
    },
    face: {
      eyeY: range(seed, 43, 46, 12),
      browTilt: range(seed, -3, 3, 13),
      noseX: range(seed, 54, 59, 14),
      mouthY: range(seed, 64, 67, 15),
      eyeStyle: pick(seed, ["focused", "narrow", "round", "heavy", "wide"] as const, 17),
      browStyle: pick(seed, ["straight", "arched", "low", "split", "severe"] as const, 18),
      noseStyle: pick(seed, ["straight", "hook", "wide", "sharp", "flat"] as const, 19),
      mouthStyle: pick(seed, ["flat", "pressed", "smirk", "downturn", "soft"] as const, 20),
      cheekStyle: pick(seed, ["blade", "soft", "hollow", "high"] as const, 21),
      expressionAsymmetry: pick(seed, ["left", "right", "center"] as const, 31),
      facePlaneStyle: pick(seed, ["hard-left", "hard-right", "center-ridge", "soft-mask"] as const, 32),
      eyeSpread: range(seed, -2, 3, 33),
      underEyeDepth: pick(seed, ["clean", "tired", "sharp", "heavy"] as const, 35),
      highlightBias: pick(seed, ["temple", "cheek", "nose", "jaw"] as const, 29),
      lightAngle: pick(seed, ["left", "front", "right"] as const, 25),
    },
    details: {
      facialHairStyle,
      hasStubble: facialHairStyle === "stubble" || facialHairStyle === "beard" || facialHairStyle === "goatee",
      hasBeard: facialHairStyle === "beard",
      hasMoustache: facialHairStyle === "moustache" || facialHairStyle === "goatee" || facialHairStyle === "beard",
      hasGlasses: kind === "manager" && seed % 6 === 0,
      hasScar: seed % 17 === 0,
      hasAgeLines: kind === "manager" || portraitArchetype === "veteran" || seed % 11 === 0,
      hasSideburns: hairStyle === "undercut" || hairStyle === "tight" || seed % 5 === 0,
      jerseyStripe: seed % 3 === 0,
    },
  };
}
