# OTF Email Scraper — User Guide

Track every OrangeTheory performance email in **your own** Google Sheet: one row per class, a dashboard you can slice by year/coach/studio, and charts that stay useful when you filter. The scraper runs entirely in **your** Google account — not on a shared server.

**Not affiliated with OrangeTheory Fitness.** Use at your own risk.

---

## What you get

### From the scraper (script)

- Reads performance emails from **OTbeatReport@orangetheoryfitness.com** only.
- **Gmail read-only** — never sends, deletes, or labels mail.
- Writes to **this spreadsheet only**.
- One **Data** row per workout with calories, splats, HR, zones, tread, rower (when present in the email).
- **Update** for new classes since your last import; **Full Scrape** for a complete backfill.
- **Add Manual Row** for classes with no email (e.g. 2020–2023 gap).
- Flags odd rows in **Status** (unknown template, partial parse, possible duplicate, etc.) — imported rows are not silently overwritten.
- **Log** tab for each run (scanned, added, skipped, flags).

### From the layout template (optional)

- Pre-built **Dashboard** tab with charts and slicers (Year, Month, Studio, Coach).
- Example chart wiring documented on **Chart Reference** (paste from `fixtures/DASHBOARD_REFERENCE.md` if you rebuild charts).
- Tabs for **Welcome**, **Data**, **Dash_Calc** (helper data for charts), **Log**.

The template is **layout only**. You install the **script separately** so authorization runs under **your** Google account (not a stranger’s OAuth app).

---

## What it does not do

- Does not run automatically on a schedule (you click **Update** or use a button you wire yourself).
- Does not import old CSV exports for you (add missing history via **Full Scrape** or **Add Manual Row**).
- Does not guarantee every email variant parses perfectly — check **Status**.
- Does not replace the official OTF app or OTconnect.
- Does not share your data with the template author when you self-install the script.

---

## Install (two steps)

### Step 1 — Copy the dashboard layout template

1. Open the template:  
   **https://docs.google.com/spreadsheets/d/1TFLzWsZW90z2KTGOdj5pyVDa6giAIKlapsNSYnw0IDw/copy**  
   (or **File → Make a copy** from the published template link).
2. Name the copy (e.g. “OTF Stats”).
3. Confirm the copy has **no** Apps Script project attached yet (**Extensions → Apps Script** should be empty or only show a blank project you will replace).  
   If an old bound script came with the copy, remove it: do not authorize a third-party project — proceed to Step 2 on **your** sheet only.

### Step 2 — Add the scraper script to your copy

This is the hardest step. Copy **every** file below into **your** bound Apps Script project (the one attached to **your** sheet from Step 1). Do not authorize a script project that came with someone else’s sheet.

Repo: **https://github.com/ihuckdisc/otf-scraper** (use **Raw** on each file so you copy the full source).

#### Recommended — manual copy (no coding tools)

1. Open your sheet → **Extensions → Apps Script**.
2. Remove the default starter file: select `Code.gs` → trash icon (or clear it and delete the file).
3. Turn on the manifest editor: **Project Settings** (gear) → check **Show "appsscript.json" manifest file in editor** → back to **Editor**.
4. Open `appsscript.json` in the repo, copy all, paste into the manifest file in Apps Script → **Save**.
5. For each item in the checklist below:
   - **+** (Add a file) → **Script** for `.js` files, **HTML** for `ManualRowForm.html`.
   - Name the file **exactly** as listed (`.js` is fine; the editor may show `.gs` — content matters, not the suffix).
   - Optional but clearer: create folders **parsers** and **parsers → sections**, then add files inside them to mirror the repo.
   - On GitHub, open the path → **Raw** → select all → paste into the matching Apps Script file → **Save** (Ctrl/Cmd+S).
