# FinSmart Deployment Guide

This guide will help you deploy FinSmart to free hosting services.

## Stack
- **Frontend**: Vercel (React + Vite)
- **Backend**: Render (FastAPI)
- **Database**: Supabase (PostgreSQL)

## Prerequisites
- GitHub account with your code pushed
- Supabase account
- Render account
- Vercel account

---

## Step 1: Create Supabase Database

1. Go to https://supabase.com
2. Sign in → **New project**
3. Fill:
   - **Name**: FinSmart
   - **Password**: (create strong password)
   - **Region**: (nearest to you)
4. Click **Create new project** → Wait 2 min
5. Go to **Project Settings** → **Database**
6. Copy **Connection string** (starts with `postgresql://`)
7. Save it for Step 2

---

## Step 2: Deploy Backend on Render

1. Go to https://render.com
2. Sign in → **New +** → **Web Service**
3. Connect GitHub → Select `finsmart` repo
4. Configure:
   - **Name**: finsmart-backend
   - **Root Directory**: `backend`
   - **Runtime**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. **Environment Variables**:
   - `DATABASE_URL` = (paste Supabase connection string)
   - `SECRET_KEY` = `finsmart_secret_key_2026_change_this_later`
   - `ALLOWED_ORIGINS` = `*` (we'll update this after frontend deploy)
6. Click **Create Web Service**
7. Wait 3-5 min → Copy backend URL (like `https://finsmart-backend.onrender.com`)

---

## Step 3: Deploy Frontend on Vercel

1. Go to https://vercel.com
2. Sign in → **New Project**
3. Import `finsmart` repo
4. Configure:
   - **Framework**: Vite (auto-detected)
   - **Root Directory**: `frontend`
5. **Environment Variable**:
   - `VITE_API_BASE_URL` = (paste your Render backend URL)
6. Click **Deploy**
7. Wait 2 min → Copy Vercel URL (like `https://finsmart.vercel.app`)

---

## Step 4: Update CORS on Backend

1. Go back to Render dashboard
2. Open your backend service → **Environment**
3. Edit `ALLOWED_ORIGINS`:
   - Change from `*` to: `https://finsmart.vercel.app` (use your actual URL)
4. Save → Wait for auto-redeploy

---

## Step 5: Test Your App

1. Open your Vercel URL
2. Try:
   - Sign up / Login
   - Add transactions
   - View analytics
   - Check insights

If any requests fail, check Render logs for errors.

---

## Local Development

To run locally with env variables:

### Backend
```bash
cd backend
# Create .env file (see .env.example)
# Run:
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
# Create .env file (see .env.example)
# Run:
npm run dev
```

---

## Troubleshooting

### Backend not responding
- Check Render logs
- Verify `DATABASE_URL` is correct
- Render free tier sleeps after inactivity (takes ~30s to wake)

### CORS errors
- Ensure `ALLOWED_ORIGINS` includes your Vercel URL
- No trailing slash in URLs

### Database connection errors
- Check Supabase connection string format
- Ensure Supabase project is active

---

## Free Tier Limits

- **Render**: Service sleeps after 15 min inactivity, 750 hours/month
- **Vercel**: 100 GB bandwidth, unlimited requests
- **Supabase**: 500 MB database, 2 GB transfer

These are generous limits for a personal finance app.
