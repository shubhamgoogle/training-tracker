# SBI Green Marathon S7 Hyderabad — 11-Week Training Tracker

A clean, mobile-first web application custom-built for the **SBI Green Marathon S7 Hyderabad (21.1 km — Sunday, 20 December 2026)** training program.

## Features
- **Pre-loaded Program (Sections 1–5 of PDF)**:
  - **1. Weekly Structure**: Monday Lower Body, Tuesday Easy Run + Upper Body, Wednesday Rest, Thursday Quality Run, Friday Full Body / Accessories, Saturday Easy Run + Mobility, Sunday Long Run OR Cricket.
  - **2. 11-Week Calendar (Oct 5 – Dec 20, 2026)**: Every single day's exact run distance, interval/tempo prescription, and strength session pre-populated.
  - **3. Running Pace & Heart-Rate Guide**: Built into each run item card and available in the `Plan Guides` tab.
  - **4. Detailed Strength Plan**: Exercise-level tap-to-complete cards showing the recommended `Sets × Reps` right on each exercise (`Squat / leg press 3×5–8`, `Romanian deadlift 3×6–8`, etc.).
  - **5. Strength Volume by Training Phase**: Automatic phase banners for Weeks 1–3, Week 4 cutback (~20% less volume), Weeks 5–6, Weeks 7–8 (~25% less volume), Week 9 (~40% less volume), Week 10 taper, and Week 11 Race Week.
- **Click-Click Logging at the Exercise Level**:
  - Tap any exercise or run to toggle completion (`✓`).
  - Tap **Mark Day Complete** to complete all required exercises for that day in one tap.
  - Smart **Sunday Long Run OR Cricket** handling: completing either option marks Sunday 100% done!
- **Dual Persistence (Server SQLite + Mobile Browser Auto-Sync)**:
  - Instant 0ms UI updates saved to your mobile browser's `localStorage` and synced to the server's SQLite database (`data/tracker.db`).
  - Even if your Cloud Run container scales to zero and restarts, opening the app on your phone automatically re-hydrates the server database from your mobile browser cache.

## Run Locally
```bash
python3 server.py
```
Then open `http://127.0.0.1:8080` in your browser.

## Deploy to Google Cloud Run
```bash
chmod +x deploy.sh
./deploy.sh
```
Or run directly with `gcloud`:
```bash
gcloud run deploy sbi-marathon-tracker \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --max-instances 1
```
