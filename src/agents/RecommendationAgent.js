import BaseAgent from './BaseAgent.js';

export default class RecommendationAgent extends BaseAgent {
  constructor() {
    super('advisor');
  }

  /**
   * Generates deep campaign optimization recommendations.
   * @param {string} analysisReport - The analyst's report from the forecasting agent
   * @returns {Promise<string>} Structured optimization advice
   */
  async generateRecommendations(analysisReport) {
    const userPrompt = `
Based on the following Performance & Forecast Analysis Report:
=========================================
${analysisReport}
=========================================

Please generate concrete, high-level tactical recommendations. Ensure you strictly divide your suggestions into:

1. THE OFFER (Angebot):
   - Provide 3 distinct pricing, value packaging, or risk-reversal (guarantees) updates to boost customer urgency and increase conversion rates.
2. THE LANDING PAGE (Final URL optimization):
   - Provide 3 UX, structure, copywriting, or trust signal recommendations specifically designed to increase conversion rate for incoming Google Ads traffic.
3. CAMPAIGN HANDLING (Kampagnen-Steuerung):
   - Provide 3 operational suggestions on ad groups, keyword matches, negatives, bidding strategies, or schedules to capture the forecasted seasonality patterns.

Do not use boilerplate copy. Write in clean, concise, executive English using markdown lists.
`;

    return await this.generateCompletion(userPrompt, false);
  }
}
