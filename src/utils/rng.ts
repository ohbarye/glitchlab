export function seedRng(seed: number): () => number {
  let s = seed + 1;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}
