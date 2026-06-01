"use client";

import { useId } from "react";
import { createFaceGenome } from "@/game/portraits";
import { cn } from "@/lib/utils";

export function PersonAvatar({ name, seedKey, kind = "player", variant = "thumb", className }: { name: string; seedKey?: string; kind?: "player" | "manager"; variant?: "thumb" | "portrait"; className?: string }) {
  const genome = createFaceGenome({ name, seedKey, kind, variant });
  const {
    seed,
    palette: { skin, skinLight, skinMid, skinShadow, hair, hairLight, shirt, accent, bgHue },
    geometry: { faceShape, portraitArchetype, jawStyle, earStyle, headTilt, mirror },
    hair: { style: hairStyle, hairlineStyle, texture: hairTexture, volume: hairVolume, depth: hairDepth },
    face: { eyeY, browTilt, noseX, mouthY, eyeStyle, browStyle, noseStyle, mouthStyle, cheekStyle, expressionAsymmetry, facePlaneStyle, eyeSpread, underEyeDepth, highlightBias, lightAngle },
    details: { facialHairStyle, hasStubble, hasBeard, hasMoustache, hasGlasses, hasScar, hasAgeLines, hasSideburns, jerseyStripe },
  } = genome;
  const reactId = useId().replaceAll(":", "");
  const id = `avatar-${reactId}-${seed}`;
  const isPortrait = variant === "portrait";
  const viewHeight = isPortrait ? 130 : 100;
  const faceInk = "#342018";
  const baseFacePath = faceShape === "square"
    ? "M34 38 C36 25 50 18 65 24 C75 29 78 43 74 57 L69 68 L59 77 L45 76 L36 66 C31 57 30 45 34 38 Z"
    : faceShape === "narrow"
      ? "M39 36 C41 22 55 18 67 27 C77 35 75 51 69 65 C63 79 48 80 40 68 C34 59 34 45 39 36 Z"
      : faceShape === "heavy"
        ? "M33 39 C34 25 52 17 68 26 C78 34 78 52 70 66 L60 78 L43 75 L34 64 C29 54 29 44 33 39 Z"
        : "M36 37 C39 24 53 18 66 25 C76 32 76 50 69 64 C63 76 49 80 39 69 C32 58 32 45 36 37 Z";
  const archetypeFacePath = portraitArchetype === "angular"
    ? "M38 34 C42 22 56 17 68 24 L76 37 L72 56 L64 71 L51 80 L39 68 L34 52 Z"
    : portraitArchetype === "veteran"
      ? "M34 38 C35 25 51 18 67 25 C79 34 78 53 70 67 L60 78 L45 77 L35 65 C30 55 30 45 34 38 Z"
      : portraitArchetype === "lean"
        ? "M40 34 C43 21 56 18 67 28 C76 37 74 53 68 66 C62 80 49 82 41 68 C35 58 35 44 40 34 Z"
        : portraitArchetype === "broad"
          ? "M32 39 C34 25 52 17 69 25 C79 33 80 51 72 66 L61 78 L43 76 L34 65 C29 55 28 45 32 39 Z"
          : baseFacePath;
  const jawPlanePath = jawStyle === "wide"
    ? "M37 61 C45 73 59 75 70 61 L65 74 L52 81 L39 73 Z"
    : jawStyle === "pointed"
      ? "M40 61 C45 72 52 80 62 67 C59 76 51 82 44 73 Z"
      : jawStyle === "soft-square"
        ? "M36 62 C43 72 58 76 68 64 L62 76 L47 78 L38 70 Z"
        : "M37 60 L49 76 L63 70 L69 59 L63 76 L49 80 L39 69 Z";
  const leftEarPath = earStyle === "sharp"
    ? "M31 49 C23 47 24 63 35 64 C30 59 31 54 31 49 Z"
    : earStyle === "round"
      ? "M32 49 C25 49 25 62 34 64 C31 60 31 54 32 49 Z"
      : "M31 51 C25 52 26 62 34 62 C31 58 31 54 31 51 Z";
  const rightEarPath = earStyle === "sharp"
    ? "M70 47 C78 46 79 61 68 64 C73 58 72 52 70 47 Z"
    : earStyle === "round"
      ? "M69 48 C77 49 77 61 68 64 C71 59 72 53 69 48 Z"
      : "M69 50 C76 51 76 61 68 62 C72 58 72 54 69 50 Z";
  const hairPath = hairStyle === "undercut"
    ? "M32 39 C35 22 52 16 70 25 L76 35 C62 30 49 32 35 43 Z"
    : hairStyle === "swept"
      ? "M30 41 C34 20 60 12 77 29 C62 24 52 35 34 45 Z"
      : hairStyle === "textured"
        ? "M31 41 C31 27 38 20 45 22 C49 15 60 16 65 24 C71 22 77 30 75 41 C60 32 46 35 31 41 Z"
        : hairStyle === "tight"
          ? "M36 36 C40 24 57 20 70 29 C59 26 47 29 36 38 Z"
          : hairStyle === "fringe"
            ? "M31 39 C33 23 49 16 66 22 C74 26 78 33 75 42 C63 34 55 45 43 39 C39 48 34 48 31 39 Z"
            : "M30 42 C32 26 39 20 46 22 L50 13 L57 25 L66 17 L75 32 C61 28 47 35 30 42 Z";
  const archetypeHairPath = portraitArchetype === "angular"
    ? "M30 42 C32 24 43 16 55 18 C62 14 74 22 79 33 C65 29 55 33 45 38 C39 42 34 45 30 42 Z"
    : portraitArchetype === "veteran"
      ? "M34 38 C38 25 52 20 66 26 C72 29 76 34 75 42 C61 33 48 35 36 42 Z"
      : portraitArchetype === "lean"
        ? "M34 40 C35 24 51 15 66 23 C76 29 78 37 73 45 C61 35 49 36 36 44 Z"
        : portraitArchetype === "broad"
          ? "M30 42 C32 25 47 15 66 20 C77 24 82 33 78 43 C62 32 47 33 31 45 Z"
          : hairPath;
  const hairVolumePath = hairVolume === "crest"
    ? "M39 31 C43 18 55 12 67 19 C72 22 76 28 78 36 C68 26 57 27 48 32 Z"
    : hairVolume === "messy"
      ? "M34 38 L42 23 L48 34 L55 16 L61 33 L72 22 L77 39 C62 31 48 35 34 38 Z"
      : hairVolume === "slick"
        ? "M34 38 C44 24 60 22 76 35 C61 31 48 34 36 42 Z"
        : "M35 37 C44 29 59 28 73 37 C58 34 47 35 35 41 Z";
  const hairShadowPath = hairVolume === "slick"
    ? "M35 39 C49 33 63 33 76 41 L72 48 C60 39 48 39 36 45 Z"
    : "M33 40 C45 34 60 34 76 42 C61 37 48 39 35 47 Z";
  const eyeLeft = 46 - Math.max(eyeSpread, 0) + Math.min(eyeSpread, 0);
  const eyeRight = 64 + Math.max(eyeSpread, 0) - Math.min(eyeSpread, 0);
  const leftEyePath = eyeStyle === "round"
    ? `M${eyeLeft - 5} ${eyeY} Q${eyeLeft - 1} ${eyeY - 4} ${eyeLeft + 6} ${eyeY} Q${eyeLeft - 1} ${eyeY + 2} ${eyeLeft - 5} ${eyeY}`
    : eyeStyle === "wide"
      ? `M${eyeLeft - 7} ${eyeY} Q${eyeLeft - 1} ${eyeY - 3} ${eyeLeft + 7} ${eyeY - 0.5}`
      : eyeStyle === "heavy"
        ? `M${eyeLeft - 6} ${eyeY - 1} Q${eyeLeft - 1} ${eyeY + 2} ${eyeLeft + 6} ${eyeY - 1}`
        : eyeStyle === "narrow"
          ? `M${eyeLeft - 6} ${eyeY + 1} Q${eyeLeft - 1} ${eyeY - 1} ${eyeLeft + 6} ${eyeY + 0.5}`
          : `M${eyeLeft - 5} ${eyeY} Q${eyeLeft - 1} ${eyeY - 2.5} ${eyeLeft + 5} ${eyeY}`;
  const rightEyePath = eyeStyle === "round"
    ? `M${eyeRight - 5} ${eyeY + 1} Q${eyeRight} ${eyeY - 3} ${eyeRight + 6} ${eyeY + 1} Q${eyeRight} ${eyeY + 3} ${eyeRight - 5} ${eyeY + 1}`
    : eyeStyle === "wide"
      ? `M${eyeRight - 7} ${eyeY + 1} Q${eyeRight} ${eyeY - 2} ${eyeRight + 7} ${eyeY + 0.5}`
      : eyeStyle === "heavy"
        ? `M${eyeRight - 6} ${eyeY} Q${eyeRight} ${eyeY + 3} ${eyeRight + 6} ${eyeY}`
        : eyeStyle === "narrow"
          ? `M${eyeRight - 6} ${eyeY + 2} Q${eyeRight} ${eyeY} ${eyeRight + 6} ${eyeY + 1.5}`
        : `M${eyeRight - 5} ${eyeY + 1} Q${eyeRight} ${eyeY - 1.5} ${eyeRight + 5} ${eyeY + 1}`;
  const leftEyeFillPath = `M${eyeLeft - 6} ${eyeY} Q${eyeLeft} ${eyeY - 3.4} ${eyeLeft + 7} ${eyeY} Q${eyeLeft} ${eyeY + 2.2} ${eyeLeft - 6} ${eyeY} Z`;
  const rightEyeFillPath = `M${eyeRight - 6} ${eyeY + 1} Q${eyeRight} ${eyeY - 2.4} ${eyeRight + 7} ${eyeY + 1} Q${eyeRight} ${eyeY + 3.1} ${eyeRight - 6} ${eyeY + 1} Z`;
  const leftBrowPath = browStyle === "arched"
    ? `M${eyeLeft - 8} ${eyeY - 7 + browTilt} Q${eyeLeft - 1} ${eyeY - 13} ${eyeLeft + 8} ${eyeY - 8}`
    : browStyle === "low"
      ? `M${eyeLeft - 8} ${eyeY - 5 + browTilt} Q${eyeLeft - 1} ${eyeY - 7} ${eyeLeft + 8} ${eyeY - 5}`
      : browStyle === "split"
        ? `M${eyeLeft - 8} ${eyeY - 8 + browTilt} L${eyeLeft - 1} ${eyeY - 10} M${eyeLeft + 2} ${eyeY - 9} L${eyeLeft + 8} ${eyeY - 7}`
        : browStyle === "severe"
          ? `M${eyeLeft - 8} ${eyeY - 9 + browTilt} L${eyeLeft + 8} ${eyeY - 5}`
          : `M${eyeLeft - 7} ${eyeY - 7 + browTilt} Q${eyeLeft - 1} ${eyeY - 10} ${eyeLeft + 6} ${eyeY - 7}`;
  const rightBrowPath = browStyle === "arched"
    ? `M${eyeRight - 8} ${eyeY - 6 - browTilt} Q${eyeRight} ${eyeY - 12} ${eyeRight + 8} ${eyeY - 6}`
    : browStyle === "low"
      ? `M${eyeRight - 8} ${eyeY - 4 - browTilt} Q${eyeRight} ${eyeY - 6} ${eyeRight + 8} ${eyeY - 4}`
      : browStyle === "split"
        ? `M${eyeRight - 8} ${eyeY - 7 - browTilt} L${eyeRight - 1} ${eyeY - 9} M${eyeRight + 2} ${eyeY - 8} L${eyeRight + 8} ${eyeY - 6}`
        : browStyle === "severe"
          ? `M${eyeRight - 8} ${eyeY - 5 - browTilt} L${eyeRight + 8} ${eyeY - 9}`
          : `M${eyeRight - 6} ${eyeY - 6 - browTilt} Q${eyeRight} ${eyeY - 9} ${eyeRight + 6} ${eyeY - 5}`;
  const nosePath = noseStyle === "hook"
    ? `M${noseX - 1} 43 C${noseX + 5} 50 ${noseX + 2} 57 ${noseX + 8} 61`
    : noseStyle === "wide"
      ? `M${noseX - 2} 43 C${noseX + 1} 51 ${noseX - 5} 57 ${noseX + 3} 61`
      : noseStyle === "sharp"
        ? `M${noseX + 1} 43 L${noseX - 3} 58 L${noseX + 5} 60`
        : noseStyle === "flat"
          ? `M${noseX - 2} 44 C${noseX + 1} 51 ${noseX - 1} 56 ${noseX + 4} 59`
          : `M${noseX} 43 C${noseX + 3} 50 ${noseX - 3} 56 ${noseX + 4} 60`;
  const nostrilPath = noseStyle === "wide"
    ? `M${noseX - 4} 61 C${noseX - 1} 63 ${noseX + 5} 63 ${noseX + 9} 60`
    : `M${noseX - 1} 60 C${noseX + 2} 62 ${noseX + 5} 62 ${noseX + 7} 60`;
  const mouthPath = mouthStyle === "smirk"
    ? `M43 ${mouthY} C50 ${mouthY + 1} 59 ${mouthY} 66 ${mouthY - 2}`
    : mouthStyle === "downturn"
      ? `M44 ${mouthY - 1} C51 ${mouthY - 3} 59 ${mouthY - 2} 65 ${mouthY + 2}`
    : mouthStyle === "pressed"
      ? `M44 ${mouthY} L64 ${mouthY - 1}`
    : mouthStyle === "soft"
      ? `M45 ${mouthY} C51 ${mouthY + 1} 59 ${mouthY + 1} 65 ${mouthY - 1}`
      : `M44 ${mouthY} C50 ${mouthY + 1} 58 ${mouthY} 64 ${mouthY - 1}`;
  const lowerLipPath = mouthStyle === "pressed"
    ? `M48 ${mouthY + 3} C53 ${mouthY + 4} 59 ${mouthY + 4} 63 ${mouthY + 2}`
    : `M48 ${mouthY + 4} C53 ${mouthY + 6} 59 ${mouthY + 5} 63 ${mouthY + 2}`;
  const cheekPath = cheekStyle === "high"
    ? "M39 55 C45 50 51 50 58 54"
    : cheekStyle === "hollow"
      ? "M38 58 C45 64 56 63 64 56"
      : cheekStyle === "soft"
        ? "M40 57 C47 60 56 59 63 56"
        : "M38 56 L58 53 L67 59";
  const hairlinePath = hairlineStyle === "widow"
    ? "M38 37 C45 29 50 39 56 31 C62 28 68 31 74 38"
    : hairlineStyle === "receding"
      ? "M36 36 C43 28 49 33 56 28 C64 27 70 32 75 39"
      : hairlineStyle === "broken"
        ? "M34 38 C39 31 45 35 49 30 C53 36 58 29 64 31 C69 33 72 36 75 41"
        : hairlineStyle === "straight"
          ? "M34 37 C45 31 62 31 75 38"
          : "M34 39 C44 26 62 26 75 39";
  const hairStrands = hairTexture === "wet"
    ? [
      "M38 34 C43 25 50 25 56 30",
      "M46 29 C51 20 59 22 64 30",
      "M57 31 C63 26 70 29 73 36",
    ]
    : hairTexture === "wispy"
      ? [
        "M34 38 C39 29 43 25 47 22",
        "M43 31 C48 24 52 20 57 18",
        "M58 29 C66 25 72 28 77 34",
      ]
      : hairTexture === "crop"
        ? [
          "M37 34 L47 27",
          "M47 30 L57 25",
          "M58 30 L70 28",
        ]
        : hairTexture === "brush"
          ? [
            "M35 39 C43 29 54 25 66 26",
            "M41 33 C51 25 62 23 74 31",
            "M49 29 C58 23 68 24 76 35",
          ]
          : [
            "M35 37 L45 25 L50 34",
            "M47 30 L56 19 L60 34",
            "M60 31 L72 24 L71 38",
          ];
  const portraitTransform = mirror ? "translate(100 0) scale(-1 1)" : undefined;
  const portraitZoom = isPortrait ? "translate(-3 -5) scale(1.07)" : "";
  const archetypeTransform = portraitArchetype === "broad"
    ? "translate(-2 -1) scale(1.08 0.99)"
    : portraitArchetype === "lean"
      ? "translate(3 0) scale(0.94 1.06)"
      : portraitArchetype === "angular"
        ? "translate(1 -1) scale(1.02 1.02)"
        : portraitArchetype === "veteran"
          ? "translate(-1 1) scale(1.04 1)"
          : "translate(0 0) scale(1 1)";
  const keyLightPath = lightAngle === "right"
    ? "M55 29 C70 35 73 54 63 70 C67 57 66 41 55 29 Z"
    : lightAngle === "front"
      ? "M43 34 C50 28 60 29 66 39 C60 36 50 36 43 44 Z"
      : "M38 38 C41 30 50 26 61 27 C51 30 44 38 42 51 C40 59 42 66 47 72 C38 67 34 51 38 38 Z";
  const faceShadowPath = lightAngle === "right"
    ? "M36 42 C39 60 48 72 63 75 C48 81 35 70 32 55 C30 48 31 43 36 42 Z"
    : "M60 28 C74 34 78 52 69 67 C64 74 58 77 49 76 C61 70 67 58 66 45 C66 37 64 32 60 28 Z";
  const templeShadowPath = portraitArchetype === "lean"
    ? "M37 38 C35 47 36 60 42 70 C35 63 32 49 37 38 Z"
    : portraitArchetype === "broad"
      ? "M33 42 C34 57 42 70 55 76 C43 76 33 66 31 54 Z"
      : portraitArchetype === "angular"
        ? "M35 42 L43 68 L52 79 L39 68 L33 52 Z"
        : "M36 43 C36 57 43 69 53 76 C42 74 34 62 34 50 Z";
  const cheekShadowPath = lightAngle === "right"
    ? "M36 50 C43 54 47 62 47 72 C39 68 34 60 33 51 Z"
    : "M62 49 C70 53 72 61 68 69 C63 66 59 58 58 52 Z";
  const hardFacePlanePath = facePlaneStyle === "hard-left"
    ? "M34 38 C39 48 42 61 50 76 C39 72 33 61 32 49 Z"
    : facePlaneStyle === "hard-right"
      ? "M61 30 C72 38 75 55 66 70 C68 55 68 41 61 30 Z"
      : facePlaneStyle === "center-ridge"
        ? `M${noseX - 4} 39 C${noseX - 8} 50 ${noseX - 7} 61 ${noseX - 1} 72 C${noseX + 2} 62 ${noseX + 2} 49 ${noseX - 4} 39 Z`
        : "M39 45 C48 41 61 42 69 49 C61 47 51 48 41 53 Z";
  const foreheadPlanePath = highlightBias === "temple"
    ? "M39 36 C46 27 61 27 70 36 C61 34 49 35 39 41 Z"
    : "M43 35 C51 31 60 32 67 38 C59 38 50 38 43 43 Z";
  const underEyePlanePath = underEyeDepth === "clean"
    ? ""
    : underEyeDepth === "tired"
      ? `M${eyeLeft - 7} ${eyeY + 6} C${eyeLeft + 1} ${eyeY + 10} ${eyeLeft + 8} ${eyeY + 8} ${eyeLeft + 12} ${eyeY + 5} M${eyeRight - 8} ${eyeY + 7} C${eyeRight} ${eyeY + 11} ${eyeRight + 8} ${eyeY + 9} ${eyeRight + 12} ${eyeY + 6}`
      : underEyeDepth === "heavy"
        ? `M${eyeLeft - 7} ${eyeY + 4} C${eyeLeft} ${eyeY + 9} ${eyeLeft + 7} ${eyeY + 8} ${eyeLeft + 12} ${eyeY + 4} M${eyeRight - 9} ${eyeY + 5} C${eyeRight} ${eyeY + 10} ${eyeRight + 8} ${eyeY + 9} ${eyeRight + 12} ${eyeY + 5}`
        : `M${eyeLeft - 6} ${eyeY + 5} L${eyeLeft + 10} ${eyeY + 4} M${eyeRight - 7} ${eyeY + 6} L${eyeRight + 10} ${eyeY + 5}`;
  const castShadowPath = lightAngle === "right"
    ? `M${noseX - 2} 52 C${noseX - 8} 57 ${noseX - 8} 63 ${noseX - 1} 67`
    : `M${noseX + 4} 51 C${noseX + 11} 57 ${noseX + 10} 63 ${noseX + 3} 67`;
  const highlightPlanePath = highlightBias === "nose"
    ? `M${noseX - 1} 42 C${noseX + 2} 49 ${noseX} 55 ${noseX + 4} 59`
    : highlightBias === "jaw"
      ? "M45 70 C51 77 61 75 67 66"
      : highlightBias === "cheek"
        ? lightAngle === "right" ? "M55 48 C63 45 69 49 71 56" : "M39 47 C47 44 53 47 57 53"
        : "M39 38 C44 31 52 28 61 29";
  const eyeSocketPath = browStyle === "severe"
    ? "M38 42 C47 36 60 36 70 41 C61 45 48 47 38 42 Z"
    : "M39 43 C48 39 61 39 70 43 C61 47 49 48 39 43 Z";
  const neckTendonPath = kind === "manager"
    ? "M44 75 C45 87 41 97 34 111 M60 72 C59 88 64 99 72 113"
    : "M43 74 C46 88 43 101 38 116 M61 72 C59 89 64 101 69 116";
  const browShadowPath = browStyle === "severe"
    ? "M37 38 C46 32 62 32 72 39 L70 44 C60 40 48 40 39 44 Z"
    : "M38 39 C47 35 62 35 71 40 L69 45 C60 42 49 42 40 45 Z";
  const chinPlanePath = jawStyle === "pointed"
    ? "M47 72 C52 76 59 74 63 69 C61 78 50 81 44 73 Z"
    : "M42 70 C49 77 61 77 67 68 C65 77 50 82 40 72 Z";
  const sideburnPath = hasSideburns
    ? hairStyle === "tight"
      ? "M35 38 C33 47 34 54 37 59 L40 45 Z M70 37 C72 46 71 54 67 59 L64 44 Z"
      : "M34 39 C32 49 34 58 38 63 L41 43 Z M71 39 C74 49 72 58 67 63 L64 43 Z"
    : "";
  const skinMarkPaths = [
    `M${eyeLeft - 5} ${eyeY + 5} C${eyeLeft - 1} ${eyeY + 7} ${eyeLeft + 5} ${eyeY + 6} ${eyeLeft + 8} ${eyeY + 4}`,
    `M${eyeRight - 6} ${eyeY + 6} C${eyeRight - 1} ${eyeY + 8} ${eyeRight + 6} ${eyeY + 7} ${eyeRight + 8} ${eyeY + 5}`,
    "M43 37 C47 35 51 35 55 37",
  ];
  const asymmetricMouthPath = expressionAsymmetry === "left"
    ? `M43 ${mouthY + 0.5} C50 ${mouthY + 1.5} 58 ${mouthY} 65 ${mouthY - 1}`
    : expressionAsymmetry === "right"
      ? `M44 ${mouthY - 1} C51 ${mouthY} 59 ${mouthY + 1.5} 66 ${mouthY + 0.5}`
      : mouthPath;
  const mouthPlanePath = mouthStyle === "pressed"
    ? `M45 ${mouthY + 1} C51 ${mouthY + 4} 59 ${mouthY + 4} 65 ${mouthY} L63 ${mouthY + 6} C55 ${mouthY + 8} 48 ${mouthY + 6} 45 ${mouthY + 1} Z`
    : `M44 ${mouthY - 1} C51 ${mouthY + 5} 60 ${mouthY + 4} 67 ${mouthY - 2} C62 ${mouthY + 8} 49 ${mouthY + 9} 44 ${mouthY - 1} Z`;
  const hairDepthPaths = hairDepth === "forelock"
    ? ["M42 26 C48 18 58 18 66 25", "M37 39 C45 31 53 30 61 35", "M49 28 C54 22 63 23 71 31"]
    : hairDepth === "crown"
      ? ["M37 34 C45 20 61 17 75 31", "M41 29 C51 23 62 23 73 30", "M34 42 C46 36 61 36 76 44"]
      : hairDepth === "taper"
        ? ["M34 39 C39 31 48 29 57 31", "M58 31 C66 31 72 35 75 43", "M35 45 C43 40 54 39 68 44"]
        : ["M34 39 C38 33 43 31 50 32", "M67 37 C70 43 69 51 66 58", "M35 45 C39 49 40 55 38 62"];
  const shoulderPath = isPortrait ? "M-5 130 C8 103 32 91 51 93 C70 90 96 104 106 130 Z" : "M10 100 C15 78 86 77 92 100 Z";
  const collarPath = isPortrait ? "M30 93 L50 124 L72 93 L65 130 L36 130 Z" : "M34 82 L50 98 L68 82 L63 101 L38 101 Z";
  const neckShadowPath = isPortrait ? "M38 72 L36 96 C43 107 60 108 66 95 L62 69 Z" : "M39 71 L38 85 C42 93 58 94 64 85 L62 69 Z";
  const neckLightPath = isPortrait ? "M43 69 L42 92 C48 100 59 99 63 88 L60 68 Z" : "M43 69 L43 83 C49 88 58 87 62 80 L60 68 Z";
  const archetypeShoulderPath = isPortrait
    ? portraitArchetype === "broad"
      ? "M-10 130 C6 101 30 88 52 91 C74 88 101 103 112 130 Z"
      : portraitArchetype === "lean"
        ? "M2 130 C14 106 34 94 51 96 C68 94 88 106 99 130 Z"
        : portraitArchetype === "veteran"
          ? "M-6 130 C8 104 34 92 51 93 C69 91 94 105 106 130 Z"
          : shoulderPath
    : portraitArchetype === "broad"
      ? "M5 100 C12 77 88 76 96 100 Z"
      : portraitArchetype === "lean"
        ? "M15 100 C20 82 80 81 88 100 Z"
        : shoulderPath;
  const archetypeCollarPath = isPortrait
    ? portraitArchetype === "lean"
      ? "M34 94 L50 126 L68 94 L63 130 L39 130 Z"
      : portraitArchetype === "broad"
        ? "M25 93 L50 122 L77 93 L69 130 L32 130 Z"
        : collarPath
    : collarPath;
  const shirtPanelPaths = isPortrait
    ? [
      portraitArchetype === "broad" ? "M20 106 C34 98 43 99 50 116" : "M24 106 C36 99 44 100 50 116",
      portraitArchetype === "lean" ? "M75 108 C65 101 57 101 51 118" : "M78 106 C65 98 57 99 51 116",
    ]
    : ["M28 86 C39 82 46 86 50 97", "M72 86 C61 82 54 86 50 97"];
  return (
    <div
      className={cn("shrink-0 overflow-hidden rounded-lg border border-white/70 bg-white shadow-card", className)}
      aria-label={`${name} portrait`}
    >
      <svg viewBox={`0 0 100 ${viewHeight}`} role="img" className="h-full w-full">
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={`hsl(${bgHue} 45% 18%)`} />
            <stop offset="62%" stopColor={`hsl(${(bgHue + 26) % 360} 48% 28%)`} />
            <stop offset="100%" stopColor={`hsl(${(bgHue + 58) % 360} 42% 14%)`} />
          </linearGradient>
          <linearGradient id={`${id}-skin`} x1="0.2" x2="0.9" y1="0.05" y2="1">
            <stop offset="0%" stopColor={skinLight} />
            <stop offset="54%" stopColor={skin} />
            <stop offset="100%" stopColor={skinShadow} />
          </linearGradient>
          <linearGradient id={`${id}-hair`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={hairLight} />
            <stop offset="42%" stopColor={hair} />
            <stop offset="100%" stopColor="#070707" />
          </linearGradient>
          <linearGradient id={`${id}-shirt`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.92" />
            <stop offset="22%" stopColor={shirt} />
            <stop offset="100%" stopColor="#08140f" />
          </linearGradient>
          <clipPath id={`${id}-clip`}>
            <rect width="100" height={viewHeight} rx="0" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id}-clip)`}>
        <rect width="100" height={viewHeight} fill={`url(#${id}-bg)`} />
        <path d={isPortrait ? "M-18 126 L98 -8" : "M-14 92 L88 -8"} stroke="rgba(255,255,255,0.09)" strokeWidth="8" />
        <path d={isPortrait ? "M72 -6 C102 24 104 76 83 128" : "M77 -6 C98 18 97 52 84 77"} stroke="rgba(255,255,255,0.1)" strokeWidth={isPortrait ? "11" : "9"} fill="none" />
        <path d={archetypeShoulderPath} fill={`url(#${id}-shirt)`} />
        {shirtPanelPaths.map((path) => (
          <path key={path} d={path} stroke="rgba(255,255,255,0.16)" strokeWidth={isPortrait ? "2.4" : "1.8"} strokeLinecap="round" fill="none" />
        ))}
        {jerseyStripe ? (
          <>
            <path d={isPortrait ? "M29 93 L39 130" : "M33 83 L42 100"} stroke={accent} strokeWidth={isPortrait ? "6" : "5"} opacity="0.75" />
            <path d={isPortrait ? "M72 93 L61 130" : "M67 82 L58 100"} stroke={accent} strokeWidth={isPortrait ? "6" : "5"} opacity="0.62" />
          </>
        ) : null}
        <path d={archetypeCollarPath} fill={kind === "manager" ? "#f8fafc" : "#111827"} opacity="0.9" />
        {isPortrait ? <path d="M39 101 L50 119 L62 101" stroke={kind === "manager" ? "#d9e2e9" : accent} strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.9" /> : null}
        <path d={neckShadowPath} fill={skinShadow} />
        <path d={neckLightPath} fill={skin} />
        <g transform={portraitTransform}>
          <g transform={`${portraitZoom} rotate(${headTilt} 53 50) ${archetypeTransform}`}>
            <path d={leftEarPath} fill={skinMid} />
            <path d={rightEarPath} fill={skinShadow} opacity="0.9" />
            <path d="M33 55 C29 55 29 60 33 60 M70 54 C73 55 73 59 69 60" stroke={skinShadow} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.38" />
            <path d={archetypeFacePath} fill={`url(#${id}-skin)`} />
            <path d={faceShadowPath} fill={skinShadow} opacity="0.24" />
            <path d={templeShadowPath} fill={faceInk} opacity="0.08" />
            <path d={cheekShadowPath} fill={skinShadow} opacity="0.17" />
            <path d={hardFacePlanePath} fill={facePlaneStyle === "soft-mask" ? skinLight : faceInk} opacity={facePlaneStyle === "soft-mask" ? "0.1" : "0.07"} />
            <path d={foreheadPlanePath} fill={skinLight} opacity="0.17" />
            <path d={keyLightPath} fill={skinLight} opacity={lightAngle === "front" ? "0.24" : "0.34"} />
            <path d={highlightPlanePath} stroke={skinLight} strokeWidth="1.7" strokeLinecap="round" fill="none" opacity="0.34" />
            <path d={browShadowPath} fill={faceInk} opacity="0.08" />
            <path d={eyeSocketPath} fill="#2a1510" opacity="0.07" />
            <path d={jawPlanePath} fill={skinShadow} opacity="0.15" />
            <path d={chinPlanePath} fill={skinMid} opacity="0.14" />
            <path d="M42 58 C47 61 54 61 60 58 C58 64 47 65 42 58 Z" fill={skinMid} opacity="0.14" />
            <path d={archetypeHairPath} fill={`url(#${id}-hair)`} />
            <path d={hairVolumePath} fill={`url(#${id}-hair)`} opacity="0.96" />
            <path d={hairShadowPath} fill="#050505" opacity="0.2" />
            {hairDepthPaths.map((path, index) => (
              <path key={path} d={path} stroke={index === 0 ? hairLight : hair} strokeWidth={index === 2 ? "2.7" : "2"} strokeLinecap="round" fill="none" opacity={index === 0 ? "0.34" : "0.28"} />
            ))}
            {sideburnPath ? <path d={sideburnPath} fill={hair} opacity="0.82" /> : null}
            <path d="M35 33 C44 18 63 17 75 32 C59 27 49 29 35 38 Z" fill={hairLight} opacity="0.26" />
            <path d={hairlinePath} stroke={hairLight} strokeWidth="1.7" strokeLinecap="round" fill="none" opacity="0.3" />
            {hairStrands.map((path, index) => (
              <path key={path} d={path} stroke={index === 1 ? hairLight : hair} strokeWidth={hairTexture === "crop" ? "1.7" : "2"} strokeLinecap="round" fill="none" opacity={index === 1 ? "0.34" : "0.48"} />
            ))}
            {hairStyle === "spikes" || hairStyle === "textured" || hairStyle === "fringe" ? (
              <>
                <path d="M42 26 L48 12 L52 29 Z" fill={hair} />
                <path d="M54 24 L64 12 L63 31 Z" fill={hair} />
                <path d="M36 35 L25 26 L40 29 Z" fill={hair} />
                <path d="M67 28 L78 24 L72 38 Z" fill={hair} />
              </>
            ) : null}
            <path d={leftBrowPath} stroke={hair} strokeWidth={browStyle === "split" ? "2.05" : "2.35"} strokeLinecap="round" fill="none" opacity="0.92" />
            <path d={rightBrowPath} stroke={hair} strokeWidth={browStyle === "split" ? "2.05" : "2.35"} strokeLinecap="round" fill="none" opacity="0.92" />
            <path d={leftEyeFillPath} fill="#f6ddc9" opacity={eyeStyle === "narrow" ? "0.14" : "0.28"} />
            <path d={rightEyeFillPath} fill="#f6ddc9" opacity={eyeStyle === "narrow" ? "0.14" : "0.28"} />
            <path d={leftEyePath} stroke="#172033" strokeWidth={eyeStyle === "round" ? "1.45" : "1.7"} strokeLinecap="round" fill="none" />
            <path d={rightEyePath} stroke="#172033" strokeWidth={eyeStyle === "round" ? "1.45" : "1.7"} strokeLinecap="round" fill="none" />
            <circle cx={eyeLeft + (eyeStyle === "wide" ? 1 : 2)} cy={eyeY + (eyeStyle === "heavy" ? 1 : 0)} r={eyeStyle === "round" ? "0.95" : "0.8"} fill="#111827" />
            <circle cx={eyeRight + (eyeStyle === "wide" ? 1 : 2)} cy={eyeY + (eyeStyle === "heavy" ? 2 : 1)} r={eyeStyle === "round" ? "0.9" : "0.78"} fill="#111827" />
            {hasGlasses ? (
              <>
                <path d={`M${eyeLeft - 8} ${eyeY - 7} h16 v13 h-16 Z`} fill="none" stroke="#111827" strokeWidth="1.8" />
                <path d={`M${eyeRight - 8} ${eyeY - 6} h16 v13 h-16 Z`} fill="none" stroke="#111827" strokeWidth="1.8" />
                <path d={`M${eyeLeft + 8} ${eyeY - 1} L${eyeRight - 8} ${eyeY}`} stroke="#111827" strokeWidth="1.8" />
              </>
            ) : null}
            {hasScar ? <path d={`M${eyeRight + 5} ${eyeY + 4} L${eyeRight + 12} ${eyeY + 13}`} stroke="#f3d0ba" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" /> : null}
            {hasAgeLines ? skinMarkPaths.map((path) => (
              <path key={path} d={path} stroke={faceInk} strokeWidth="0.85" strokeLinecap="round" fill="none" opacity="0.14" />
            )) : null}
            {underEyePlanePath ? <path d={underEyePlanePath} stroke={faceInk} strokeWidth={underEyeDepth === "heavy" ? "1.15" : "0.95"} strokeLinecap="round" fill="none" opacity={underEyeDepth === "heavy" ? "0.14" : "0.1"} /> : null}
            <path d={cheekPath} stroke={skinLight} strokeWidth="1.25" strokeLinecap="round" fill="none" opacity={cheekStyle === "hollow" ? "0.2" : "0.26"} />
            <path d="M39 51 C44 49 49 50 52 53" stroke={skinShadow} strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.18" />
            <path d="M58 53 C63 50 68 51 71 55" stroke={skinShadow} strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.18" />
            <path d={nosePath} stroke={skinShadow} strokeWidth={noseStyle === "sharp" ? "1.55" : "1.85"} strokeLinecap="round" fill="none" opacity="0.48" />
            <path d={castShadowPath} stroke={faceInk} strokeWidth="1.55" strokeLinecap="round" fill="none" opacity="0.12" />
            <path d={`M${noseX + 1} 45 C${noseX + 5} 51 ${noseX + 2} 57 ${noseX + 7} 60`} stroke={skinLight} strokeWidth="0.95" strokeLinecap="round" fill="none" opacity="0.28" />
            <path d={nostrilPath} stroke={skinShadow} strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.34" />
            {hasMoustache ? <path d={`M43 ${mouthY - 3} C49 ${mouthY - 7} 57 ${mouthY - 6} 66 ${mouthY - 4}`} stroke={hair} strokeWidth={facialHairStyle === "moustache" ? "3" : "2.4"} strokeLinecap="round" fill="none" opacity="0.5" /> : null}
            <path d={mouthPlanePath} fill={skinShadow} opacity="0.07" />
            <path d={asymmetricMouthPath} stroke="#5f271f" strokeWidth={mouthStyle === "pressed" ? "1.35" : "1.65"} strokeLinecap="round" fill="none" />
            <path d={lowerLipPath} stroke={skinShadow} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.24" />
            {hasStubble ? (
              <>
                <path d={facialHairStyle === "goatee" ? "M49 67 C53 76 61 76 65 66 C63 80 50 81 46 69 Z" : "M39 59 C45 75 62 77 69 61 C66 80 44 82 37 66 Z"} fill={hair} opacity={hasBeard ? "0.34" : "0.1"} />
                <path d={facialHairStyle === "goatee" ? "M49 72 C54 75 60 75 64 70" : "M43 66 C50 70 59 70 66 64"} stroke={hair} strokeWidth="1.25" strokeLinecap="round" opacity={hasBeard ? "0.22" : "0.12"} />
                <path d="M42 63 C48 66 58 66 66 61 M43 68 C50 72 60 72 67 66" stroke={hair} strokeWidth="0.75" strokeLinecap="round" opacity={hasBeard ? "0.26" : "0.1"} />
              </>
            ) : null}
            <path d="M37 68 C44 78 59 80 67 65" stroke={skinShadow} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.3" />
            <path d="M36 40 C33 51 35 63 42 72 M69 39 C75 51 72 65 63 73" stroke={faceInk} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.12" />
            <path d="M40 75 C47 82 59 82 65 73" stroke="#1f130f" strokeWidth="0.9" strokeLinecap="round" opacity="0.13" />
            <path d={neckTendonPath} stroke={skinShadow} strokeWidth="1.35" strokeLinecap="round" fill="none" opacity={isPortrait ? "0.28" : "0"} />
          </g>
        </g>
        {isPortrait ? (
          <>
            <path d="M5 120 C27 112 70 113 96 123" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
            <path d="M16 129 C26 105 38 97 50 98" stroke="rgba(0,0,0,0.18)" strokeWidth="8" fill="none" />
          </>
        ) : null}
        </g>
      </svg>
    </div>
  );
}
