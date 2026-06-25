# ai-forecast-pipeline: Google Ads AI Forecasting & Budget Simulation CLI

`ai-forecast-pipeline` is a persistent AI agent CLI tool built to analyze historical daily performance metrics (Clicks, Impressions, Conversions, Conversion Value, Impression Share, and Lost Impression Share) from the Google Ads API, execute Exponentielle Glättung (ETS) weekly seasonality projections, and simulate strategic budget scaling scenarios.

All model execution runs locally inside your CLI using the **Antigravity Agent Bridge**, removing any dependency on an external Gemini API key.

---

## Key Features & Architecture

This CLI integrates three persistent AI Agents working in concert:

1. **Expert Data Analyst Agent (`forecaster`)**:
   - Analyzes weekly seasonality indices ($S_i$) and linear regression trends calculated by the local ETS engine.
   - Diagnoses traffic constraints, performance declines, and search impression shares.
   
2. **Budget & Campaign Scenario Simulator Agent (`simulator`)**:
   - Models campaign scaling results (Conversions and Conversion Value) over custom horizons (e.g. 14 months).
   - Incorporates diminishing returns (logarithmic/power curve models) and historical budget bottlenecks.

3. **Strategic Recommendations Advisor Agent (`advisor`)**:
   - Supplies concrete action plans categorized into:
     - **The Offer**: Pricing adjustments, guarantees, packaging.
     - **The Landing Page**: CRO improvements, layout adjustments, trust signals.
     - **Campaign Handling**: Bidding strategies, match types, ad scheduling.

---

## Installation & Setup

### 1. Prerequisites
- **Node.js**: Ensure Node.js (v18+) is installed.
- **Google Ads API Credentials**: Setup a Google Cloud project with the Google Ads API enabled and configure OAuth2 credentials. Set your redirect URI to: `http://localhost:8085`.

### 2. Clone & Install Dependencies
Install all package dependencies from the npm registry:
```bash
cd ai-forecast-pipeline
npm install
```
*Note: This project does not embed copy-pasted third-party client libraries. It fetches verified packages dynamically from npm to ensure full licensing compliance.*

### 3. Setup Credentials
Run the interactive credentials setup tool:
```bash
node bin/index.js setup
```
Enter your Client ID, Client Secret, Customer ID, and Developer Token. The setup tool will open a web browser to complete Google Ads OAuth2 consent and save access tokens to `config.json`.

---

## Command Reference

You can invoke commands directly or start the interactive CLI dashboard:

* **Interactive Terminal Dashboard**:
  ```bash
  node bin/index.js dashboard
  ```
  *(Launches the beautiful interactive start screen in your terminal. You can navigate, run forecasting, or inspect agent settings using your arrow keys).*

* **Run Forecasting Pipeline**:
  ```bash
  node bin/index.js run-workflow
  ```
  - Prompts for Forecast Period and Seasonality Pattern in days.
  - Queries daily campaign metrics from the Google Ads API.
  - Calculates ETS and runs the AI Forecaster and Strategy Advisor.
  - Compiles a complete markdown report to `storage/runs/`.
  
* **Run Budget Scaling Simulation**:
  ```bash
  node bin/index.js predictions
  ```
  - Simulates campaign yield for custom months (e.g. 14 months) with a budget multiplier (e.g. 2.0x for double budget) and Conversion Rate (CVR) improvements.

* **List AI Agents**:
  ```bash
  node bin/index.js agent list
  ```

* **Verify Installation**:
  ```bash
  npm test
  ```
  Runs automated storage verification and ETS calculations tests.

