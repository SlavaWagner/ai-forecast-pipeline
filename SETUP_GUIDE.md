# Google Ads API Setup Guide

This guide details how to configure your Google Ads API credentials to connect with `ai-forecast-pipeline`.

---

## 1. Google Cloud Project Setup
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Search for **Google Ads API** in the API Library and click **Enable**.

## 2. OAuth Consent Screen Configuration
Since this CLI accesses campaign data on behalf of your Google Ads user, you must set up the OAuth Consent Screen:
1. Navigate to **APIs & Services > OAuth consent screen**.
2. Select **External** and fill in the required App Information.
3. In the **Scopes** step, click **Add or Remove Scopes** and add:
   - `https://www.googleapis.com/auth/adwords`
4. In the **Test Users** step, add the email address of the Google account that has access to your Google Ads campaign account. This is critical if your app publishing status is "Testing".

## 3. Create OAuth Credentials
1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials** and choose **OAuth client ID**.
3. Select **Web application** as the application type.
4. Set the name (e.g. `Antigravity Forecasting Client`).
5. Under **Authorized redirect URIs**, add exactly:
   - `http://localhost:8085`
6. Click **Create** and copy the generated **Client ID** and **Client Secret**.

## 4. Retrieve Google Ads Developer Token
1. Log in to your [Google Ads Manager Account (MCC)](https://ads.google.com).
2. Go to **Tools and Settings > API Center**.
3. Apply for access if you haven't already. Copy the **Developer Token** (usually a 22-character string).

## 5. Configure the CLI
Run the following command inside the project directory:
```bash
node bin/index.js setup
```
Provide the requested details:
- **Customer ID**: Your 10-digit Google Ads account ID (without hyphens).
- **Client ID**: From step 3.
- **Client Secret**: From step 3.
- **Developer Token**: From step 4.

The program will display an authentication URL. Copy and open this URL in your browser, log in with your Google account, consent to the access permissions, and the CLI server on port `8085` will automatically receive the OAuth tokens.
Your tokens will be encrypted and saved to the local `config.json` file.
