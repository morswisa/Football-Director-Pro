export function normalizeSeed(seed: number) {
  const normalized = Math.floor(Math.abs(seed)) % 2_147_483_647;
  return normalized === 0 ? 1 : normalized;
}

export function nextSeed(seed: number) {
  return (normalizeSeed(seed) * 48_271) % 2_147_483_647;
}

export function randomFloat(seed: number): [number, number] {
  const next = nextSeed(seed);
  return [(next - 1) / 2_147_483_646, next];
}

export function randomInt(seed: number, min: number, max: number): [number, number] {
  const [value, next] = randomFloat(seed);
  return [Math.floor(value * (max - min + 1)) + min, next];
}

export function pickOne<T>(seed: number, values: readonly T[]): [T, number] {
  const [index, next] = randomInt(seed, 0, values.length - 1);
  return [values[index], next];
}

export function chance(seed: number, probability: number): [boolean, number] {
  const [value, next] = randomFloat(seed);
  return [value < probability, next];
}
