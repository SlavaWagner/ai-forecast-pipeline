#!/usr/bin/env node

import { Command } from 'commander';
import { input, select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import http from 'http';
import { URL, fileURLToPath } from 'url';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

import { getConfig, saveConfig, getAccessToken, refreshAccessToken } from '../src/config.js';
import { listAgents, getAgent, saveAgent, saveRunLog, initStorage } from '../src/storage.js';
import { calculateETSForecast } from '../src/forecaster.js';
import { fetchActiveCampaigns, fetchCampaignDailyMetrics } from '../src/googleAds.js';
import ForecastingAgent from '../src/agents/ForecastingAgent.js';
import BudgetSimulationAgent from '../src/agents/BudgetSimulationAgent.js';
import RecommendationAgent from '../src/agents/RecommendationAgent.js';

// Initialize storage folders and default agent configurations
initStorage();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to generate the 3D ASCII forecasting graph logo
function getAsciiLogo() {
  const purple = chalk.hex('#a855f7');
  const blue = chalk.hex('#3b82f6');
  const cyan = chalk.hex('#06b6d4');
  
  return [
    '',
    purple("                 ▲"),
    purple("               / |") + blue("     +---+"),
    purple("             /   |") + blue("    /   /|"),
    purple("           /     |") + blue("  +---+ |") + cyan("     +---+"),
    purple("         /       |") + blue("  |   |/ ") + cyan("    /   /|"),
    purple("       /         |") + blue("  +---+  ") + cyan("  +---+ |"),
    purple("     /           |") + cyan("         |   |/"),
    purple("   /             |") + cyan("         +---+"),
    purple("  +--------------+-------------------->"),
    purple("  0              7              14    (Days)"),
    '',
    chalk.bold.magenta('=== ai-forecast-pipeline - Google Ads AI Forecast & Simulation ==='),
    chalk.cyan('Optimized for strategic growth and preventing downward trends'),
    chalk.gray('Created via Google Antigravity CLI | Fully compliance-validated'),
    ''
  ].join('\n');
}

/**
 * Generates realistic campaign performance metrics for testing
 * @param {number} days - Days of history
 * @returns {Array<object>} Daily metrics
 */
function generateMockCampaignData(days = 30) {
  const history = [];
  const weekdaysList = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();

  // Baseline values
  const baseClicks = 150;
  const baseCtr = 0.06;
  const baseCvr = 0.03;
  const baseAov = 110.0; // Average Order Value
  const trendSlope = 0.8; // General positive trend

  // Seasonality multiplier: Weekdays are higher, weekends are lower
  const seasonality = {
    'Sunday': 0.65,
    'Monday': 1.15,
    'Tuesday': 1.25,
    'Wednesday': 1.20,
    'Thursday': 1.10,
    'Friday': 0.95,
    'Saturday': 0.70
  };

  for (let i = days; i > 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const weekday = weekdaysList[d.getDay()];
    const dateStr = d.toISOString().split('T')[0];

    const mult = seasonality[weekday] + (Math.random() * 0.1 - 0.05);
    const trendFactor = 1 + (days - i) * (trendSlope / days);

    const clicks = Math.round(baseClicks * mult * trendFactor);
    const impressions = Math.round(clicks / baseCtr);
    const conversions = Math.round(clicks * baseCvr * 10) / 10;
    const value = Math.round(conversions * baseAov * 100) / 100;
    
    // Add budget loss: weekends have lower budget loss, weekdays have higher
    const lostIS = weekday === 'Tuesday' || weekday === 'Wednesday' ? 0.35 : 0.15;
    const activeIS = 0.60;

    history.push({
      date: dateStr,
      weekday,
      clicks,
      impressions,
      conversions,
      conversionValue: value,
      impressionShare: activeIS,
      lostImpressionShare: lostIS
    });
  }

  return history;
}

const program = new Command();

program
  .name('ai-forecast-pipeline')
  .description('Google Ads AI Forecasting & Budget Simulation CLI')
  .version('1.0.0');

program.addHelpText('before', getAsciiLogo());

// SETUP Command
program
  .command('setup')
  .description('Setup Google Ads API Credentials and Authorize OAuth2')
  .action(async () => {
    console.log(chalk.bold.cyan('\n=== Google Ads Credentials Setup ===\n'));

    const current = getConfig();

    try {
      const customerId = await input({
        message: 'Google Ads Customer ID (10-digit, e.g. 123-456-7890):',
        default: current.customerId
      });

      const clientId = await input({
        message: 'Google Ads Client ID (OAuth):',
        default: current.clientId
      });

      const clientSecret = await input({
        message: 'Google Ads Client Secret:',
        default: current.clientSecret
      });

      const developerToken = await input({
        message: 'Google Ads Developer Token:',
        default: current.developerToken
      });

      const loginCustomerId = await input({
        message: 'Manager Login Customer ID (Optional, press enter to skip):',
        default: current.loginCustomerId || ''
      });

      // Save initial variables first
      const updatedConfig = {
        ...current,
        customerId,
        clientId,
        clientSecret,
        developerToken,
        loginCustomerId
      };
      saveConfig(updatedConfig);

      console.log(chalk.yellow('\nStarting OAuth2 Authorization Server...'));

      const redirectUri = 'http://localhost:8085';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=https://www.googleapis.com/auth/adwords&access_type=offline&prompt=consent`;

      console.log(chalk.green('\nPlease open the following link in your web browser to authorize access:\n'));
      console.log(chalk.underline.blue(authUrl));
      console.log(chalk.gray('\nWaiting for authorization on port 8085 (timeout in 3 minutes)...'));

      let oauthCode = '';

      const getAuthCodePromise = new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
          try {
            const urlObj = new URL(req.url, 'http://localhost:8085');
            const code = urlObj.searchParams.get('code');
            if (code) {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end('<h1>Authentication successful!</h1><p>You can close this tab now and return to your CLI terminal.</p>');
              resolve(code);
            } else {
              res.writeHead(400);
              res.end('Authentication failed: No code found in URL parameters.');
              reject(new Error('No code received.'));
            }
          } catch (err) {
            reject(err);
          } finally {
            server.close();
          }
        });

        server.setTimeout(180000);
        server.on('timeout', () => {
          server.close();
          reject(new Error('OAuth timeout after 3 minutes.'));
        });

        server.listen(8085, (err) => {
          if (err) reject(err);
        });
      });

      try {
        oauthCode = await getAuthCodePromise;
        console.log(chalk.green('✔ Authorization code successfully received!'));
      } catch (authError) {
        console.log(chalk.red(`\nAutomatic redirect failed: ${authError.message}`));
        console.log(chalk.cyan('To enter the code manually, open the URL in your browser, copy the "code" parameter from the redirect URL, and paste it here:'));
        oauthCode = await input({ message: 'Enter authorization code manually:' });
      }

      if (!oauthCode) {
        throw new Error('No authorization code provided.');
      }

      console.log(chalk.yellow('Exchanging code for Refresh Token...'));

      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code: oauthCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      });

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      if (!refresh_token) {
        console.log(chalk.yellow('\nWARNING: No Refresh Token was returned. If you have already consented, you may need to revoke app permissions in Google Account Settings first.'));
      }

      const finalConfig = getConfig();
      finalConfig.accessToken = access_token;
      if (refresh_token) {
        finalConfig.refreshToken = refresh_token;
      }
      finalConfig.tokenExpiry = Date.now() + (expires_in - 300) * 1000;

      saveConfig(finalConfig);

      console.log(chalk.bold.green('\n✔ Setup completed successfully! Your credentials have been saved to config.json.'));
      console.log(chalk.green(`OAuth2 Access Token acquired, valid until: ${new Date(finalConfig.tokenExpiry).toLocaleTimeString()}\n`));

    } catch (error) {
      console.error(chalk.bold.red('\n✖ Setup failed:'), error.response ? JSON.stringify(error.response.data) : error.message);
    }
  });

