# Site Audit

Local SEO, speed, and security crawler. Vite + Vue 3 UI, Express backend.

## Quick Start

```powershell
npm install
npm start
```

Open http://127.0.0.1:3000 and crawl `https://unrestrainedcommerce.com/` (or `/fixture` for a local test page).

The crawler stays on your domain. Leave **Fetch off-site links** unchecked so affiliate and social URLs are not visited.

Dashboard shows overall, SEO, speed, and security pass percentages after a crawl finishes.

## Features

- **Comprehensive crawling**: SEO, speed, and security checks
- **Detailed reports**: Download markdown fix briefs for AI-assisted implementation
- **Email reporting**: Send comprehensive PDF reports with scores, findings, and actionable todos

## Email Configuration (Optional)

To enable the "Send these results to my email" feature, configure SMTP environment variables:

```bash
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@yourdomain.com  # Optional, defaults to SMTP_USER
```

### Hostinger SMTP Settings

If hosting on Hostinger, use these settings:

- **Host**: `smtp.hostinger.com`
- **Port**: `465` (SSL) or `587` (TLS)
- **User**: Your full email address
- **Password**: Your email password

### Dry Run Mode (Testing)

For local testing without sending real emails, set:

```bash
EMAIL_DRY_RUN=1
```

This will generate the PDF in the `output/` folder instead of sending an email.

### Without SMTP Configuration

If SMTP is not configured, the email button will still appear but will return a clear error message asking users to configure SMTP environment variables.

## Deployment to Hostinger (GitHub Auto-Deploy)

This project is configured for Hostinger Node.js hosting with GitHub auto-deploy.

### Initial Setup (One-Time)

1. **In Hostinger hPanel**:
   - Go to your website (mediumturquoise-rabbit-897372.hostingersite.com)
   - Navigate to Git → Connect Repository
   - Select this GitHub repository
   - Set deploy branch to `main`
   - Hostinger will automatically run `npm install` and `npm start` on push

2. **Add SMTP Environment Variables** (if using email feature):
   - In hPanel, go to your website settings
   - Find Environment Variables section
   - Add the SMTP variables listed above

### Continuous Deployment

After initial setup, every push/merge to the `main` branch will automatically deploy:

```bash
git push origin main
```

Hostinger will:
1. Pull the latest code
2. Run `npm install` (installs dependencies)
3. Run `npm run build` (builds the frontend)
4. Run `npm start` (starts the Node.js server)

### Build Process

The build script (`npm run build`) does:
1. Compile Vue frontend with Vite
2. Copy server files to `dist/`
3. Copy `package.json` for production dependencies

### Manual Deploy Alternative

If GitHub auto-deploy is not configured, you can deploy via FTP:
1. Run `npm run build` locally
2. Upload `dist/` folder contents to your Hostinger website root
3. Run `npm install --production` on the server
4. Start with `node server.js`

## Project Structure

```
/
├── src/                    # Vue 3 frontend
│   ├── components/         # UI components (dialogs, etc)
│   ├── views/             # Page views (Config, Summary, Report, Dashboard)
│   ├── api.js             # API client
│   ├── fixPlaybook.js     # Platform-specific fix guidance
│   ├── fixReport.js       # Markdown report generator
│   └── scores.js          # Score calculation
├── server/                 # Express backend
│   ├── checks.js          # SEO/speed/security checks
│   ├── crawler.js         # Site crawler logic
│   ├── pdfReport.js       # PDF generation
│   └── emailer.js         # Email sending via SMTP
├── server.js              # Entry point
└── package.json           # Dependencies and scripts
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `HOST` | No | `0.0.0.0` | Server host |
| `SMTP_HOST` | For email | - | SMTP server hostname |
| `SMTP_PORT` | For email | - | SMTP port (465 or 587) |
| `SMTP_USER` | For email | - | SMTP username (email) |
| `SMTP_PASS` | For email | - | SMTP password |
| `SMTP_FROM` | No | `SMTP_USER` | From email address |
| `EMAIL_DRY_RUN` | No | - | Set to `1` to test without sending |
