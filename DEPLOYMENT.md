# Deploying to GitHub Pages

This guide explains how to deploy your UAT board app to GitHub Pages.

## Quick Setup

### 1. Configure GitHub Secrets

Your environment variables need to be stored as GitHub repository secrets so they're available during the build:

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add these four secrets:

| Secret Name | Value |
|------------|-------|
| `VITE_GITHUB_OWNER` | Your GitHub username |
| `VITE_GITHUB_REPO` | This repository name (same repo) |
| `VITE_GITHUB_TOKEN` | Your GitHub personal access token |
| `VITE_GITHUB_BRANCH` | `data` (or your branch name for data storage) |
| `VITE_ADMIN_PASSWORD` | Your admin panel password |

**Note:** The base path is automatically configured using `VITE_GITHUB_REPO`. When building for production, the site will use `/{VITE_GITHUB_REPO}` as the base path. Locally, it uses `/`.

### 2. Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. That's it! GitHub Actions will handle the deployment

### 3. Push to Deploy

```bash
git add .
git commit -m "Setup GitHub Pages deployment"
git push origin main
```

The GitHub Action will automatically:
- Build your app with the environment variables
- Deploy to GitHub Pages
- Your site will be available at: `https://your-username.github.io/your-repo-name/`

## How It Works

### Automatic Deployment
The [.github/workflows/deploy.yml](.github/workflows/deploy.yml) workflow:
- Triggers on every push to `main` branch
- Installs dependencies
- Builds the app with secrets as environment variables
- Deploys to GitHub Pages

### Account URLs
Share account-specific URLs like:
```
https://your-username.github.io/your-repo-name/account-name
```

## Manual Deployment (Optional)

If you prefer manual deployment instead of automatic:

```bash
# Build the app
npm run build

# The build folder contains your static site
# You can deploy the contents manually or use gh-pages
```

## Security Note

**Environment variables in GitHub Secrets are bundled into the static build.** They're not truly secret - anyone can view them in the browser's DevTools by inspecting the compiled JavaScript.

GitHub Secrets just prevent them from:
- Being visible in your public repository code
- Being exposed in build logs

For your use case (non-sensitive UAT data), this is acceptable.

## Troubleshooting

### Build Fails
- Check that all four secrets are set correctly
- Verify secret names match exactly (case-sensitive)
- Check the Actions tab for detailed error messages

### 404 Errors
- Verify the `base` path in [svelte.config.js](svelte.config.js) matches your repo name exactly
- Make sure it starts with `/` and has no trailing slash

### Users Can't Load Data
- Verify your GitHub token has "Contents: Read and write" permission
- Check that the `/data/` branch exists in **this repository** (create it if missing)
- Verify the token hasn't expired (or use no expiration)
- Confirm `VITE_GITHUB_REPO` matches this repository's name exactly

## Testing Locally

To test the production build locally:

```bash
npm run build
npm run preview
```

This will serve the production build at `http://localhost:4173` (without the base path applied).

## Updating Environment Variables

If you need to change any environment variables:

1. Update the secret in **Settings** → **Secrets and variables** → **Actions**
2. Go to **Actions** tab
3. Click **Deploy to GitHub Pages** workflow
4. Click **Run workflow** → **Run workflow**

The site will rebuild with the new values.
