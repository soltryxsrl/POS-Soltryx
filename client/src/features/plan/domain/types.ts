/** Plan contratado + uso actual. `maxUsers`/`maxBranches` null = ilimitado. */
export interface PlanUsage {
  maxUsers: number | null;
  maxBranches: number | null;
  /** Interruptor de la función multi-sucursal (false = opera mono-sucursal). */
  multiBranchEnabled: boolean;
  usedUsers: number;
  usedBranches: number;
}
