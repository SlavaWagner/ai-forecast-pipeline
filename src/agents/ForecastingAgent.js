import BaseAgent from './BaseAgent.js';

export default class ForecastingAgent extends BaseAgent {
  constructor() {
    super('forecaster');
  }

  /**
   * Generates a performance analysis report based on historical metrics and calculated projections.
   * @param {Array<object>} historicalData - Daily historical metrics
   * @param {Array<object>} forecastData - Projected daily metrics
   * @param {object} avgMetrics - Averages of impression shares
   * @returns {Promise<string>} AI Analyst's strategic report
   */
  async analyzeForecast(historicalData, forecastData, avgMetrics) {
    const historicalSummary = historicalData.map(h => 
      `- Date: ${h.date} (${h.weekday}), Clicks: ${h.clicks}, Impressions: ${h.impressions}, Conversions: ${h.conversions}, Value: €${h.conversionValue.toFixed(2)}, IS: ${(h.impressionShare * 100).toFixed(1)}%, Lost IS (Budget): ${(h.lostImpressionShare * 100).toFixed(1)}%`
    ).join('\n');

    const forecastSummary = forecastData.map(f => 
      `- Date: ${f.date} (${f.weekday}), Predicted Clicks: ${f.predicted_clicks}, Predicted Impressions: ${f.predicted_impressions}, Predicted Conversions: ${f.predicted_conversions.toFixed(2)}, Predicted Value: €${f.predicted_conversion_value.toFixed(2)}, Si: ${f.seasonality_index.toFixed(3)}`
    ).join('\n');

    const userPrompt = `
You are analyzing a Google Ads campaign.

Historical Performance Data (Last ${historicalData.length} days):
${historicalSummary}

Average Historical Channel Coverage:
- Search Impression Share (IS): ${(avgMetrics.impressionShare * 100).toFixed(1)}%
- Search Lost Impression Share (Budget): ${(avgMetrics.lostImpressionShare * 100).toFixed(1)}%

Calculated ETS Projections:
${forecastSummary}

Please conduct a premium data analysis. You must structure the analysis using the following headers:
### 1. Seasonal Trends & Day-of-Week Analysis
- Identify which days of the week are strongest and weakest. Highlight the exact Seasonality Index (Si) range.
### 2. Downward Risks (Abwärtstrends verhindern)
- Spot negative indicators. Specifically examine if budget lost impression share is causing traffic caps.
### 3. Upward Potentials (Aufwärtstrends ausbauen)
- Highlight areas of strengths and how to double down.
### 4. Strategic Growth Vectors
- Give high-level guidance for budget redirection.

Write the report in professional English. Do not add introductory chit-chat.
`;

    return await this.generateCompletion(userPrompt, false);
  }
}
