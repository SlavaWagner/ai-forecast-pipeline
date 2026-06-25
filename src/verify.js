import chalk from 'chalk';
import { getAgent, listAgents, initStorage } from './storage.js';
import { calculateETSForecast } from './forecaster.js';

initStorage();

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(chalk.green(`  ✔ PASSED: ${message}`));
    passedTests++;
  } else {
    console.log(chalk.red(`  ✖ FAILED: ${message}`));
    failedTests++;
  }
}

async function runTests() {
  console.log(chalk.bold.cyan('\n=== Run local verification tests ===\n'));

  // Test 1: Stored Agent Configuration Loader
  try {
    console.log(chalk.yellow('Test 1: Agent Loader and Config Storage...'));
    const agents = listAgents();
    assert(agents.length === 3, `Expected 3 default agents, found ${agents.length}`);
    
    const forecaster = getAgent('forecaster');
    assert(forecaster !== null, 'Should be able to load forecaster agent profile');
    assert(forecaster.name === 'forecaster', `Expected agent name "forecaster", got "${forecaster?.name}"`);
    assert(forecaster.skills.includes('LLMGenerateSkill'), 'Forecaster should have LLMGenerateSkill');

    const simulator = getAgent('simulator');
    assert(simulator !== null, 'Should be able to load simulator agent profile');
    assert(simulator.name === 'simulator', `Expected agent name "simulator", got "${simulator?.name}"`);

    const advisor = getAgent('advisor');
    assert(advisor !== null, 'Should be able to load advisor agent profile');
    assert(advisor.name === 'advisor', `Expected agent name "advisor", got "${advisor?.name}"`);
  } catch (err) {
    console.log(chalk.red(`  ✖ FAILED: Agent Loader error: ${err.message}`));
    failedTests++;
  }

  // Test 2: Local ETS Forecasting Calculation Engine
  try {
    console.log(chalk.yellow('\nTest 2: Exponentielle Glättung (ETS) Engine Verification...'));
    
    // Create a simple deterministic 14-day history with weekly seasonality
    // Tuesday/Wednesday is high (200 clicks), Saturday/Sunday is low (50 clicks)
    const mockHistory = [];
    const baseDate = new Date('2026-06-01'); // Monday
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < 14; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const weekday = weekdays[d.getDay()];
      
      let clicks = 100;
      if (weekday === 'Tuesday' || weekday === 'Wednesday') clicks = 200;
      if (weekday === 'Saturday' || weekday === 'Sunday') clicks = 50;

      mockHistory.push({
        date: d.toISOString().split('T')[0],
        weekday,
        clicks,
        impressions: clicks * 15,
        conversions: clicks * 0.05,
        conversionValue: clicks * 0.05 * 100,
        impressionShare: 0.65,
        lostImpressionShare: 0.20
      });
    }

    const results = calculateETSForecast(mockHistory, 7);

    // Assert forecast array length
    assert(results.forecast.length === 7, `Expected 7 days of forecast, got ${results.forecast.length}`);

    // Assert date progression
    assert(results.forecast[0].date === '2026-06-15', `Expected first forecast date to be 2026-06-15, got ${results.forecast[0].date}`);

    // Assert seasonality indices logic
    const mondaySi = results.seasonalityIndices['Monday'].clicks;
    const tuesdaySi = results.seasonalityIndices['Tuesday'].clicks;
    const sundaySi = results.seasonalityIndices['Sunday'].clicks;

    assert(tuesdaySi > mondaySi, 'Tuesday click seasonality should be higher than Monday');
    assert(sundaySi < mondaySi, 'Sunday click seasonality should be lower than Monday');

    // Assert prediction values are sane (positive and clamped)
    assert(results.forecast.every(f => f.predicted_clicks >= 0), 'All click predictions must be non-negative');
    assert(results.forecast.every(f => f.predicted_conversions >= 0), 'All conversion predictions must be non-negative');
    assert(results.forecast.every(f => f.predicted_conversion_value >= 0), 'All conversion value predictions must be non-negative');
  } catch (err) {
    console.log(chalk.red(`  ✖ FAILED: ETS Engine test error: ${err.message}`));
    failedTests++;
  }

  // Summary
  console.log(chalk.bold.cyan('\n=== Test Summary ==='));
  console.log(chalk.bold.green(`Passed: ${passedTests}`));
  if (failedTests > 0) {
    console.log(chalk.bold.red(`Failed: ${failedTests}`));
    process.exit(1);
  } else {
    console.log(chalk.bold.green('All tests passed successfully!'));
    process.exit(0);
  }
}

runTests();
