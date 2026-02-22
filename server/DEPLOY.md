# SyncSpace Signaling Server

## Deploy to Render (Free)

1. Go to https://render.com
2. Sign up with GitHub
3. Click "New Web Service"
4. Connect your GitHub repo: `yaksh1/testing-openclaw`
5. Configure:
   - **Name**: syncspace-signaling
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node signaling-server.js`
   - **Plan**: Free
6. Click "Create Web Service"

## Or Deploy to Railway (Free $5 credit)

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"
4. Deploy from GitHub repo
5. Select `yaksh1/testing-openclaw`
6. Add variable: `NIXPACKS_NODE_VERSION=18`
7. Deploy

## After Deploy

Update `background/background.js`:
```javascript
const SIGNALING_SERVER = 'https://your-service-url.onrender.com';
```

Then reload the extension.

## Local Testing

```bash
cd server
npm install
npm start
# Server runs on http://localhost:3000
```