// RUN WORKFLOW Command
program
  .command('run-workflow')
  .description('Run the core forecasting workflow: ETS projection + AI strategic analysis')
  .option('-s, --sandbox', 'Force Demo Sandbox mode with simulated data')
  .action(async (options) => {
    console.log(chalk.bold.magenta('\n=== Google Ads AI Forecasting Workflow ===\n'));

    const config = getConfig();
    let historicalData = [];
    let isSandbox = !!options.sandbox;

    // Verify Google Ads credentials if not forcing sandbox
    if (!isSandbox) {
      if (!config.refreshToken) {
        console.log(chalk.yellow('Google Ads credentials not configured. Running in Demo Sandbox mode...'));
        isSandbox = true;
      } else {
        try {
          console.log(chalk.yellow('Validating Google Ads OAuth2 Connection...'));
          const token = await getAccessToken();
          console.log(chalk.green('✔ Connection authenticated.'));
          
          console.log(chalk.yellow('Fetching active campaigns...'));
          const campaigns = await fetchActiveCampaigns(config, token);
          
          if (campaigns.length === 0) {
            console.log(chalk.yellow('No enabled campaigns found. Falling back to Demo Sandbox mode...'));
            isSandbox = true;
          } else {
            // Select Campaign
            const campaignChoice = await select({
              message: 'Select a campaign to forecast:',
              choices: campaigns.map(c => ({ name: `${c.name} (ID: ${c.id})`, value: c.id }))
            });

            const daysToFetch = await input({
              message: 'Enter number of days of history to retrieve (e.g. 30):',
              default: '30'
            });

            console.log(chalk.yellow('Querying daily metrics from Google Ads API...'));
            historicalData = await fetchCampaignDailyMetrics(config, token, campaignChoice, parseInt(daysToFetch, 10));
          }
        } catch (apiErr) {
          console.log(chalk.red(`Google Ads API failed: ${apiErr.message}`));
          const proceedSandbox = await confirm({
            message: 'Would you like to fall back to Demo Sandbox mode with mock campaign data?',
            default: true
          });
          if (!proceedSandbox) {
            console.log(chalk.yellow('Aborting workflow.'));
            return;
          }
          isSandbox = true;
        }
      }
    }

    if (isSandbox) {
      console.log(chalk.green('\n[SANDBOX] Generating 30 days of historical campaign data...'));
      historicalData = generateMockCampaignData(30);
    }

    // Input Forecasting Parameters
    const forecastDaysStr = await input({
      message: 'Enter the forecast period in days (e.g., 14):',
      default: '14'
    });
    const forecastDays = parseInt(forecastDaysStr, 10) || 14;

    const seasonalityDaysStr = await input({
      message: 'Enter seasonality cycle in days (e.g., 7 for weekly pattern):',
      default: '7'
    });
    const seasonalityDays = parseInt(seasonalityDaysStr, 10) || 7;

    console.log(chalk.yellow('\nExecuting Local Exponentielle Glättung (ETS) Engine...'));
    const results = calculateETSForecast(historicalData, forecastDays);
    
    // Display Forecast Table
    console.log(chalk.bold.green('\n=== Local ETS Forecast Projections ===\n'));
    console.log(chalk.bold('Date       | Weekday   | Clicks | Impressions | Conversions | Value   | Seasonality Si'));
    console.log('-----------|-----------|--------|-------------|-------------|---------|---------------');
    results.forecast.forEach(f => {
      const date = f.date;
      const day = f.weekday.padEnd(9).substring(0, 9);
      const clicks = f.predicted_clicks.toString().padStart(6);
      const imps = f.predicted_impressions.toString().padStart(11);
      const convs = f.predicted_conversions.toFixed(1).toString().padStart(11);
      const val = `€${f.predicted_conversion_value.toFixed(0)}`.padStart(7);
      const si = f.seasonality_index.toFixed(3).padStart(13);
      console.log(`${date} | ${day} | ${clicks} | ${imps} | ${convs} | ${val} | ${si}`);
    });
    console.log();

    // Load AI Agents
    console.log(chalk.yellow('Loading AI Forecasting & Strategy Agents...'));
    const forecaster = new ForecastingAgent();
    const advisor = new RecommendationAgent();
    console.log(chalk.green('✔ Agents loaded.'));

    try {
      console.log(chalk.cyan('\nStarting AI Forecasting Analysis (running via Antigravity)...'));
      const analysisReport = await forecaster.analyzeForecast(historicalData, results.forecast, results.avgMetrics);
      
      console.log(chalk.bold.green('\n=== AI Analyst Report ===\n'));
      console.log(analysisReport);

      console.log(chalk.cyan('\nRequesting strategic Offer, LP, and Handling advice...'));
      const recommendations = await advisor.generateRecommendations(analysisReport);

      console.log(chalk.bold.green('\n=== Strategic Optimization Recommendations ===\n'));
      console.log(recommendations);

      // Save persist log
      const runLog = {
        timestamp: new Date().toISOString(),
        isSandbox,
        parameters: { forecastDays, seasonalityDays },
        historicalDataSummary: {
          days: historicalData.length,
          totalClicks: historicalData.reduce((acc, c) => acc + c.clicks, 0),
          totalConversions: historicalData.reduce((acc, c) => acc + c.conversions, 0)
        },
        forecast: results.forecast,
        aiAnalysis: analysisReport,
        aiRecommendations: recommendations
      };
      
      const logPath = saveRunLog(runLog);
      console.log(chalk.green(`\n✔ Full execution run logged to storage:\n  ${logPath}`));

      const reportPath = path.resolve(__dirname, `../storage/runs/forecast-report-${Date.now()}.md`);
      const mdReport = `
# Google Ads Performance & Forecast Report
*Generated: ${new Date().toLocaleString()}*

## 1. Executive Summary
- Mode: ${isSandbox ? 'Demo Sandbox' : 'Google Ads API Connection'}
- Forecast Horizon: ${forecastDays} days
- Seasonality Cycle: ${seasonalityDays} days

## 2. Calculated ETS Forecast Projections
| Date | Weekday | Projected Clicks | Projected Impressions | Projected Conversions | Projected Value | Seasonality Index |
|---|---|---|---|---|---|---|
${results.forecast.map(f => `| ${f.date} | ${f.weekday} | ${f.predicted_clicks} | ${f.predicted_impressions} | ${f.predicted_conversions.toFixed(2)} | €${f.predicted_conversion_value.toFixed(2)} | ${f.seasonality_index.toFixed(3)} |`).join('\n')}

## 3. AI Performance & Trend Analysis
${analysisReport}

## 4. Operational & Offer Optimization Recommendations
${recommendations}
`;
      fs.writeFileSync(reportPath, mdReport, 'utf8');
      console.log(chalk.green(`✔ Detailed Markdown report compiled:\n  ${reportPath}\n`));

    } catch (llmErr) {
      console.error(chalk.red(`\n✖ AI Agent Bridge execution failed: ${llmErr.message}`));
    }
  });

