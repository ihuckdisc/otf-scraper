# OTF Email Scraper — User Guide

Get your Orangetheory performance emails into **your own** Google Sheet: one row per class, optional dashboard charts, and controls you run yourself. Everything runs in **your** Google account.

**Not affiliated with OrangeTheory Fitness.** Use at your own risk.

**Members start here.** Developers: see the repo `README.md` and `CHANGELOG.md`. Maintainers publishing the Easy template: see [`OWNER_EASY_TEMPLATE_RUNBOOK.md`](OWNER_EASY_TEMPLATE_RUNBOOK.md).

---

## Before you start

- Use the **same Google account** that receives mail from `OTbeatReport@orangetheoryfitness.com`.
- Desktop browser (Chrome, Edge, etc.).
- Success = **rows on the Data tab** after Full Scrape — not merely that a menu appeared.

### What you get / what you do not

**Gets:** calories, splat points, HR, zone minutes/%, tread and rower metrics when the email has them; Update / Full Scrape; Add Manual Row; Log; optional dashboard layout; script already attached when you use Easy install.

**Does not:** run on a schedule; import CSV; replace the official OTF app Trends; parse every email perfectly (check **Status**); include a cost / late-cancel tab; store class type (2G / Lift / Tread50); give a week-by-week Trends toggle (over-time charts are **monthly** averages).

---

## 1. Easy install (recommended)

1. Open this link and click **Make a copy** (sign in with the Gmail that gets OTbeat mail):  
   **https://docs.google.com/spreadsheets/d/REPLACE_WITH_EASY_SHEET_ID/copy**
