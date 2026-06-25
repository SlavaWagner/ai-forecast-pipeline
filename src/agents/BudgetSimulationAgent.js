import BaseAgent from './BaseAgent.js';

export default class BudgetSimulationAgent extends BaseAgent {
  constructor() {
    super('simulator');
  }

  /**
   * Run simulation using the LLM Simulator Agent.
   * @param {Array<object>} historicalData - Daily historical metrics
   * @param {number} monthsCount - Horizon in months (e.g. 14)
   * @param {number} budgetMultiplier - Factor to scale budget by (e.g. 2.0 for doubling)
   * @param {number} conversionRateModifier - Conversion rate change percentage (e.g. +10% CVR)
   * @returns {Promise<string>} Detailed simulation report
   */
  async simulateScenario(historicalData, monthsCount, budgetMultiplier, conversionRateModifier = 0) {
    const totalClicks = historicalData.reduce((acc, curr) => acc + curr.clicks, 0);
    const totalImpressions = historicalData.reduce((acc, curr) => acc + curr.impressions, 0);
    const totalConversions = historicalData.reduce((acc, curr) => acc + curr.conversions, 0);
    const totalValue = historicalData.reduce((acc, curr) => acc + curr.conversionValue, 0);
    const avgLostIS = historicalData.reduce((acc, curr) => acc + curr.lostImpressionShare, 0) / historicalData.length;
    const avgIS = historicalData.reduce((acc, curr) => acc + curr.impressionShare, 0) / historicalData.length;

    const days = historicalData.length;
    const avgDailyClicks = totalClicks / days;
    const avgDailyConversions = totalConversions / days;
    const avgDailyValue = totalValue / days;

    const userPrompt = `
Historical Baseline Metrics (Calculated over ${days} days):
- Total Clicks: ${totalClicks} (Average Daily: ${avgDailyClicks.toFixed(1)})
- Total Impressions: ${totalImpressions}
- Total Conversions: ${totalConversions.toFixed(2)} (Average Daily: ${avgDailyConversions.toFixed(2)})
- Total Conversion Value: €${totalValue.toFixed(2)} (Average Daily: €${avgDailyValue.toFixed(2)})
- Average Search Impression Share: ${(avgIS * 100).toFixed(1)}%
- Average Search Lost Impression Share (Budget): ${(avgLostIS * 100).toFixed(1)}%

Simulation Request:
- Target Horizon: ${monthsCount} months in the future
- Budget Action: Multiply current budget by ${budgetMultiplier}x (e.g. ${budgetMultiplier === 2 ? 'Double budget' : budgetMultiplier + 'x scaling'})
- CVR Adjustment: ${conversionRateModifier >= 0 ? '+' : ''}${conversionRateModifier}% relative change in Conversion Rate

Simulation Instructions:
1. Apply a diminishing returns multiplier to estimate how much Clicks and impressions will grow. Since budget scaling is non-linear, a ${budgetMultiplier}x budget increase typically increases clicks by a power factor of budget (e.g. Clicks_new = Clicks_old * (${budgetMultiplier}^0.75)). However, incorporate the historical "Lost Impression Share (Budget)" of ${(avgLostIS * 100).toFixed(1)}%. If Lost IS is high, the scaling efficiency is higher!
2. Calculate the projected Conversions and Conversion Value in month #${monthsCount} (assuming a standard 30-day month).
3. Present a structured Markdown comparison table:
   - Metric (Conversions, CPC, Cost, Conversion Value, CPA, ROAS)
   - Current Baseline (Monthly equivalent)
   - Simulated Scenario (Month #${monthsCount})
   - Variance (%)
4. Explain the modeling assumptions (e.g. power coefficient used, search volume headroom, CVR shifts).
5. Give three concrete management tips for scaling this budget without wasting spend.
`;

    return await this.generateCompletion(userPrompt, false);
  }
}