// PREDICTIONS / SIMULATION Command
program
  .command('predictions')
  .description('Run a feature-based budget & Conversion simulation scenario')
  .option('-s, --sandbox', 'Force Sandbox mode with simulated baseline data')
  .action(async (options) => {
    console.log(chalk.bold.magenta('\n=== AI Budget & CVR Scaling Simulator ===\n'));

    const config = getConfig();
    let historicalData = [];
    let isSandbox = !!options.sandbox;

    if (!isSandbox) {
      if (!config.refreshToken) {
        console.log(chalk.yellow('No active credentials. Running in Demo Sandbox mode...'));
        isSandbox = true;
      } else {
        try {
          console.log(chalk.yellow('Connecting to Google Ads API...'));
          const token = await getAccessToken();
          const campaigns = await fetchActiveCampaigns(config, token);
          if (campaigns.length === 0) {
            isSandbox = true;
          } else {
            const campaignChoice = await select({
              message: 'Select campaign for scaling simulation:',
              choices: campaigns.map(c => ({ name: `${c.name} (ID: ${c.id})`, value: c.id }))
            });
            historicalData = await fetchCampaignDailyMetrics(config, token, campaignChoice, 30);
          }
        } catch (err) {
          console.log(chalk.yellow(`API error: ${err.message}. Falling back to Demo Sandbox mode...`));
          isSandbox = true;
        }
      }
    }

    if (isSandbox) {
      historicalData = generateMockCampaignData(30);
    }

    // Input Simulator Features
    const monthsStr = await input({
      message: 'Enter simulation target horizon in months (e.g. 14):',
      default: '14'
    });
    const months = parseInt(monthsStr, 10) || 14;

    const budgetMultiplierStr = await input({
      message: 'Enter budget change multiplier (e.g. 2.0 for doubling, 1.5 for +50%):',
      default: '2.0'
    });
    const budgetMultiplier = parseFloat(budgetMultiplierStr) || 2.0;

    const cvrStr = await input({
      message: 'Enter expected Conversion Rate (CVR) relative change percentage (e.g. 10 for +10% improvement, or 0):',
      default: '0'
    });
    const cvrChange = parseFloat(cvrStr) || 0;

    console.log(chalk.yellow('\nLoading Budget Simulation Agent...'));
    const simulator = new BudgetSimulationAgent();

    try {
      console.log(chalk.cyan('Running Scaling Simulation Model...'));
      const simReport = await simulator.simulateScenario(historicalData, months, budgetMultiplier, cvrChange);

      console.log(chalk.bold.green('\n=== Scaling Simulation Report ===\n'));
      console.log(simReport);

      const reportPath = path.resolve(__dirname, `../storage/runs/simulation-${Date.now()}.md`);
      fs.writeFileSync(reportPath, simReport, 'utf8');
      console.log(chalk.green(`✔ Simulation report saved persistently:\n  ${reportPath}\n`));
    } catch (simErr) {
      console.error(chalk.red(`\n✖ Simulation execution failed: ${simErr.message}`));
    }
  });