2. Name your copy (e.g. “OTF Stats”).
3. Reload the spreadsheet. Confirm menu **OTF Scraper**.
4. Check **Welcome → Script version** against the latest entry in [CHANGELOG.md](https://github.com/ihuckdisc/otf-scraper/blob/main/CHANGELOG.md). If the version is missing or behind, run **OTF Scraper → Initialize Sheet** once.
5. **OTF Scraper → Full Scrape**. When Google asks, allow access for **this sheet’s** script (your copy). Project name should look like **OTF Email Scraper**.

**Done when** Data has class rows. Charts fill in after Full Scrape — empty charts before that are normal. After that, use **Update** for new emails.

Prefer the menu (**OTF Scraper**) over on-sheet Drawing buttons. If a drawing button does nothing, use the menu (or re-assign the script — see Troubleshooting).

> **Older layout-only link** (shell without script — not for new installs):  
> https://docs.google.com/spreadsheets/d/1OGeRMfHHzYOShJvv3GId_7X7XaB-kdzyr18XtjVQyGI/copy  
> Use **Easy install** above, or the [paste appendix](#appendix--manual-paste-install-19-files) if you must attach script yourself.

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

## Upgrading an existing sheet

**Path A (usual):** Replace **all required** Apps Script files from the [paste checklist](#required-checklist-19) (Apps Script names without `.js`). Always include **`Config`**. Reload → **Initialize Sheet** once when CHANGELOG says Initialize: yes → confirm Welcome version → **Update**.

**Path B (optional):** Make a new copy from the [Easy install](#1-easy-install-recommended) link, then copy your old **Data** rows into the new sheet (keep Unique Key / Gmail Message ID columns intact). Do not scrape both sheets forever.

Until CHANGELOG says otherwise, every file upgrade = **all civilian files**, not a short delta list.

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
2. Check Welcome **Script version** vs [CHANGELOG](https://github.com/ihuckdisc/otf-scraper/blob/main/CHANGELOG.md). If behind, run **Upgrading** above.
3. If version is current and Log **added = 0**: wait and try **Update** after one new email — do not Full Scrape “to force it.” If **added > 0**, see **Partial scrape**.

### Class count looks doubled

1. Unhide **Unique Key** and **Gmail Message ID** on Data. If Email rows are blank there, stop scraping until you upgrade / fix columns.
2. Filter **Status** for `Possible duplicate`.
3. A copy of a populated sheet is a **backup** — do not scrape the copy.

### Update fails after the first import

1. Wrong Welcome version → upgrade, Initialize, then Update with one new email.
2. Current version still times out → Full Scrape is not the fix; do not Reset Sheet. See timeout section.
3. Builds **1.5.3+** no longer rebuild the whole chart-helper tab on every Update.

### Partial scrape (Log added rows, then timeout)

1. Do not Clear / Reset. Compare Data row count to Log “added.”
2. If **Gmail Message ID** filled on new rows, a later scrape should skip those messages.
3. If columns look shifted or IDs are empty → upgrade before scraping again.

### Migrate off the 2018 Rhino scraper

Do not paste old columns into this Data tab. New sheet + Easy install (or paste appendix) + Initialize. Backfill gaps with Add Manual Row. CSV import is out of scope.

### “Google hasn’t verified this app”

Must be **your** project (**Extensions → Apps Script** on your copy). Use Advanced/(unsafe) or Continue → Allow. Wrong project → Overview → Delete project → reinstall from Easy link or paste appendix.

### When to Initialize Sheet

Once when Welcome version is missing/behind CHANGELOG, and when CHANGELOG says **Initialize: yes**. It overwrites Welcome and rebuilds chart-helper data. Empty charts after Initialize → **Refresh Dashboard Calcs**, not Full Scrape — unless Data is still empty (then Full Scrape).

### Buttons dead after copy

Use the **OTF Scraper** menu. To repair a drawing: ⋮ → Assign script → `runUpdate` / `runFullScrape` / `runRefreshDashboardCalcs` (no parentheses).

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

## Appendix — Manual paste install (19 files)

Use this only if Easy install is unavailable or you are attaching script to a shell sheet.

Repo: **https://github.com/ihuckdisc/otf-scraper**

**Naming rule (read once):** On GitHub the file may be called `Config.js`. In Apps Script, name it **`Config`** only — do **not** type `.js` or `.html`. The editor adds its own suffix. Typing `Config.js` can create `Config.js.gs` and break the install. Same idea for `ManualRowForm` (HTML), not `ManualRowForm.html`.

Community click-through (paste era): [PhoenixBunny’s walkthrough](https://www.reddit.com/r/orangetheory/comments/1tvw5z5/comment/oqdfuzb/).

### Setup the editor

1. Start from a sheet copy (Easy template, or the [legacy layout-only link](#1-easy-install-recommended) footnote).
2. **Extensions → Apps Script**.
3. You cannot delete the only file in a project. Either:
   - **⋮** on `Code.gs` → **Rename** to `Config`, then paste Config’s content later, **or**
   - **+** next to Files → add any Script file first, **then** delete `Code.gs` via **⋮ → Delete**.
4. Left rail → **Project Settings** (cog) → check **Show "appsscript.json" manifest file in editor**.
5. **Project Settings → Time zone**: your studio’s timezone (repo default is America/New_York).

### Paste the manifest

1. On GitHub open `appsscript.json` → **Copy** (prefer Copy over Raw).
2. In Apps Script open `appsscript.json` → select all → paste → save if prompted.

### Paste each remaining file

For every row in the checklist: GitHub → **Copy** → Apps Script **+** → **Script** (or **HTML** for ManualRowForm) → name = **Apps Script name** → paste → save. Keep files flat (no `parsers` folders).

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

Skip Tests / Fixtures unless you are developing.

**Sanity check:** File list includes `Menu` and `Ingest`. Names must have **no** double extensions (`Config.js.gs`).

### After paste

Reload → **Initialize Sheet** → Welcome version matches CHANGELOG → **Full Scrape** → Allow.

### Google permission screen

Personal scripts often show **Google hasn’t verified this app**. Use **Advanced → Go to [project] (unsafe) → Allow**, or **Continue** → **Allow**. You are authorizing **your** sheet’s script.

---

## Appendix — Developers (clasp)

See `README.md`. Dev: `clasp push`. Easy template (civilian files only): `./dev/pushEasy.sh` (needs local `.clasp.easy.json`). Local tests: `node dev/runTests.js`.

## Appendix — Maintenance (careful)

- **Clear Email Data** — removes Email rows; keeps Manual.
- **Clear All Data** — deletes all class rows.
- **Reset Sheet** — clears class rows and Log.
- **Initialize Sheet** — rebuilds structure; overwrites Welcome.

---

## Updates

Follow [CHANGELOG.md](https://github.com/ihuckdisc/otf-scraper/blob/main/CHANGELOG.md). After replacing files: reload → Initialize only if listed → normal **Update**. Do not Full Scrape just because you upgraded.
