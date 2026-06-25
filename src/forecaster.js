/**
 * Local forecasting engine using Exponentielle Glättung (ETS) / Deseasonalized Linear Regression
 */

/**
 * Calculates a linear regression slope and intercept.
 * @param {Array<number>} x - Indizes (0, 1, 2...)
 * @param {Array<number>} y - Deseasonalized values
 * @returns {object} { slope, intercept }
 */
function linearRegression(x, y) {
  const n = x.length;
  if (n === 0) return { slope: 0, intercept: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumXX += x[i] * x[i];
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Performs ETS forecasting based on historical daily data.
 * @param {Array<object>} history - Daily metrics (date, clicks, impressions, conversions, conversionValue, etc.)
 * @param {number} forecastDays - Days to forecast
 * @returns {object} Contains seasonality indices, regression parameters, and daily forecast array
 */
export function calculateETSForecast(history, forecastDays = 14) {
  if (!history || history.length === 0) {
    throw new Error('Historical data is empty. Cannot perform forecast.');
  }

  const weekdaysList = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // 1. Group by weekday to calculate averages
  const weekdayTotals = {};
  weekdaysList.forEach(day => {
    weekdayTotals[day] = { clicks: 0, impressions: 0, conversions: 0, value: 0, count: 0 };
  });

  let totalClicks = 0;
  let totalImpressions = 0;
  let totalConversions = 0;
  let totalValue = 0;

  history.forEach(day => {
    const d = new Date(day.date);
    const weekday = weekdaysList[d.getDay()];
    
    weekdayTotals[weekday].clicks += day.clicks;
    weekdayTotals[weekday].impressions += day.impressions;
    weekdayTotals[weekday].conversions += day.conversions;
    weekdayTotals[weekday].value += day.conversionValue;
    weekdayTotals[weekday].count += 1;

    totalClicks += day.clicks;
    totalImpressions += day.impressions;
    totalConversions += day.conversions;
    totalValue += day.conversionValue;
  });

  const overallAvgClicks = totalClicks / history.length;
  const overallAvgImpressions = totalImpressions / history.length;
  const overallAvgConversions = totalConversions / history.length;
  const overallAvgValue = totalValue / history.length;

  // 2. Calculate Seasonality Index (Si) for each weekday
  const seasonalityIndex = {};
  weekdaysList.forEach(day => {
    const stats = weekdayTotals[day];
    if (stats.count === 0) {
      seasonalityIndex[day] = { clicks: 1.0, impressions: 1.0, conversions: 1.0, value: 1.0 };
      return;
    }

    const avgClicks = stats.clicks / stats.count;
    const avgImpressions = stats.impressions / stats.count;
    const avgConversions = stats.conversions / stats.count;
    const avgValue = stats.value / stats.count;

    seasonalityIndex[day] = {
      clicks: overallAvgClicks > 0 ? avgClicks / overallAvgClicks : 1.0,
      impressions: overallAvgImpressions > 0 ? avgImpressions / overallAvgImpressions : 1.0,
      conversions: overallAvgConversions > 0 ? avgConversions / overallAvgConversions : 1.0,
      value: overallAvgValue > 0 ? avgValue / overallAvgValue : 1.0
    };
  });

  // 3. Deseasonalize historical data
  const xIndices = [];
  const yClicks = [];
  const yImpressions = [];
  const yConversions = [];
  const yValue = [];

  history.forEach((day, index) => {
    const d = new Date(day.date);
    const weekday = weekdaysList[d.getDay()];
    const si = seasonalityIndex[weekday];

    xIndices.push(index);
    yClicks.push(day.clicks / (si.clicks || 1));
    yImpressions.push(day.impressions / (si.impressions || 1));
    yConversions.push(day.conversions / (si.conversions || 1));
    yValue.push(day.conversionValue / (si.value || 1));
  });

  // 4. Calculate Regression (Trend & Base)
  const regClicks = linearRegression(xIndices, yClicks);
  const regImpressions = linearRegression(xIndices, yImpressions);
  const regConversions = linearRegression(xIndices, yConversions);
  const regValue = linearRegression(xIndices, yValue);

  // 5. Generate daily projection for forecastDays
  const lastDate = new Date(history[history.length - 1].date);
  const forecast = [];

  for (let i = 1; i <= forecastDays; i++) {
    const targetDate = new Date(lastDate);
    targetDate.setDate(lastDate.getDate() + i);

    const dateStr = targetDate.toISOString().split('T')[0];
    const weekday = weekdaysList[targetDate.getDay()];
    const si = seasonalityIndex[weekday];

    // t represents index in time-series (history.length - 1 + i)
    const t = history.length - 1 + i;

    // Forecast value = (BaseValue + t * Trend) * Si
    let predictedClicks = (regClicks.intercept + t * regClicks.slope) * si.clicks;
    let predictedImpressions = (regImpressions.intercept + t * regImpressions.slope) * si.impressions;
    let predictedConversions = (regConversions.intercept + t * regConversions.slope) * si.conversions;
    let predictedValue = (regValue.intercept + t * regValue.slope) * si.value;

    // Clamp values to prevent negative projections
    predictedClicks = Math.max(0, Math.round(predictedClicks));
    predictedImpressions = Math.max(0, Math.round(predictedImpressions));
    predictedConversions = Math.max(0, Math.round(predictedConversions * 100) / 100);
    predictedValue = Math.max(0, Math.round(predictedValue * 100) / 100);

    forecast.push({
      date: dateStr,
      weekday,
      predicted_clicks: predictedClicks,
      predicted_impressions: predictedImpressions,
      predicted_conversions: predictedConversions,
      predicted_conversion_value: predictedValue,
      seasonality_index: Math.round(si.clicks * 1000) / 1000 // default click index
    });
  }

  // Calculate overall metrics averages to return
  const avgImpressionShare = history.reduce((acc, curr) => acc + curr.impressionShare, 0) / history.length;
  const avgLostImpressionShare = history.reduce((acc, curr) => acc + curr.lostImpressionShare, 0) / history.length;

  return {
    seasonalityIndices: seasonalityIndex,
    regression: {
      clicks: regClicks,
      impressions: regImpressions,
      conversions: regConversions,
      value: regValue
    },
    avgMetrics: {
      impressionShare: avgImpressionShare,
      lostImpressionShare: avgLostImpressionShare
    },
    forecast
  };
}