// AGENT CLI Commands
const agentCmd = program.command('agent').description('Manage persistent agent system settings');

agentCmd
  .command('list')
  .description('List registered AI Agents')
  .action(() => {
    console.log(chalk.bold.magenta('\n=== Registered AI Agents ===\n'));
    const agents = listAgents();
    agents.forEach(agent => {
      console.log(chalk.bold.green(`Agent:      ${agent.name}`));
      console.log(`Role:       ${agent.role}`);
      console.log(`Model:      ${agent.model}`);
      console.log(`Summary:    ${agent.description}`);
      console.log(chalk.gray('---------------------------------------------'));
    });
  });

agentCmd
  .command('view <name>')
  .description('View detailed prompt configuration for a specific agent')
  .action((name) => {
    const agent = getAgent(name);
    if (!agent) {
      console.log(chalk.red(`Agent "${name}" not found.`));
      return;
    }
    console.log(chalk.bold.magenta(`\n=== Agent Profile: ${agent.name} ===\n`));
    console.log(chalk.bold.green(`Role:`) + ` ${agent.role}`);
    console.log(chalk.bold.green(`Model:`) + ` ${agent.model}`);
    console.log(chalk.bold.green(`Skills:`) + ` ${agent.skills.join(', ')}`);
    console.log(chalk.bold.green(`System Prompt:`));
    console.log(chalk.gray(agent.systemPrompt));
    console.log();
  });

