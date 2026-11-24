export class BudgetPerformanceEngine {
  private static monitoring = false;

  public static startMonitoring() {
    if (this.monitoring) return;
    this.monitoring = true;
    console.log('[BudgetPerformanceEngine] Started monitoring');
  }

  public static stopMonitoring() {
    this.monitoring = false;
    console.log('[BudgetPerformanceEngine] Stopped monitoring');
  }
}
