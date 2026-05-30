import { describe, expect, it } from "vitest";
import { createFaceGenome, faceGenomeSeed } from "../src/game/portraits";

describe("FaceGenome", () => {
  it("creates a stable portrait identity from the same person seed", () => {
    const first = createFaceGenome({ name: "Nathan Davis", seedKey: "player_abc", kind: "player", variant: "portrait" });
    const second = createFaceGenome({ name: "Nathan Davis", seedKey: "player_abc", kind: "player", variant: "portrait" });

    expect(second).toEqual(first);
    expect(first.version).toBe(1);
    expect(first.seed).toBe(faceGenomeSeed("player_abc"));
  });

  it("keeps renderer variant separate from facial identity", () => {
    const thumb = createFaceGenome({ name: "Nathan Davis", seedKey: "player_abc", kind: "player", variant: "thumb" });
    const portrait = createFaceGenome({ name: "Nathan Davis", seedKey: "player_abc", kind: "player", variant: "portrait" });

    expect(portrait.variant).toBe("portrait");
    expect(thumb.variant).toBe("thumb");
    expect(portrait.seed).toBe(thumb.seed);
    expect(portrait.palette).toEqual(thumb.palette);
    expect(portrait.geometry).toEqual(thumb.geometry);
    expect(portrait.hair).toEqual(thumb.hair);
    expect(portrait.face).toEqual(thumb.face);
  });

  it("uses manager-specific styling without changing the seed contract", () => {
    const player = createFaceGenome({ name: "Elliot Thompson", seedKey: "person_1", kind: "player" });
    const manager = createFaceGenome({ name: "Elliot Thompson", seedKey: "person_1", kind: "manager" });

    expect(manager.seed).toBe(player.seed);
    expect(manager.kind).toBe("manager");
    expect(player.kind).toBe("player");
    expect(manager.palette.shirt).not.toEqual(player.palette.shirt);
  });

  it("creates varied genomes for different stable ids", () => {
    const first = createFaceGenome({ name: "Mason Cooper", seedKey: "player_1" });
    const second = createFaceGenome({ name: "Mason Cooper", seedKey: "player_2" });

    expect(second.seed).not.toBe(first.seed);
    expect({
      palette: second.palette,
      geometry: second.geometry,
      hair: second.hair,
      face: second.face,
      details: second.details,
    }).not.toEqual({
      palette: first.palette,
      geometry: first.geometry,
      hair: first.hair,
      face: first.face,
      details: first.details,
    });
  });
});
