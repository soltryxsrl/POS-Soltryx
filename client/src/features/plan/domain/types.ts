/** Plan contratado + uso actual. `maxUsers`/`maxBranches` null = ilimitado. */
export interface PlanUsage {
  maxUsers: number | null;
  maxBranches: number | null;
  usedUsers: number;
  usedBranches: number;
}
