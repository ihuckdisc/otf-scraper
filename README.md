# OTF Email Scraper

**End users / install:** start with [`fixtures/USER_GUIDE.md`](fixtures/USER_GUIDE.md) (**Easy install** = Make a copy of the template that already includes the script). Do not start with this README.

**Maintainers (Easy template publish):** [`fixtures/OWNER_EASY_TEMPLATE_RUNBOOK.md`](fixtures/OWNER_EASY_TEMPLATE_RUNBOOK.md) and `./dev/pushEasy.sh`.

A self-contained **Google Apps Script** tool, bound to a Google Sheet, that scrapes
OrangeTheory performance emails from `OTbeatReport@orangetheoryfitness.com` and writes
one clean, correctly-typed row per workout into a **Data** tab.

The script ingests email data and maintains a **Dash_Calc** helper tab for FIXED
dashboard charts. Civilian dashboard layout lives in the published template; chart
rebuild details are in `fixtures/DASHBOARD_REFERENCE.md`.

See **CHANGELOG.md** for version, file lists, and whether Initialize is required.

---

## How it works

```
Update / Full Scrape button
        │
        ▼
  Gmail search (from sender)
        │
        ▼
  Normalize  → decode quoted-printable, strip zero-width (&zwnj;), decode entities, tokenize
        │
        ▼
  Detect layout family (legacy 2018 / modern 2019-present / unknown)
        │
        ▼
  Run each SECTION extractor that is present (Header, Summary, Zones, Treadmill, Rower)
        │
        ▼
  Merge → one record (blanks for absent sections)
        │
        ▼
  Dedupe (key) → Validate (anomaly / partial / unknown flags) → insert at top + sort by date desc
        │
        ▼
  Log tab + toast summary
```

### Parsing model: sections, not eras
OrangeTheory added sections incrementally and there is a data gap (Feb 2020 – Jan 2023)
with no samples. Rather than routing each email to a single "era parser", the engine
detects only the **layout family** (for the decoding/anchor dialect) and then extracts
each **section independently if its anchor is present**. A novel combination (e.g. a 2021
class) is parsed correctly with no code change. See `parsers/`.

### Safety nets
- **Unknown template** → row imported, `Status = "Needs Review: unknown template"`.
- **Partial parse** (modern-family email that looks like a class but yields almost no
  fields) → `Status = "Needs Review: partial parse"`.
- **Anomalies** (e.g. HR% > 100) → imported **and** flagged.
- **Duplicates**: exact key skipped + logged; near-duplicates imported and flagged
  `"Possible duplicate"`.
- **Already-imported rows are immutable.** If a re-parse during a Full Scrape finds
  better data, the row is flagged `"Better data available - review"` — never overwritten.

---

## File structure

| File | Purpose |
|------|---------|
| `appsscript.json` | Manifest: V8 runtime + Gmail (read-only) and Sheets OAuth scopes. |
| `Config.js` | Single source of truth: sender, `SCRIPT_VERSION`, tab names, column schema, Gmail query, anchors. |
| `Welcome.js` | Welcome tab content (in-sheet README + version); refreshed on Initialize Sheet. |
| `Dashboard.js` | Builds the `Dash_Calc` helper tab: slicer-immune QUERY aggregation tables (pure builders + writer) that back the FIXED dashboard charts. |
| `Normalize.js` | QP decode, zero-width strip, entity decode, tokenizer, number/time/date parsers. |
| `parsers/Tokens.js` | Token-stream navigation helpers (label-anchored neighbor reads). |
| `parsers/Detect.js` | Layout-family classification. |
| `parsers/sections/*.js` | One module per section: `isPresent()` + `extract()`. |
| `parsers/Parse.js` | Orchestrates detect → run present sections → merge → completeness signal. |
| `SheetIO.js` | Sheet bootstrap, formatting, formula columns, reads, insert-at-top + sort, manual rows. |
| `ManualRowForm.html` | Modal form for **Add Manual Row** (schema-driven field list). |
| `Validate.js` | Dedupe keys, anomaly rules, review flags, better-data comparison. |
| `Ingest.js` | Incremental + full scrape orchestration, dedupe, batched writes. |
| `Log.js` | Log tab writer + toast. |
| `Menu.js` | `onOpen()` custom menu + button entry points. |
| `Fixtures.js` | Generated: embedded email bodies for in-editor tests. |
| `Tests.js` | In-editor test runner (`runTests`). |
| `fixtures/` | `.eml` / `OTFData.csv` and local-only specs; distribution docs (`USER_GUIDE.md`, `DASHBOARD_REFERENCE.md`) are in git. Not pushed to GAS. |
| `CHANGELOG.md` | Version, file list, Initialize yes/no for paste upgrades. |
| `dev/` | Node-only dev harness (parser verification + fixture generation; not pushed to GAS). |

