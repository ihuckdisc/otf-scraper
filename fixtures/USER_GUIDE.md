# OTF Email Scraper — User Guide

Get your Orangetheory performance emails into **your own** Google Sheet: one row per class, optional dashboard charts, and controls you run yourself. Everything runs in **your** Google account.

**Not affiliated with OrangeTheory Fitness.** Use at your own risk.

**Members start here.** Developers: see the repo `README.md` and `CHANGELOG.md`.

**Honest note:** First-time install means pasting about **19 script files** from GitHub into Google Apps Script (~15–20 minutes). If a friend is comfortable with that, ask them. Community click-through that matches this guide: [PhoenixBunny’s walkthrough](https://www.reddit.com/r/orangetheory/comments/1tvw5z5/comment/oqdfuzb/). An easier install path is being designed separately; until then, this is the official method.

---

## Before you start

- Use the **same Google account** that receives mail from `OTbeatReport@orangetheoryfitness.com`.
- Desktop browser (Chrome, Edge, etc.). Mobile cannot assign Drawing buttons.
- Success = **rows on the Data tab** after Full Scrape — not merely that a menu appeared.

### What you get / what you do not

**Gets:** calories, splat points, HR, zone minutes/%, tread and rower metrics when the email has them; Update / Full Scrape; Add Manual Row; Log; optional dashboard layout.

**Does not:** run on a schedule; import CSV; replace the official OTF app Trends; parse every email perfectly (check **Status**); include a cost / late-cancel tab; store class type (2G / Lift / Tread50); give a week-by-week Trends toggle (over-time charts are **monthly** averages).

---

## 1. Copy the layout

1. Open:  
   **https://docs.google.com/spreadsheets/d/1OGeRMfHHzYOShJvv3GId_7X7XaB-kdzyr18XtjVQyGI/copy**
2. Name the copy (e.g. “OTF Stats”).
3. **Extensions → Apps Script**. You should see a blank or default project you will fill yourself.
4. If a project you did not create is already attached: Apps Script → **Overview** (ⓘ) → **Delete project**, then **Extensions → Apps Script** again. Do not click **Allow** on someone else’s project.

On the **Data** tab, delete any **sample / demo rows** before your first scrape (so class counts stay honest).

---

## 2. Put the script in your copy

Repo: **https://github.com/ihuckdisc/otf-scraper**

**Naming rule (read once):** On GitHub the file may be called `Config.js`. In Apps Script, name it **`Config`** only — do **not** type `.js` or `.html`. The editor adds its own suffix. Typing `Config.js` can create `Config.js.gs` and break the install. Same idea for `ManualRowForm` (HTML), not `ManualRowForm.html`.

### Setup the editor

1. In your sheet: **Extensions → Apps Script**.
2. You cannot delete the only file in a project. Either:
   - **⋮** (or **More**) on `Code.gs` → **Rename** to `Config`, then paste Config’s content later, **or**
   - **+** next to Files → add any Script file first, **then** delete `Code.gs` via **⋮ → Delete**.
3. Left rail → **Project Settings** (cog) → check **Show "appsscript.json" manifest file in editor**.
4. Click **Editor** (`<>`) to return.
5. **Project Settings → Time zone**: your studio’s timezone (repo default is America/New_York).

### Paste the manifest

1. On GitHub open `appsscript.json` → **Copy** (two-pages icon next to Raw). Prefer Copy over Raw.
2. In Apps Script open `appsscript.json` → select all → paste → save if prompted.

### Paste each remaining file

For every row in the checklist:

1. GitHub → open the file → **Copy**.
2. Apps Script → **+** next to **Files** → **Script** (for code) or **HTML** (for ManualRowForm only).
3. Name = **Apps Script name** column below (no extension).
4. Select all in the editor → paste → save.
5. Do **not** create folders named `parsers`. Keep files flat in the file list.

### Required checklist (19)

| Done | Apps Script name | GitHub path (for Copy) |
|------|------------------|------------------------|
| ☐ | `appsscript.json` | `appsscript.json` |
| ☐ | `ManualRowForm` (add as **HTML**) | `ManualRowForm.html` |
| ☐ | `Config` | `Config.js` |
| ☐ | `Menu` | `Menu.js` |
| ☐ | `Welcome` | `Welcome.js` |
| ☐ | `Dashboard` | `Dashboard.js` |
| ☐ | `SheetIO` | `SheetIO.js` |
| ☐ | `Ingest` | `Ingest.js` |
| ☐ | `Validate` | `Validate.js` |
| ☐ | `Log` | `Log.js` |
| ☐ | `Normalize` | `Normalize.js` |
| ☐ | `Tokens` | `parsers/Tokens.js` |
| ☐ | `Detect` | `parsers/Detect.js` |
| ☐ | `Parse` | `parsers/Parse.js` |
| ☐ | `Header` | `parsers/sections/Header.js` |
| ☐ | `Summary` | `parsers/sections/Summary.js` |
| ☐ | `Zones` | `parsers/sections/Zones.js` |
| ☐ | `Treadmill` | `parsers/sections/Treadmill.js` |
| ☐ | `Rower` | `parsers/sections/Rower.js` |

Skip anything named Tests or Fixtures unless you are developing.

**Sanity check:** File list includes `Menu` and `Ingest`. Count should be the manifest + ManualRowForm + 17 scripts (or Config renamed from Code.gs counted once).

### If the menu is missing

1. Reload the spreadsheet.
2. **Extensions → Apps Script → Executions** — look for a failed `onOpen`.
3. Confirm every required file was saved and names have **no** double extensions (`Config.js.gs`, etc.).

---

## 3. Reload → Initialize → Full Scrape

1. Reload the spreadsheet. Confirm menu **OTF Scraper**.
2. **OTF Scraper → Initialize Sheet**. Welcome must show a **Script version** that matches the latest entry in [CHANGELOG.md](https://github.com/ihuckdisc/otf-scraper/blob/main/CHANGELOG.md) (example: `1.5.4`).
3. **OTF Scraper → Full Scrape** (first import).

### Google permission screen

Personal scripts often show **Google hasn’t verified this app**.

1. Use **Advanced → Go to [project] (unsafe) → Allow**, **or** (newer UI) **Continue** / continue with an app that is being tested → **Allow**.
2. You are authorizing **your** sheet’s script, not a random public app.
3. Google may ask for roughly:
   - Read your email (required; the script only searches OTbeat messages),
   - Use this spreadsheet,
   - Show dialogs (Add Manual Row).

**You are done when** Data has class rows. After that, use **Update** for new emails.

### Buttons (optional)

Template drawings may already work. Menu always works without them.  
To wire: click drawing → **⋮ → Assign script** → `runUpdate` / `runFullScrape` / `runRefreshDashboardCalcs` (no parentheses).

---

## Daily use

| Action | When |
|--------|------|
| **Update (since last class)** | After new OTF emails. |
| **Full Scrape (all emails)** | First import or long gap — **not** a timeout workaround. |
| **Add Manual Row** | Class with no email (e.g. 2020–2023 gap). |
| **Refresh Dashboard Calcs** | You hand-edited date / calories / splats / HR / zone minutes on Data. |
| **View Log** | See what the last run did. |
| **View chart data (Dash_Calc)** | Opens the helper tab that feeds some all-time charts (not the pretty Dashboard). |

Check **Status** on Data if a row looks odd.

---

## If you use the OTF app Trends

- Keep the **app** for recent, per-class calorie / HR / splat (“is this week paying off?”).
- Use this **sheet** for years of history, coach/studio averages, all-time PRs, zone mix over months, and classes you add by hand.
- Sheet “over time” lines are **monthly averages**, not one point per class. There is no week toggle.
- Some Dashboard charts follow Year/Month/Coach/Studio slicers; the main monthly trend lines stay all-time so filtering does not wipe them.
- Day 1 after scrape: open **Dashboard** → find Calories over time, Splat Points over time, Avg HR over time.
- If app and sheet disagree on one recent class, trust the app; use the sheet for monthly rollups. Fix **Status** / Add Manual Row before deciding training “isn’t working.”

**YTD / MTD** counters (after Initialize on recent versions) show this calendar year / month. They do not follow Dashboard slicers. Scorecards you build on Data **do** follow slicers.

---

## Short glossary

- **Splat points** = minutes in Orange + Red (~84%+ max HR).
- **Zones** Grey → Red = heart-rate bands.
- **Class Time** = start time from the email (not 50/60/90 length).
- **Total Active Minutes** = sum of zone minutes, not booked length.
- **Blank tread or rower cells** = that email had no tread/rower block (e.g. floor-focused class), not a broken PR.
- **No class-type column** — Lift / Tread50 / Tornado are not labeled.
- **Gap months with 0** on monthly charts = no row in this sheet (missing email or you didn’t go).

### Email coverage

| Era | Expectation |
|-----|-------------|
| Pre-2018 | Not supported yet (samples welcome). |
| 2018 | Often thinner rows. |
| 2019+ | Richest fields when present. |
| ~2020–2023 | Emails often missing — Add Manual Row from the app. |

All-time PRs mix formats (long classes can dominate). They are not official app benchmarks.

---

## Troubleshooting

### Update or Full Scrape timed out

You may see `Service Spreadsheets timed out while accessing document` or `Exceeded maximum execution time`.

1. Do **not** click scrape again. **View Log** — note scanned / added / skipped / errors.
2. Check Welcome **Script version** vs [CHANGELOG](https://github.com/ihuckdisc/otf-scraper/blob/main/CHANGELOG.md). If behind, run **Upgrade** below.
3. If version is current and Log **added = 0**: wait and try **Update** after one new email — do not Full Scrape “to force it.” If **added > 0**, see **Partial scrape**.

### Upgrade from an older paste (e.g. June)

1. **File → Make a copy** → name `BACKUP — do not scrape`.
2. On the live sheet, replace **all required** Apps Script files from the checklist (Apps Script names without `.js`). Always include the file named **`Config`** (GitHub: `Config.js`). Do not mix old and new `Dashboard` / `SheetIO` / `Ingest`.
3. Reload → **Initialize Sheet** once when CHANGELOG says Initialize: yes. Welcome must show the new version. Do not scrape before that Initialize.

Until CHANGELOG says otherwise, every upgrade = **all 19 required files**, not a short delta list.

### Class count looks doubled

1. Unhide **Unique Key** and **Gmail Message ID** on Data. If Email rows are blank there, stop scraping until you upgrade / fix columns.
2. Filter **Status** for `Possible duplicate`.
3. A copy of a populated sheet is a **backup** — do not scrape the copy.

### Update fails after the first import

1. Wrong Welcome version → Upgrade, Initialize, then Update with one new email.
2. Current version still times out → Full Scrape is not the fix; do not Reset Sheet. See timeout section.
3. Builds **1.5.3+** no longer rebuild the whole chart-helper tab on every Update.

### Partial scrape (Log added rows, then timeout)

1. Do not Clear / Reset. Compare Data row count to Log “added.”
2. If **Gmail Message ID** filled on new rows, a later scrape should skip those messages.
3. If columns look shifted or IDs are empty → Upgrade before scraping again.

### Migrate off the 2018 Rhino scraper

Do not paste old columns into this Data tab. New sheet + this script + Initialize. Backfill gaps with Add Manual Row. CSV import is out of scope.

### “Google hasn’t verified this app”

Must be **your** project (**Extensions → Apps Script** on your copy). Use Advanced/(unsafe) or Continue → Allow. Wrong project → Overview → Delete project → reinstall Step 2.

### When to Initialize Sheet

Once after first install, and once when CHANGELOG says **Initialize: yes**. It overwrites Welcome and rebuilds chart-helper data. Empty charts after Initialize → **Refresh Dashboard Calcs**, not Full Scrape.

### Buttons dead after copy

Re-assign `runUpdate` / `runFullScrape` / `runRefreshDashboardCalcs`. If the menu works, only the drawing wiring is wrong.

### Cost / late-cancel tab

Not supported — those fees are not in OTbeat emails. Use a note or separate tab you type yourself.

---

## Dashboard (short)

- Slicers change some charts (class-level views on Data).
- Monthly trends / by coach / by studio / some scorecards stay all-time so slicers do not wipe them.
- Do not put a slicer on the chart-data helper tab (**Dash_Calc**).
- How to read (short) + rebuild appendix: [DASHBOARD_REFERENCE.md](https://github.com/ihuckdisc/otf-scraper/blob/main/fixtures/DASHBOARD_REFERENCE.md).

---

## Privacy

Runs under your login. Keep the sheet private unless you choose to share. Gmail permission is broad; the script only searches the OTbeat sender.

---

## Appendix — Developers (clasp)

See `README.md`. `clasp push`, then Initialize when CHANGELOG says so. Local tests: `node dev/runTests.js`.

## Appendix — Maintenance (careful)

- **Clear Email Data** — removes Email rows; keeps Manual.
- **Clear All Data** — deletes all class rows.
- **Reset Sheet** — clears class rows and Log.
- **Initialize Sheet** — rebuilds structure; overwrites Welcome.

---

## Updates

Follow [CHANGELOG.md](https://github.com/ihuckdisc/otf-scraper/blob/main/CHANGELOG.md). After replacing files: reload → Initialize only if listed → normal **Update**. Do not Full Scrape just because you upgraded.
