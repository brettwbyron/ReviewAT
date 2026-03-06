# How to use this demo (read-only)

## Sign in

Click the "Admin Login" and use the password `admin` to log in as an administrator. I have permissions for this demo site set to "read only", so you will see errors if you try to make an account or make any changes to the demo account's data.

You can log into the Demo account as a user by going to the demo account page (https://brettwbyron.github.io/ReviewAT/demo) and use the password `guest` to log in as a user.

## GitHub UAT Board Setup Instructions

This guide walks you through configuring the UAT board to use GitHub for data storage with password protection.

## Prerequisites

- GitHub account
- This repository (user account data will be stored in the `VITE_GITHUB_BRANCH` secret, by default `data`, branch)
- Basic understanding of GitHub personal access tokens

## Step 1: Create GitHub Personal Access Token

1. Go to **GitHub Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
2. Click **Generate new token**
3. Configure the token:
   - **Name**: UAT Board Data Access
   - **Expiration**: **No expiration** (recommended - see note below)
   - **Repository access**: Select "Only select repositories" and choose your UAT app repository
   - **Permissions**: 
     - Repository permissions → Contents: **Read and write**
4. Click **Generate token**
5. **IMPORTANT**: Copy the token immediately - you won't be able to see it again!

### Why "No expiration"?

Since the token is embedded in client-side code (visible in browser DevTools), token expiration provides **no security benefit** - anyone can extract the token regardless of when it expires.

**With expiration**: Every time the token expires, you must:
- Generate a new token
- Update `.env` 
- Rebuild the app
- Redeploy to GitHub Pages
- All accounts are affected simultaneously

**Without expiration**: The token works indefinitely with no maintenance required.

Token expiration is designed for **server-side secrets** where rotation adds security. For client-side tokens that are already exposed, expiration only creates unnecessary maintenance burden without improving security.

## Step 2: Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_GITHUB_OWNER=your-github-username
VITE_GITHUB_REPO=uat-app
VITE_GITHUB_TOKEN=github_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_GITHUB_BRANCH=data
VITE_ADMIN_PASSWORD=your-secure-admin-password
```

**Important Notes:**
- ⚠️ **The `.env` file is NOT truly secure** - Vite bundles these values into the client code
- These are visible in browser DevTools just like hardcoded values
- The `.env` file is mainly for organization and keeping secrets out of version control
- **Never commit `.env` to git** - it's already in `.gitignore`
- For production builds on GitHub Pages, you'll need to set these as repository secrets or build environment variables

## Step 3: Create Data Directory

In your GitHub repository, create a `data` branch and `/data/` directory within that branch:

1. Go to your repository on GitHub
2. Click **Add file** → **Create new file**
3. Type `data/.gitkeep` as the filename
4. Commit the file

This directory will store account data files.

## Step 4: Deploy to GitHub Pages

1. In your repository, go to **Settings** → **Pages**
2. Under **Source**, select your branch (usually `main`)
3. Click **Save**
4. Wait a few minutes for the deployment to complete
5. Your app will be available at: `https://your-username.github.io/your-repo-name/`

## Step 5: Share Customer URLs

Give each account a unique URL with their account ID:

```
https://your-username.github.io/uat-app/account-name
```

For example:
- Customer "Acme Corp" → `/acme-corp`
- Customer "Widget Inc" → `/widget-inc`

## Password Management

### First Time Access
When a user visits their URL for the first time:
1. They enter a password of their choice
2. The system creates a new data file: `/data/account-name.json`
3. The password is hashed with SHA-256 and stored in the file

### Subsequent Access
1. Customer enters their password
2. System hashes it and compares with stored hash
3. If match, data is loaded and auto-saved

### Important Notes
- **Passwords are hashed**: Only the SHA-256 hash is stored, not the plaintext password
- **No password recovery**: If a user forgets their password, you'll need to manually delete/reset their data file
- **Security level**: This provides "good enough" protection against casual/accidental access, but technical users with the GitHub token could access data

## Data File Format

Each account's data is stored as `/data/account-name.json`:

```json
{
  "passwordHash": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
  "columns": {
    "todo": { "id": "todo", "title": "To Do", "items": [] },
    "inprogress": { "id": "inprogress", "title": "In Progress", "items": [] },
    "done": { "id": "done", "title": "Done", "items": [] }
  }
}
```

## Security Considerations

**Important Security Information**:

- The GitHub token is embedded in the client code (viewable in browser DevTools)
- Anyone with the token can access/modify all account data
- This is acceptable for **non-sensitive UAT data** where you trust users
- **If you can, use a proper backend server instead**

### What users CAN'T easily do:
- Accidentally access other accounts' data (requires knowing their URL and password)
- Modify data without the password

### What technical users COULD do:
- Extract the GitHub token from browser DevTools
- Access any account's data file directly via GitHub API
- Modify data without password if they have the token

### Mitigation Strategies:
1. Use different tokens for different account groups if needed
2. Monitor GitHub repository access logs
3. Rotate tokens periodically
4. Trust your users or use for non-sensitive data only

## Auto-Save

The app automatically saves changes 1 second after the last edit. You'll see a toast notification:
- ✓ "Changes saved" - Successful save
- ✗ Error messages if save fails

## Troubleshooting

### "Failed to load data"
- Check your GitHub token has correct permissions
- Verify GITHUB_OWNER and GITHUB_REPO are correct
- Ensure data branch and /data/ directory exists

### "Failed to save data"
- Check fine-grained personal access token for read and write permissions
- Token may have expired - generate a new one
- Check GitHub API rate limits (5000 requests/hour)
- Verify internet connection

### Password Issues
- Passwords are case-sensitive
- No way to recover forgotten passwords

### Rate Limiting
GitHub API allows 5000 authenticated requests per hour. With auto-save every 1 second after changes, you're unlikely to hit this limit during normal use.

## Development vs Production

### Development (localhost)
- Works the same as production
- Uses the same GitHub token and data files
- Changes are immediately visible to users if they clear cache and refresh

### Production (GitHub Pages)
- Serve from your GitHub Pages URL
- Each deployment updates the static files
- Customer data persists in `/data/` directory in `data` branch regardless of deployments

## Backup Strategy

To backup account data:
1. Clone your repository
2. The `/data/` directory contains all account files
3. Optionally set up automated backups via GitHub Actions

## Support

When helping users:
1. Have them verify they're using the correct URL with their account ID
2. Password is case-sensitive
3. Try clearing browser cache if issues persist
4. Check GitHub for their data file to verify it exists