### Data tab columns (left → right, 54 total)

`#` · `Date` · `Day of Week` · `Day of Week Index` · `Day of Month` · `Month` · `Year` · `Class Time` · `Coach` · `Studio` ·
`Calories` · `Splat Points` · `Avg HR` · `Avg % Max HR` · `Peak HR` · `Max % Max HR` · `Peak − Avg HR` ·
`Grey/Blue/Green/Orange/Red Zone (min)` · `Steps` · `Total Active Minutes` ·
`Grey/Blue/Green/Orange/Red Zone %` · `Calories per Active Minute` ·
`Tread Total Distance` · `Steps per Mile` · `Tread Total Time/Avg Speed/Max Speed/Avg Incline/Max Incline/Avg Pace/Max Pace` ·
`Elevation Gain` · `Elevation per Mile` ·
`Rower Total Distance/Time/Avg Watts/Max Watts/Avg Speed/Max Speed/500m Split/Best 500m Split/Avg Stroke Rate` ·
`Status` · `Source` · `Unique Key` · `Gmail Message ID` (hidden)

**16 formula columns** (`#`, date parts, `Peak − Avg HR`, `Total Active Minutes`, five zone %, `Calories per Active Minute`, `Steps per Mile`, `Elevation per Mile`) are **live, position-based formulas** that stay correct after inserts and sorts. Missing metrics are left **blank** (never `0`).

Derived columns worth charting: zone % columns sum to 100% of active minutes (stacked bar charts); `Calories per Active Minute` and `Peak − Avg HR` normalize intensity across class lengths.

---

## Welcome tab (in the sheet)

After **Initialize Sheet**, the **Welcome** tab (leftmost) shows the current **script version**,
next-action copy, and Help links. Troubleshooting lives in `fixtures/USER_GUIDE.md`.

**Releasing script changes:** bump `SCRIPT_VERSION` in `Config.js` → update `CHANGELOG.md`
(file list + Initialize yes/no) → `clasp push` → reload the sheet → **OTF Scraper →
Initialize Sheet** when CHANGELOG says so (content on Welcome is script-owned and
overwrites manual edits on that tab).

---

## `Dash_Calc` tab (slicer-immune chart source)

The user-built **Dashboard** tab uses slicers (Year, Month, Studio, Coach). A Google
Sheets slicer filters **every** chart/pivot built on its attached `Data` range — there
is no per-chart opt-out — so charts whose axis IS a slicer dimension (over time, by
Coach, by Studio) collapse when that slicer is used. The fix is to source those
**FIXED** charts from a range slicers never touch: a `QUERY` that reads the whole `Data`
range ignores slicers entirely.

**Initialize Sheet** creates/refreshes the `Dash_Calc` tab (built by `Dashboard.js`) with
four slicer-immune aggregation tables laid out in separate column bands:

- **Monthly time series (A–S)** — **script-computed** continuous month spine (first class
  month through last class month), including pause months with zero classes so FIXED
  over-time charts do not bridge gaps. Refreshed automatically after **Update**, **Full
  Scrape**, and **Add Manual Row** when rows are added; use **Refresh Dashboard Calcs**
  after manual edits to monthly driver fields on Data (see below). Tread/rower/steps are
  not in this band.
