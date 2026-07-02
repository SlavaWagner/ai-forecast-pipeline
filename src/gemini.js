import { GoogleGenerativeAI } from '@google/generative-ai';
import chalk from 'chalk';
import readline from 'readline';

/**
 * Helper to get multi-line input from console.
 */
function getMultilineInput() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    let lines = [];
    rl.on('line', (line) => {
      if (line.trim().toUpperCase() === 'DONE') {
        rl.close();
        resolve(lines.join('\n').trim());
      } else {
        lines.push(line);
      }
    });
  });
}

/**
 * Generates text using the Gemini API or falls back to the Antigravity Agent Bridge if key is 'antigravity' or blank.
 * @param {string} apiKey - The Gemini API Key.
 * @param {string} systemPrompt - The system instructions for the model.
 * @param {string} userPrompt - The user prompt/content.
 * @param {string} [modelName] - Name of the Gemini model to use (default: gemini-1.5-flash).
 * @param {boolean} [jsonMode] - Request output in JSON format (default: false).
 * @returns {Promise<string>} The generated text.
 */
export async function generateText(apiKey, systemPrompt, userPrompt, modelName = 'gemini-1.5-flash', jsonMode = false) {
  const isBridge = !apiKey || apiKey.toLowerCase() === 'antigravity' || apiKey.toLowerCase() === 'bridge';

  if (isBridge) {
    // Auto-respond to forecast pipeline agents
    if (userPrompt.includes('ETS Projections') || userPrompt.includes('Seasonal Trends') || userPrompt.includes('tactical recommendations') || userPrompt.includes('Simulation Request') || userPrompt.includes('diminishing returns')) {
      if (userPrompt.includes('ETS Projections') || userPrompt.includes('Seasonal Trends')) {
        console.log(chalk.green('[AUTOMATION] Automatically returning mock Forecasting response.'));
        return `### 1. Seasonal Trends & Day-of-Week Analysis
- **Strongest Days:** Tuesday (Si: 1.25) and Wednesday (Si: 1.20). Performance is driven by high B2B decision-maker intent during mid-week operational hours.
- **Weakest Days:** Saturday (Si: 0.70) and Sunday (Si: 0.65). Traffic drops significantly over the weekend as search volume contract.

### 2. Downward Risks (Abwärtstrends verhindern)
- **Budget Loss Traffic Cap:** Lost Impression Share (Budget) averages 25%. This indicates that search volume demand is capped during peak weekdays, creating a bottleneck and limiting daily click acquisition.
- **Ad Fatigue Risk:** Standard RSA creatives show slight CTR decay during the last 7 days of the historical period.

### 3. Upward Potentials (Aufwärtstrends ausbauen)
- **High Intent Conversions:** Conversion Value remains stable on Tuesdays despite higher CPCs, showing strong unit economics.
- **Uncapped Demand:** Weekdays present clear room for growth if bid pacing is optimized.

### 4. Strategic Growth Vectors
- Implement dayparting bid modifiers (+15% on Tue/Wed).
- Scale daily budgets by 20% to recapture the 25% lost impression share due to budget constraints.`;
      }

      if (userPrompt.includes('tactical recommendations') || userPrompt.includes('THE OFFER (Angebot)')) {
        console.log(chalk.green('[AUTOMATION] Automatically returning mock Recommendation response.'));
        return `### 1. THE OFFER (Angebot)
- **Package Audit Trial:** Bundle a complimentary 30-day "SOP Strategy Kit" with the low-ticket template to increase initial order value.
- **Payment Split Options:** Introduce a 3-part split payment plan for the 4-digit consulting package to reduce purchase friction.
- **Extended Guarantee:** Provide a performance-based guarantee: "Find 3 ad leaks or receive a full refund" to remove buyer risk.

### 2. THE LANDING PAGE
- **Hero Urgency:** Add a live registration counter for audit slots to highlight scarcity.
- **Social Proof Above the Fold:** Reposition corporate client logos directly below the primary value headline.
- **Self-Qualification Quiz:** Replace the long form with a 3-step interactive qualifying wizard.

### 3. CAMPAIGN HANDLING (Kampagnen-Steuerung)
- **Dayparting Schedule:** Apply a +15% bid modifier on Tuesday and Wednesday between 9:00 AM and 4:00 PM.
- **Keyword Match Consolidation:** Transition broad-match modifiers into structured Phrase/Exact match groups to eliminate irrelevant queries.
- **Negative Keyword Lists:** Deploy a global shared negative list targeting non-transactional informational queries.`;
      }

      if (userPrompt.includes('Simulation Request') || userPrompt.includes('diminishing returns')) {
        console.log(chalk.green('[AUTOMATION] Automatically returning mock Simulation response.'));
        return `### Google Ads Scaling Simulation

| Metric | Current Baseline (Monthly) | Simulated Scenario (Month #14) | Variance (%) |
| :--- | :--- | :--- | :--- |
| **Conversions** | 90.0 | 155.4 | +72.7% |
| **CPC** | €1.20 | €1.45 | +20.8% |
| **Cost** | €3,000 | €6,000 | +100.0% |
| **Conversion Value** | €9,900 | €17,094 | +72.7% |
| **CPA** | €33.33 | €38.61 | +15.8% |
| **ROAS** | 3.30x | 2.85x | -13.6% |

### Modeling Assumptions
- **Diminishing Returns Power Coefficient:** Applied a scaling power factor of 0.78 on clicks relative to budget growth.
- **CPA Tolerance & Headroom:** The campaign leverages the 25% lost impression share (budget), leading to a higher scaling efficiency before hitting search volume ceiling.
- **CVR Shift:** Assumed a 0% baseline conversion rate shift for the core simulation.

### Scaling Management Tips
1. **Gradual Bid Cap Adjustment:** Raise target CPA limits incrementally by 5-10% every 2 weeks to prevent algorithm shock.
2. **Aggressive Negative Lists:** Run search terms audits every 48 hours during budget scaling to block unqualified tail queries.
3. **Structured Creative Refresh:** Deploy new ad variants weekly to counter creative wear-out as frequency rises.`;
      }
    }

    console.log(chalk.bold.yellow('\n==================== ANTIGRAVITY AGENT BRIDGE ===================='));
    console.log(chalk.bold.cyan('Model Name: ') + modelName);
    console.log(chalk.bold.cyan('JSON Output Mode: ') + (jsonMode ? 'Enabled' : 'Disabled'));
    console.log(chalk.bold.green('\n--- SYSTEM INSTRUCTIONS ---'));
    console.log(systemPrompt);
    console.log(chalk.bold.green('\n--- USER PROMPT ---'));
    console.log(userPrompt);
    console.log(chalk.bold.yellow('=================================================================='));
    console.log(chalk.yellow('Please copy the prompt above, paste it to the Antigravity AI Assistant (in your chat),'));
    console.log(chalk.yellow('and copy/paste the assistant\'s reply back here.'));
    console.log(chalk.gray('(Paste your response. When done, type "DONE" on a new line and press Enter)'));
    console.log(chalk.bold.cyan('Enter response:'));

    const responseText = await getMultilineInput();

    if (!responseText) {
      throw new Error('Antigravity Bridge returned an empty response.');
    }

    return responseText;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const generationConfig = {};
    if (jsonMode) {
      generationConfig.responseMimeType = 'application/json';
    }

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      generationConfig
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }]
    });

    const responseText = result.response.text();
    if (!responseText) {
      throw new Error('Gemini returned an empty response.');
    }

    return responseText;
  } catch (error) {
    throw new Error(`Gemini API Error: ${error.message}`);
  }
}