agentCmd
  .command('set-prompt <name> <prompt>')
  .description('Update system prompt of an agent')
  .action((name, prompt) => {
    const agent = getAgent(name);
    if (!agent) {
      console.log(chalk.red(`Agent "${name}" not found.`));
      return;
    }
    agent.systemPrompt = prompt;
    if (saveAgent(name, agent)) {
      console.log(chalk.green(`✔ Prompt for Agent "${name}" successfully updated.`));
    } else {
      console.log(chalk.red('✖ Failed to save prompt.'));
    }
  });

// Interactive Dashboard Menu helper
async function showInteractiveDashboard() {
  console.clear();
  console.log(getAsciiLogo());
  
  const config = getConfig();
  console.log(chalk.bold.cyan('--- Environment Status ---'));
  console.log(`Google Ads Customer ID:  ${chalk.green(config.customerId || 'Not configured')}`);
  console.log(`Connection Status:       ${config.refreshToken ? chalk.green('Authorized ✔') : chalk.yellow('Unconfigured (Will use sandbox demo) ⚠')}`);
  console.log(`Stored Agents:           ${chalk.magenta('forecaster, simulator, advisor')}`);
  console.log(chalk.gray('---------------------------\n'));

  const choice = await select({
    message: 'Select action to execute:',
    choices: [
      { name: '1. Run Forecasting Pipeline (run-workflow)', value: 'run-workflow' },
      { name: '2. Run Scaling & Budget Simulation (predictions)', value: 'predictions' },
      { name: '3. Setup Google Ads API Connection (setup)', value: 'setup' },
      { name: '4. List Registered AI Agents', value: 'list-agents' },
      { name: '5. Exit', value: 'exit' }
    ]
  });

  if (choice === 'run-workflow') {
    await program.commands.find(c => c.name() === 'run-workflow').parseAsync(['node', 'index.js', 'run-workflow']);
    await pressEnterToContinue();
  } else if (choice === 'predictions') {
    await program.commands.find(c => c.name() === 'predictions').parseAsync(['node', 'index.js', 'predictions']);
    await pressEnterToContinue();
  } else if (choice === 'setup') {
    await program.commands.find(c => c.name() === 'setup').parseAsync(['node', 'index.js', 'setup']);
    await pressEnterToContinue();
  } else if (choice === 'list-agents') {
    console.log(chalk.bold.magenta('\n=== Stored Agents ===\n'));
    listAgents().forEach(agent => {
      console.log(chalk.bold.green(`Agent:      ${agent.name}`));
      console.log(`Role:       ${agent.role}`);
      console.log(`Model:      ${agent.model}`);
      console.log(`Summary:    ${agent.description}`);
      console.log(chalk.gray('---------------------------------------------'));
    });
    await pressEnterToContinue();
  } else {
    console.log(chalk.cyan('Goodbye!'));
    process.exit(0);
  }

  // Loop back
  await showInteractiveDashboard();
}

async function pressEnterToContinue() {
  await input({ message: '\nPress Enter to return to Dashboard...' });
}

// DASHBOARD Command (CLI Dashboard)
program
  .command('dashboard')
  .description('Start the terminal-based interactive dashboard startup window')
  .action(async () => {
    await showInteractiveDashboard();
  });

// Handle custom dashboard command or help
program.parse(process.argv);

// If no arguments were passed, show dashboard automatically
if (!process.argv.slice(2).length) {
  showInteractiveDashboard();
}