- **By Coach** — QUERY: classes, avg calories, avg splat, avg cal/active-min per coach.
- **By Studio** — QUERY: classes, avg calories, avg cal/active-min per studio.
- **Scorecards & PRs** — live formulas on `Data` columns, including **YTD / MTD** classes,
  calories, and splats (calendar year/month of today), plus all-time PRs (best tread pace
  and best 500m split use `MINIFS` so blanks are excluded).

**Initialize Sheet** fully rebuilds `Dash_Calc` (required when CHANGELOG says so, e.g.
after **1.5.3** scorecard layout changes). Routine scrapes (**1.5.3+**) do **not** call
`ensureSheets()` / clear Dash_Calc — they only refresh the monthly band when rows are added.

### Refresh contract

| Action | Dash_Calc behavior |
|--------|-------------------|
| **Initialize Sheet** | Full rebuild (clear + headers + formats + QUERY bands + monthly body + scorecards) |
| **Update / Full Scrape** (rows added) | Monthly band **A–S** + By Coach / By Studio QUERY anchors via light refresh |
| **Update / Full Scrape** (no rows added) | No Dash_Calc rebuild (missing tabs created only if absent) |
| **Add Manual Row** | Monthly band **A–S** + By Coach / By Studio QUERY anchors |
| **Refresh Dashboard Calcs** (menu or button) | Monthly band **A–S** + By Coach / By Studio QUERY anchors |
| **Clear All / Clear Email / Reset Sheet** | Full rebuild via Initialize path |
| **Manual edit on Data** | See tiers below |

### Manual Data corrections

1. **New / missing class** → **Add Manual Row** (auto-refreshes monthly band).
2. **Wrong PR metric** (rower/tread/elevation, etc.) → edit the Data cell; scorecards
   recalc via formula — usually **no** refresh action.
3. **Wrong monthly driver** (date, calories, splats, avg HR, zone minutes) → edit Data,
   then **OTF Scraper → Refresh Dashboard Calcs** (not Initialize).
4. **Broken layout / first run after a Dash_Calc layout change** → **Initialize Sheet**
   once, then normal workflow.

**Example:** Correcting implausible rower watts on Data updates **PR: Max Rower Avg Watts**
and **PR: Max Rower Watts** via formula; monthly **A–S** unchanged
unless you also changed calories/zones/date.

**Note:** Avg calories/splats in the monthly band divide by class count. Legacy QUERY
`avg()` ignored blank calories/splats on some rows; values match when every class in the
month has those fields populated.

### Migration (older builds → 1.5.5)

1. `clasp push` (or Easy `./dev/pushEasy.sh`, or replace all civilian files) and hard-reload the spreadsheet.
2. Run **Initialize Sheet** once (Welcome must show **1.5.5**). Do **not** run Update
   before Initialize when CHANGELOG says Initialize is required.
3. Normal workflow: Update / Add Manual Row only (no Initialize per scrape).

See **CHANGELOG.md**. Versions **1.4.0–1.4.3** (formula-based monthly spine) were
reverted; **1.5.0+** uses script aggregation. Rollback: revert to **1.3.9**, `clasp push`,
Initialize Sheet.

### Wire Refresh Dashboard button (one-time)

1. **Insert → Drawing** → label e.g. **Refresh Dashboard** → Save and Close.
2. Click drawing → ⋮ → **Assign script** → `runRefreshDashboardCalcs`.
3. Place on Dashboard or Data where you fix values.

This build only creates the **aggregation tables** — you build the FIXED charts yourself
against these ranges (or use the published layout template).

**Do NOT attach slicers to `Dash_Calc`.** Build FIXED charts off its ranges; toggling a
slicer on the Dashboard/Data tab will not change them. Jump to it via **OTF Scraper →
View chart data (Dash_Calc)**.

---

## Setup

**Civilians:** follow `fixtures/USER_GUIDE.md` (PhoenixBunny-style paste path). Summary for developers below.

