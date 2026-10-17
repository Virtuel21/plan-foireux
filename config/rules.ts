/** Prototype balance. Change one value at a time after measured human playtests. */
export const CONFIG = {
  rounds: 5,
  vault: 8,
  alarm: 5,
  // Low-paid collective duties compete with lucrative, crowded loot posts.
  postRewards: {
    drill: 10,
    secure: 6,
    loot: 16,
    painting: 24,
  },
  theft: 4,
  theftIncomeRate: 0.9,
  bonus: 8,
  reconnect: 90_000,
  durations: {
    role: 7_000,
    promise: 20_000,
    secret: 12_000,
    transition: 600,
    minigame: 18_000,
    reveal: 12_000,
    debate: 30_000,
  },
} as const;