6. When the checklist is complete, **reload the spreadsheet** (close and reopen, or refresh the browser tab).
7. Confirm the menu: **OTF Scraper** should appear. If not, see Troubleshooting (“No OTF Scraper menu”).
8. Run **OTF Scraper → Initialize Sheet** (creates/refreshes **Welcome**, **Data**, **Log**, **Dash_Calc**).
9. Run **OTF Scraper → Full Scrape** (first import) or **Update** (after you have data). Approve OAuth when prompted:
   - Read Gmail (OTbeat emails only, in practice),
   - Edit this spreadsheet only.

#### File checklist (copy all of these)

Tick each box in Apps Script when the file exists and its contents match GitHub.

**Project config (2 files)**

| Done | File in Apps Script | GitHub path |
|------|-------------------|-------------|
| ☐ | `appsscript.json` | `appsscript.json` (manifest — step 4 above) |
| ☐ | `ManualRowForm.html` | `ManualRowForm.html` (**+ → HTML**) |

**Core script — spreadsheet, menu, scrape (10 files)**

| Done | File in Apps Script | GitHub path |
|------|-------------------|-------------|
| ☐ | `Config.js` | `Config.js` |
| ☐ | `Menu.js` | `Menu.js` |
| ☐ | `Welcome.js` | `Welcome.js` |
| ☐ | `Dashboard.js` | `Dashboard.js` |
| ☐ | `SheetIO.js` | `SheetIO.js` |
| ☐ | `Ingest.js` | `Ingest.js` |
| ☐ | `Validate.js` | `Validate.js` |
| ☐ | `Log.js` | `Log.js` |
| ☐ | `Normalize.js` | `Normalize.js` |
| ☐ | `Tests.js` | `Tests.js` |

**Parsers (8 files)** — use folder **parsers** / **sections**, or flat names like `Header.js` (same global scope either way)

| Done | File in Apps Script | GitHub path |
|------|-------------------|-------------|
| ☐ | `Tokens.js` | `parsers/Tokens.js` |
| ☐ | `Detect.js` | `parsers/Detect.js` |
| ☐ | `Parse.js` | `parsers/Parse.js` |
| ☐ | `Header.js` | `parsers/sections/Header.js` |
| ☐ | `Summary.js` | `parsers/sections/Summary.js` |
| ☐ | `Zones.js` | `parsers/sections/Zones.js` |
| ☐ | `Treadmill.js` | `parsers/sections/Treadmill.js` |
| ☐ | `Rower.js` | `parsers/sections/Rower.js` |

**Total: 20 files** (2 config + 10 core + 8 parsers). You should **not** copy `dev/`, `fixtures/*.eml`, `README.md`, or `.clasp.json` into Apps Script.

**Quick sanity check:** In the Apps Script file list you should see `Menu.js` (contains `onOpen`) and `Ingest.js` (contains `runUpdate` / `runFullScrape`). Missing `Menu.js` is the most common reason the menu never appears.

#### Optional — developers (clasp)

Use this if you are comfortable with git and the command line. You still must bind the script to **your** sheet (Step 1).

1. **Create the bound project:** Open your sheet → **Extensions → Apps Script** (creates a project tied to this sheet).
2. **Copy your Script ID:** Apps Script → **Project Settings** → **IDs** → **Script ID** (long string). You will put this in `.clasp.json`, not the repo’s sample ID.
3. **Clone and configure:**
   ```bash
   git clone https://github.com/ihuckdisc/otf-scraper.git
   cd otf-scraper
   ```
   Edit `.clasp.json`: replace `scriptId` with **your** Script ID from step 2.
4. **Install clasp and log in:**
   ```bash
   npm install -g @google/clasp
   clasp login
   ```
   Complete the browser OAuth for clasp (separate from the sheet scrape consent in step 9 above).
5. **Push only the Apps Script bundle:**
   ```bash
   clasp push
   ```
   `.claspignore` limits the upload to the same 20 files as the checklist (excludes `dev/`, local `fixtures/`, and docs).
6. **Reload the spreadsheet** → **OTF Scraper → Initialize Sheet** → **Full Scrape** or **Update** (same as manual install steps 6–9).

