# ai-forecast-pipeline: Google Ads AI Forecasting & Budget Simulation CLI

`ai-forecast-pipeline` is a persistent AI agent CLI tool built to analyze historical daily performance metrics (Clicks, Impressions, Conversions, Conversion Value, Impression Share, and Lost Impression Share) from the Google Ads API, execute Exponentielle Glättung (ETS) weekly seasonality projections, and simulate strategic budget scaling scenarios.

All model execution runs locally inside your CLI using the **Antigravity Agent Bridge**, removing any dependency on an external Gemini API key.

> [!IMPORTANT]
> **Prerequisite for AI Processing:**
> Please start Google Antigravity beforehand using the command **`agy`** in your console!
> Interactive chat sessions, asset generation workflows, and AI processing run exclusively **INSIDE the Antigravity CLI**. In a standard terminal shell outside Antigravity, no AI processing takes place, and static execution outputs are intercepted with a guidance notice.

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

## CLI & Agent Command Reference

Alle Befehle werden innerhalb der Google Antigravity CLI (`agy`) ausgeführt:

| Befehl | Argumente / Optionen | Kurzbeschreibung |
| :--- | :--- | :--- |
| `node bin/index.js` / `dashboard` | Keine | Startet das interaktive Terminal-Dashboard zur menügeführten Navigation, Statusüberprüfung und Workflow-Ausführung. |
| `node bin/index.js run-workflow` | `--sandbox` (`-s`) | Führt die vollständige Zeitreihen-Prognose (ETS Exponentielle Glättung, Saisonalitätsindizes, Impression Share Verlustdiagnose) auf Google Ads API Daten durch und erstellt den Prognose-Report in `storage/runs/`. |
| `node bin/index.js predictions` | Keine *(interaktive Abfrage von Budget-Multiplikator & CVR)* | Simuliert Budget-Skalierungsszenarien über Zeithorizonte (z. B. 14 Monate) unter Berücksichtigung von Grenzerträgen (Log-Return Curves). |
| `node bin/index.js chat` | `[agentName]` | Startet eine interaktive Chat-Session mit den persistenten Agenten (`forecaster`, `simulator`, `advisor`). |
| `node bin/index.js agent list` | Keine | Listet alle persistenten Forecasting-Agenten mit Rolle, Prompt und Parametern auf. |
| `node bin/index.js agent view <name>` | `<name>` | Zeigt den detaillierten System-Prompt und die ökonometrischen Modellregeln des angegebenen Agenten an. |
| `node bin/index.js setup` | Keine | Interaktiver Konfigurationsassistent für Google Ads API Credentials und OAuth2-Autorisierung auf Port 8085. |

### Beteiligte KI-Agenten

*   **`forecaster` (Expert Data Analyst Agent)**: Berechnet Trend- und Saisonalitätsmuster ($S_i$), analysiert Klick-, Impression- und Conversion-Historien sowie Lost Impression Shares.
*   **`simulator` (Budget & Campaign Scenario Simulator Agent)**: Modelliert zukünftige Skalierungsergebnisse bei Budgeterhöhungen (z. B. $2\times$) unter Einbeziehung sinkender Grenzerträge.
*   **`advisor` (Strategic Recommendations Advisor Agent)**: Formuliert konkrete operative Handlungsempfehlungen für Offer, Landing Page und Bidding-Strategien.

#### Anwendungsbeispiele:

```bash
# 1. Interaktives Terminal-Dashboard aufrufen:
node bin/index.js dashboard

# 2. Prognose-Workflow im Sandbox-Modus ausführen:
node bin/index.js run-workflow --sandbox

# 3. Live Google Ads Account Forecast berechnen:
node bin/index.js run-workflow

# 4. Budget-Skalierungs-Simulation starten:
node bin/index.js predictions

# 5. Mit dem Data Analyst Agenten chatten:
node bin/index.js chat forecaster
```

---

This AI Agent was created with the help of Google Antigravity CLI