### Option A — develop locally with clasp (recommended for contributors)
1. Create a new Google Sheet → **Extensions → Apps Script** to create the bound project.
2. Copy the **Script ID** (Apps Script editor → Project Settings → IDs).
3. `npm i -g @google/clasp && clasp login`.
4. Put the Script ID into `.clasp.json` (replace `REPLACE_WITH_YOUR_BOUND_SCRIPT_ID`).
5. `clasp push` (only the GAS files listed in `.claspignore` are uploaded — fixtures and
   `dev/` are excluded).

### Option B — paste into the Apps Script editor
Prefer the User Guide **Easy install** first. Paste appendix: checklist (Copy button,
names without `.js` / `.html` suffixes, no parser folders). Create one script file per
runtime module and paste `appsscript.json` into the manifest. Do not put `Tests.js` in
the civilian required set unless you also generate `Fixtures.js`.

### Option C — Easy template (maintainers)
Duplicate the layout sheet, set Script ID in local `.clasp.easy.json`, run
`./dev/pushEasy.sh`, then follow `fixtures/OWNER_EASY_TEMPLATE_RUNBOOK.md`.

### First run / authorization
1. Reload the Sheet → an **OTF Scraper** menu appears.
2. Run **OTF Scraper → Initialize Sheet** (creates Welcome, Data, Log, and Dash_Calc).
3. The first scrape prompts for OAuth consent. Approve the requested scopes:
   - `gmail.readonly` (read email — script searches OTbeat sender only),
   - `spreadsheets.currentonly` (this spreadsheet only),
   - `script.container.ui` (Add Manual Row dialog).

### Wire the on-sheet buttons (one-time, manual)
Apps Script cannot create Drawing buttons programmatically. The layout template may
already include them — check Assign script before redrawing.
1. **Insert → Drawing** → draw a button labeled "Update" → Save and Close.
2. Click the drawing → ⋮ → **Assign script** → enter `runUpdate`.
3. Repeat with **Full Scrape** → `runFullScrape`.

(The same actions are always available under the **OTF Scraper** menu.)

---

## Usage

- **Update (since last class)** — scrapes everything dated on/after your most recent
  recorded Email class (may add several). Gmail work is incremental; Sheets work is light
  on **1.5.3+** (no full Dash_Calc rebuild).
- **Full Scrape (all emails)** — scans every sender email for anything missing. Use after
  a long gap or for the initial import. Not a timeout workaround.
- **Add Manual Row** — for sessions with no scrapable email (e.g. the 2020–2023 gap). Opens
  a form where you can enter the full set of metrics (date required; everything else
  optional and left blank if untouched). The row is tagged `Source = Manual`, is excluded
  from dedupe/reflagging, and is kept ordered by date but never rewritten. Toast includes
  “Dashboard data updated.” when the monthly band refreshes.
- **Refresh Dashboard Calcs** — recomputes monthly band **A–S** (and QUERY anchors) after
  you edit date, calories, splats, HR, or zone minutes directly on Data.
- **View Log** — opens the Log tab (timestamp, run type, scanned/added/skipped/flags/errors).

Review anything with text in the **Status** column.

---

## Tests

In the Apps Script editor, run the `runTests` function and check the execution log (or
**Executions**). It asserts parsed values against the embedded fixtures (e.g. current
sample: Calories 1003, Splat 8, Avg HR 137, Peak 161, Steps 4240), per-section presence,
an unseen-variant body, the partial-parse / unknown-template flags, normalization, and
dedupe keys. `runTests` requires generated `Fixtures.js` (`node dev/genFixtures.js`).

During local development you can run the same logic under Node (no GAS, no deps):

```bash
node dev/verify.js      # parse every .eml fixture and print the records
node dev/runTests.js    # run the full test suite
node dev/genFixtures.js # regenerate Fixtures.js from the .eml files
```

The `dev/` harness loads the pure-JS modules into one shared VM context, mirroring how
Apps Script shares a single global scope.

---

## Out of scope
- Cost / late-cancel ledger (not in OTbeat emails).
- Class-type column (2G / Lift / Tread50 / etc.).
- Pre-2018 email parser (samples welcome).
- CSV import of old history (un-scrapable rows are re-added manually).
- Time-based / automatic triggers (manual buttons only).
- Any writing to Gmail (read-only).