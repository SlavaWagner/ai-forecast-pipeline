import axios from 'axios';

/**
 * Helper to build headers for Google Ads API requests
 * @param {object} config - Configuration object
 * @param {string} accessToken - Current OAuth2 access token
 * @returns {object} Headers dictionary
 */
function getHeaders(config, accessToken) {
  const headers = {
    'Content-Type': 'application/json',
    'developer-token': config.developerToken,
    'Authorization': `Bearer ${accessToken}`
  };

  if (config.loginCustomerId) {
    headers['login-customer-id'] = config.loginCustomerId.replace(/-/g, '');
  }

  return headers;
}

/**
 * Fetches all enabled campaigns for selection.
 * @param {object} config - Configuration object
 * @param {string} accessToken - Current OAuth2 access token
 * @returns {Promise<Array>} Array of campaign objects
 */
export async function fetchActiveCampaigns(config, accessToken) {
  const customerId = config.customerId.replace(/-/g, '');
  const url = `https://googleads.googleapis.com/${config.googleAdsVersion}/customers/${customerId}/googleAds:searchStream`;
  
  const query = `
    SELECT 
      campaign.id, 
      campaign.name, 
      campaign.status 
    FROM campaign 
    WHERE campaign.status = 'ENABLED'
  `.replace(/\s+/g, ' ').trim();

  try {
    const response = await axios.post(url, { query }, {
      headers: getHeaders(config, accessToken)
    });

    let campaigns = [];
    if (Array.isArray(response.data)) {
      for (const chunk of response.data) {
        if (chunk.results && Array.isArray(chunk.results)) {
          campaigns.push(...chunk.results);
        }
      }
    }

    return campaigns.map(item => ({
      id: item.campaign.id,
      name: item.campaign.name,
      status: item.campaign.status
    }));
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Google Ads searchStream campaigns error: ${errorDetails}`);
  }
}

/**
 * Fetches daily performance metrics for a specific campaign.
 * @param {object} config - Configuration object
 * @param {string} accessToken - Current OAuth2 access token
 * @param {string} campaignId - Campaign ID to fetch metrics for
 * @param {number} daysCount - Number of historical days to fetch (e.g. 30, 60)
 * @returns {Promise<Array>} Daily performance metrics
 */
export async function fetchCampaignDailyMetrics(config, accessToken, campaignId, daysCount = 30) {
  const customerId = config.customerId.replace(/-/g, '');
  const url = `https://googleads.googleapis.com/${config.googleAdsVersion}/customers/${customerId}/googleAds:searchStream`;

  // Calculate Date range: Start Date = Today - daysCount, End Date = Yesterday
  const formatDate = (date) => date.toISOString().split('T')[0];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // Yesterday
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysCount);

  const query = `
    SELECT 
      campaign.id,
      campaign.name,
      segments.date,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions,
      metrics.conversions_value,
      metrics.search_impression_share,
      metrics.search_budget_lost_impression_share
    FROM campaign 
    WHERE campaign.id = ${campaignId}
      AND segments.date BETWEEN '${formatDate(startDate)}' AND '${formatDate(endDate)}'
  `.replace(/\s+/g, ' ').trim();

  try {
    const response = await axios.post(url, { query }, {
      headers: getHeaders(config, accessToken)
    });

    let results = [];
    if (Array.isArray(response.data)) {
      for (const chunk of response.data) {
        if (chunk.results && Array.isArray(chunk.results)) {
          results.push(...chunk.results);
        }
      }
    }

    // Sort chronologically by date
    results.sort((a, b) => a.segments.date.localeCompare(b.segments.date));

    return results.map(item => {
      const seg = item.segments || {};
      const met = item.metrics || {};
      
      // Parse Impression Shares (which can be double or strings like "0.85" or "< 10%")
      const parseIS = (val) => {
        if (!val || val.includes('<') || val.includes('>')) return 0.05; // Fallback for small values
        return parseFloat(val) || 0.0;
      };

      return {
        date: seg.date,
        weekday: new Date(seg.date).toLocaleDateString('en-US', { weekday: 'long' }),
        clicks: parseInt(met.clicks || '0', 10),
        impressions: parseInt(met.impressions || '0', 10),
        conversions: parseFloat(met.conversions || '0'),
        conversionValue: parseFloat(met.conversionsValue || '0'),
        impressionShare: parseIS(met.searchImpressionShare),
        lostImpressionShare: parseIS(met.searchBudgetLostImpressionShare)
      };
    });
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Google Ads daily metrics error: ${errorDetails}`);
  }
}
