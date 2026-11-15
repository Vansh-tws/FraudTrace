# FraudTrace Deployment Guide 🚀
### Deploying to GitHub, Render (Backend), and Vercel (Frontend)

This guide walks you through deploying **FraudTrace** with the recommended production architecture:
- **Source Control**: GitHub
- **Backend API & ML Engine**: Render (Free Tier Web Service)
- **Frontend Dashboard**: Vercel (Free Tier Edge Network)

---

## 1. Step 1: Push to GitHub 🐙

If you haven't created a GitHub repository yet:

1. Open [GitHub](https://github.com/new) and create a new repository:
   - **Repository name**: `FraudTrace`
   - **Visibility**: Public or Private
   - **Do not** initialize with README or .gitignore (we already have them).

2. In your local terminal (`C:\FraudTrace`), run:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/FraudTrace.git
   git push -u origin main
   ```

---

## 2. Step 2: Deploy Backend to Render 🐍

Render hosts the FastAPI application, SQLite/PostgreSQL database, Isolation Forest ML models, and MCP tools.

1. Go to the [Render Dashboard](https://dashboard.render.com/) and click **New +** > **Web Service**.
2. Connect your GitHub account and select your **`FraudTrace`** repository.
3. Configure the service settings:
   - **Name**: `fraudtrace-backend`
   - **Region**: Choose the closest region (e.g., Singapore, Frankfurt, Oregon)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (root `.`)
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt && python -m backend.app.services.data_generator
     ```
   - **Start Command**:
     ```bash
     uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Plan**: `Free`

4. Add **Environment Variables** in the Render settings:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `PYTHONPATH` | `.` | Ensures Python package imports resolve cleanly |
   | `PYTHON_VERSION` | `3.11.9` | Recommended Python runtime |
   | `GEMINI_API_KEY` | *(your Gemini key)* | Optional — falls back to local expert engine if omitted |

5. Click **Create Web Service**.
   - Render will build the environment, seed the initial 2,000 transactions and cases, and start Uvicorn.
   - Once deployed, copy your service URL (e.g., `https://fraudtrace-backend.onrender.com`).
   - Test by opening: `https://fraudtrace-backend.onrender.com/api/health` in your browser.

---

## 3. Step 3: Deploy Frontend to Vercel ⚡

Vercel provides instant global CDN deployment for the React + Vite dashboard.

1. Go to the [Vercel Dashboard](https://vercel.com/new) and click **Import Project**.
2. Select your **`FraudTrace`** GitHub repository.
3. In the configuration screen:
   - **Project Name**: `fraudtrace`
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select **`frontend`** (or leave as root, both are supported).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://your-render-backend-url.onrender.com` |
   *(Replace with the actual Render backend URL from Step 2)*

5. Click **Deploy**.
   - Vercel will build the frontend and provide your live production URL (e.g., `https://fraudtrace.vercel.app`).

---

## 4. Single-Port Alternative: Full-Stack on Render

If you prefer to run both the frontend and backend together on a single Render service without Vercel:
1. Build the frontend locally or in the build command:
   ```bash
   pip install -r requirements.txt && cd frontend && npm install && npm run build && cd .. && python -m backend.app.services.data_generator
   ```
2. The FastAPI backend automatically serves `frontend/dist` as static files at `https://fraudtrace-backend.onrender.com/`.

---

## 5. Verification Checklist

- [ ] `GET /api/health` returns `{"status": "healthy"}`
- [ ] Overview dashboard loads KPIs and 24-hour transaction timeline
- [ ] Risk Analysis scatter plot loads instantly (~50ms)
- [ ] AI Investigation Assistant executes MCP tool calls on test transactions
- [ ] Analyst decision recorded under **Vansh Raut** in Cases & Review
- [ ] Formal SAR report prints and exports to JSON cleanly