**Local parser work (optional):** From the repo root, `node dev/verify.js` and `node dev/runTests.js` run tests without deploying. Regenerating `Fixtures.js` for in-editor `runTests` is only needed if you change `.eml` fixtures (`node dev/genFixtures.js` then `clasp push`).

### Step 3 — One-time sheet wiring (buttons)

The **layout template** from Step 1 may already include drawing buttons on **Welcome** or **Dashboard** (e.g. **Update**, **Full Scrape**) with scripts assigned. If those buttons work after Step 2, you can skip creating new drawings.

Apps Script cannot create or fix drawing buttons for you. Only add or re-wire buttons if they are missing or stopped working:

1. Check existing drawings: click each button → **⋮** (or right-click) → **Assign script**. Expected function names:
   - **Update** → `runUpdate`
   - **Full Scrape** → `runFullScrape`
   - **Refresh Dashboard** (optional) → `runRefreshDashboardCalcs`
2. If a button is missing: **Insert → Drawing** → draw a shape → add label text → **Save and Close** → place on **Welcome** or **Dashboard** → click the drawing → **⋮ → Assign script** → enter the function name exactly (no parentheses).
3. Repeat for any buttons you still need.

The same actions always work from **OTF Scraper** in the menu bar even if you never add drawings.

---

## Daily use

| Action | When to use |
|--------|-------------|
| **Update (since last class)** | After new OTF emails arrive; fast routine sync. |
| **Full Scrape (all emails)** | First import, or after a long break. |
| **Add Manual Row** | Class without a scrapable email. |
| **Refresh Dashboard Calcs** | You edited date, calories, splats, HR, or zone minutes on **Data** by hand. |
| **View Log** | See what the last run did. |

Check **Status** on **Data** for anything flagged.

**Welcome** tab (refreshed on **Initialize Sheet**) has a short in-sheet reminder of these steps.

---

## Dashboard & slicers

- Slicers on **Dashboard** filter charts built on **Data** (FILTERED charts).
- Charts over time, by coach, and by studio should use **Dash_Calc** (FIXED) so they do not collapse when you slice — see **Chart Reference** / `DASHBOARD_REFERENCE.md`.
- **Initialize Sheet** rebuilds **Dash_Calc**. Normal scrapes only refresh the monthly columns **A–S**.
- Editing tread/rower PR cells on **Data** updates PR scorecards on **Dash_Calc** via formula — usually no refresh needed.
- **OTF Scraper → View Dashboard Data** opens **Dash_Calc**.

---

## Privacy & permissions

- The script only requests **read Gmail** and **edit this spreadsheet**.
- Processing happens in Google’s Apps Script runtime under **your** login.
- You authorize **your** copy of the script, not a shared “viral” OAuth app.
- Keep your sheet private unless you choose to share it.

---

## Troubleshooting

| Problem | Try |
|---------|-----|
| No **OTF Scraper** menu | Reload sheet; confirm script saved and `onOpen` is in `Menu.js`. |
| OAuth scary screen | Expected for personal Gmail apps; you should be on **your** script project, not a copied third-party project. |
| Charts look wrong after filter | Rebuild FIXED charts on **Dash_Calc** ranges (see Chart Reference). |
| Gap in monthly charts | Normal for months with zero classes; script inserts zero rows. |
| Missing 2020–2023 classes | **Add Manual Row** — emails often missing in that era. |
| Row says Needs Review | Read **Status**; fix manually or re-run **Full Scrape** (won’t overwrite without flag). |

---

## Maintenance menu (use carefully)

- **Clear Email Data** — removes Email rows; keeps Manual rows.
- **Clear All Data** — deletes all class rows.
- **Reset Sheet** — clears all class rows **and** log history.
- **Initialize Sheet** — rebuilds sheet structure and **Dash_Calc**; overwrites **Welcome** content.

---

## Updates

Watch the GitHub repo for new versions. After updating script files: reload sheet → **Initialize Sheet** once if release notes say so → normal **Update** workflow.

---

## More detail

- **Chart rebuild spec:** `fixtures/DASHBOARD_REFERENCE.md`
- **Developer / parser docs:** `README.md` in the repo
