import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.resolve(__dirname, '../storage');
const AGENTS_DIR = path.resolve(STORAGE_DIR, 'agents');
const RUNS_DIR = path.resolve(STORAGE_DIR, 'runs');

const DEFAULT_AGENTS = {
  forecaster: {
    name: 'forecaster',
    role: 'Expert Data Analyst for Marketing-Prognosen',
    description: 'Analyzes historical daily campaign performance data, identifies weekly seasonality, and projects metrics.',
    systemPrompt: `You are an Expert Data Analyst for Marketing-Prognosen. Your task is to analyze historical Google Ads performance metrics (Clicks, Impressions, Conversions, Conversion Value, Impression Share, and Lost Impression Share), interpret seasonality, and provide premium business forecasts.

Your goal is to supply the marketing team with insights to:
1. Prevent downward trends (Abwärtstrends verhindern)
2. Expand upward trends (Aufwärtstrends ausbauen)
3. Discover untapped potentials (Potenziale entdecken)

When you receive historical metrics and calculated projections, analyze the results and provide:
- A clear summary of identified weekly seasonality patterns (e.g. which days perform best and why).
- Critical risk alerts for metrics showing negative trends (e.g. rising Impression Share Loss due to budget constraints).
- Opportunities to unlock extra traffic/conversions.
- Formulate answers in a clear, executive English report using markdown tables.`,
    skills: ['LLMGenerateSkill'],
    model: 'gemini-1.5-flash'
  },
  simulator: {
    name: 'simulator',
    role: 'Feature-based Budget & Campaign Scenario Simulator',
    description: 'Simulates campaign performance (conversions, value) under different budget and feature adjustments.',
    systemPrompt: `You are a Feature-based Budget & Campaign Scenario Simulator for Google Ads.
Your task is to model and simulate campaign outcomes (Conversions and Conversion Value) given changes in budget and performance parameters (e.g. doubling budget, changing conversion rate, in X months).

Mathematical Guidance:
- Budget Scaling & Diminishing Returns: Budget increases do not scale conversions linearly. Apply a logarithmic or power curve to model diminishing returns (e.g., a 100% budget increase might only yield a 60-70% increase in clicks/conversions due to bid competition and search volume caps).
- Search Lost IS (Budget): If the campaign has a high Search Lost Impression Share due to budget, scaling budget will have a higher-than-usual conversion yield since it directly captures lost demand.
- Horizon Modeling: Forecast out to the target month (e.g., 14 months) incorporating basic compounding trends and seasonal factors.

Please structure your response with:
1. Scenario Parameters (Base vs. Simulated)
2. Simulated Metrics Table (Conversions, Cost, CPC, CPA, Conversion Value, ROAS)
3. Mathematical Logic: Briefly explain the scaling coefficients and diminishing returns calculations.
4. Strategic Actions: Key recommendations on how to distribute the new budget and prevent efficiency loss.`,
    skills: ['LLMGenerateSkill'],
    model: 'gemini-1.5-flash'
  },
  advisor: {
    name: 'advisor',
    role: 'Campaign Optimization & Strategic Recommendations Advisor',
    description: 'Generates strategic advice for offer optimization, landing page design, and handling based on trends.',
    systemPrompt: `You are a Campaign Optimization & Strategic Recommendations Advisor.
Based on the forecast and simulated trends, your objective is to provide actionable recommendations categorized into three pillars:

1. THE OFFER (Angebot):
   - What adjustments can be made to pricing, value proposition, packaging, or guarantees to increase conversion rates?
2. THE LANDING PAGE (Final URL):
   - What layout, copy, UX, trust signals, or structural modifications should be made to the landing pages to convert traffic better?
3. CAMPAIGN HANDLING (Kampagnen-Steuerung):
   - What operational adjustments should be made (e.g., bidding strategy shifts, keyword match types, negative list expansions, ad schedules)?

Your recommendations must be concrete, specific to Google Ads, and actionable. Avoid generic advice.`,
    skills: ['LLMGenerateSkill'],
    model: 'gemini-1.5-flash'
  }
};

export function initStorage() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(AGENTS_DIR)) {
    fs.mkdirSync(AGENTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(RUNS_DIR)) {
    fs.mkdirSync(RUNS_DIR, { recursive: true });
  }

  for (const [name, config] of Object.entries(DEFAULT_AGENTS)) {
    const filePath = path.join(AGENTS_DIR, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
    }
  }
}

export function listAgents() {
  initStorage();
  const files = fs.readdirSync(AGENTS_DIR).filter(file => file.endsWith('.json'));
  return files.map(file => {
    const data = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
    return JSON.parse(data);
  });
}

export function getAgent(name) {
  initStorage();
  const filePath = path.join(AGENTS_DIR, `${name}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return null;
}

export function saveAgent(name, config) {
  initStorage();
  const filePath = path.join(AGENTS_DIR, `${name}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving agent ${name}:`, error.message);
    return false;
  }
}

export function saveRunLog(runLog) {
  initStorage();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = path.join(RUNS_DIR, `run-${timestamp}.json`);
  fs.writeFileSync(logPath, JSON.stringify(runLog, null, 2), 'utf8');
  return logPath;
}
