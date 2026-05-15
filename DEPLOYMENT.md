# Deploy to Azure App Service

This MVP is prepared for Azure App Service as a Node.js web app.

## Option A: Azure App Service + GitHub Actions

Use this when `hospital-ai-agent-mvp` is its own GitHub repository.

1. Create an Azure App Service:

```text
Publish: Code
Runtime stack: Node 20 LTS
Operating system: Linux
Region: your nearest region
Pricing plan: Basic or higher for a private demo
```

2. In Azure Portal, open the App Service and set **Configuration > Application settings**:

```text
NODE_ENV=production
OPENAI_MODEL=gpt-5.2
OPENAI_API_KEY=<your new rotated OpenAI API key>
APP_ACCESS_CODE=<private code you share separately>
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

3. In Azure Portal, download the App Service publish profile.

4. In GitHub, add this repository secret:

```text
AZURE_WEBAPP_PUBLISH_PROFILE=<contents of the downloaded publish profile>
```

5. Edit `.github/workflows/azure-app-service.yml` and set:

```text
AZURE_WEBAPP_NAME: your-actual-azure-app-service-name
```

6. Push to `main` or run the workflow manually.

7. Share the Azure URL with your brother:

```text
https://your-actual-azure-app-service-name.azurewebsites.net/
```

Send the `APP_ACCESS_CODE` separately.

## Option B: Azure App Service Custom Container

Use this if you prefer Docker.

1. Build and push the `Dockerfile` image to Azure Container Registry.
2. Create an App Service for Containers using that image.
3. Set application settings:

```text
NODE_ENV=production
WEBSITES_PORT=8787
OPENAI_MODEL=gpt-5.2
OPENAI_API_KEY=<your new rotated OpenAI API key>
APP_ACCESS_CODE=<private code>
```

## Important Demo Rules

- Use fake/demo patients until legal, security, and compliance review are done.
- Do not put the OpenAI key in frontend code, GitHub, screenshots, or chat.
- Share the URL and `APP_ACCESS_CODE` separately.
- The MVP stores drafts in memory only; an App Service restart clears them.
- This is a doctor-reviewed documentation assistant, not a final clinical record system.

## Local Azure-Like Test

```bash
NODE_ENV=production PORT=8787 APP_ACCESS_CODE=test-code npm start
```

Open:

```text
http://127.0.0.1:8787/
```

Enter `test-code` when prompted.
