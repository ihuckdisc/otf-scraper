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

**Optional:** Add a **Chart Reference** tab and paste contents from `DASHBOARD_REFERENCE.md` in this repo for rebuild instructions.

### Step 2 — Add the scraper script to your copy

**Recommended (no coding tools):**

1. In your new sheet: **Extensions → Apps Script**.
2. Delete any default `Code.gs` content.
3. From GitHub **https://github.com/ihuckdisc/otf-scraper**, open each `.js` file and the `parsers/` files (and `ManualRowForm.html`, `appsscript.json`). Create matching script files in the editor (same names; parsers can be flat files like `Header.gs`).
4. Save. Reload the spreadsheet.
5. Menu **OTF Scraper → Initialize Sheet** (creates/refreshes **Welcome**, **Data**, **Log**, **Dash_Calc**).
6. **OTF Scraper → Full Scrape** (or **Update** after you have data). Approve OAuth:
   - Read Gmail (OTbeat emails only, in practice),
   - Edit this spreadsheet only.

**Optional (developers):** Clone the repo, use [clasp](https://github.com/google/clasp) with **your** Script ID in `.clasp.json`, then `clasp push`.

### Step 3 — One-time sheet wiring

Apps Script cannot create drawing buttons for you:

1. **Insert → Drawing** → label **Update** → **Assign script** → `runUpdate`.
2. Repeat for **Full Scrape** → `runFullScrape`.
3. Optional: **Refresh Dashboard** → `runRefreshDashboardCalcs`.

Same actions live under **OTF Scraper** menu anytime.

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
