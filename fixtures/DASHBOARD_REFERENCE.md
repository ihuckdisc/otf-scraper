# Dashboard Chart Reference

## How to read your dashboard

1. **Slicers** (Year / Month / Studio / Coach) change charts built on **Data** — histograms, day-of-week, zone mix for the rows in the filter.
2. **These stay all-time** (monthly trends, classes by coach / studio, YTD/MTD and PR scorecards on the chart-data helper). Slicers cannot leave them alone on Data, so they are sourced from **Dash_Calc** instead.
3. **Gaps** on monthly charts (a month with zero classes) mean no row in this sheet for that month — missing email or you didn’t go look the same.
4. **Charts blank after a slicer** — reset slicers first. After **Initialize Sheet**, if all-time charts are empty, run **OTF Scraper → Refresh Dashboard Calcs**.
5. **Never** put a slicer on the **Dash_Calc** tab. Menu: **View chart data (Dash_Calc)**.

**OTF app Trends vs this sheet:** app = recent per-class story. Sheet over-time lines = **monthly averages**, no week toggle.

**PRs** are all-time max/min across mixed class formats — not official app benchmarks.

**YTD / MTD** use today’s calendar year/month and ignore Dashboard slicers.

**Paste tip:** Copy this *How to read* section into column A of a Chart Reference tab (one line per row). Width ~520, wrap, freeze row 1. Rebuild details stay in the appendix below — skip unless you are recreating charts.

---

## Appendix A — Rebuild charts

### A1. Slicers (set up first)

1. On **Dashboard**, **Data → Add a slicer**. Range: `Data!A1:BB`. Create four slicers: **Year** (col G), **Month** (col F, full name), **Studio** (col J), **Coach** (col I).
2. Slicers filter every chart whose source is **Data**.
3. **Never** attach a slicer to **Dash_Calc**.

### A2. Data tab columns (FILTERED chart sources)

| Col | Field | Col | Field | Col | Field |
|-----|-------|-----|-------|-----|-------|
| B | Date | R | Grey Zone (min) | AE | Tread Total Distance |
| C | Day of Week | S | Blue Zone (min) | AF | Steps per Mile |
| D | Day of Week Index | T | Green Zone (min) | AH | Tread Avg Speed |
| H | Class Time | U | Orange Zone (min) | AJ | Tread Avg Incline |
| I | Coach | V | Red Zone (min) | AL | Tread Avg Pace |
| J | Studio | W | Steps | AN | Elevation Gain |
| K | Calories | X | Total Active Minutes | AO | Elevation per Mile |
| L | Splat Points | Y | Grey Zone % | AP | Rower Total Distance |
| M | Avg HR | Z | Blue Zone % | AR | Rower Avg Watts |
| N | Avg % Max HR | AA | Green Zone % | AV | Rower 500m Split |
| O | Peak HR | AB | Orange Zone % | AW | Rower Best 500m Split |
| P | Max % Max HR | AC | Red Zone % | AX | Rower Avg Stroke Rate |
| Q | Peak − Avg HR | AD | Calories per Active Minute | | |

### A3. Dash_Calc layout (FIXED chart sources)

- Header row = **2**, data from row **3**. Include **row 2** in chart ranges (series names).
- Over-time charts: use two ranges, e.g. `Dash_Calc!A2:A1002` and `Dash_Calc!F2:F1002`.
- Ranges use `…2:…1002` (~1000 rows). Widen if your tables grow larger.

#### Monthly time series (columns A–S)

Continuous months from first class through last (gap months included with zero classes).

- **A** Year-Month (X-axis) · **B** Year · **C** Month (1–12) · **D** Classes · **E** Total Calories · **F** Avg Calories · **G** Avg Splat · **H** Avg HR
- **I–M** Grey/Blue/Green/Orange/Red zone minutes · **N** Avg Cal/Active Min · **O–S** zone %

Zero-class months: **D = 0**, sum columns **E** and **I–M = 0**, averages **F–H** and **N–S** blank (gaps on line/stack charts).

#### By Coach (columns W–AA)

- **W** Coach · **X** Classes · **Y** Avg Calories · **Z** Avg Splat · **AA** Avg Cal/Active Min

#### By Studio (columns AD–AG)

- **AD** Studio · **AE** Classes · **AF** Avg Calories · **AG** Avg Cal/Active Min

#### Scorecards & PRs (AJ = label, AK = value, rows 3–20)

| Row | Label | Cell |
|-----|-------|------|
| 3 | Total Classes | AK3 |
| 4 | Total Calories | AK4 |
| 5 | Total Splat | AK5 |
| 6 | Avg Calories/Class | AK6 |
| 7 | YTD Classes | AK7 |
| 8 | YTD Calories | AK8 |
| 9 | YTD Splat Points | AK9 |
| 10 | MTD Classes | AK10 |
| 11 | MTD Calories | AK11 |
| 12 | MTD Splat Points | AK12 |
| 13 | PR Max Calories | AK13 |
| 14 | PR Max Splat | AK14 |
| 15 | PR Max Tread Distance | AK15 |
| 16 | PR Best Tread Pace | AK16 |
| 17 | PR Max Elevation/Mile | AK17 |
| 18 | PR Best 500m Split | AK18 |
| 19 | PR Max Rower Avg Watts | AK19 |
| 20 | PR Max Rower Watts | AK20 (Data column AS) |

After upgrading to **1.5.3+**, run **Initialize Sheet** once so YTD/MTD rows exist. Point any Dashboard scorecards at the new cells if your template still used the old AK7–AK14 PR layout.

### A4. Chart catalog

**Legend:** Type = chart type · Src = FILTERED (Data/slicer) or FIXED (Dash_Calc) · Aggregation = scorecard setting where applicable.

#### Overall — KPI scorecards

| Chart | Type | Src | Source range | Aggregation |
|-------|------|-----|--------------|-------------|
| Total Classes | Scorecard | FILTERED | Data!B:B | COUNT |
| Total Calories | Scorecard | FILTERED | Data!K:K | SUM |
| Total Splat Points | Scorecard | FILTERED | Data!L:L | SUM |
| Avg Calories / Class | Scorecard | FILTERED | Data!K:K | AVERAGE |
| Avg Splat / Class | Scorecard | FILTERED | Data!L:L | AVERAGE |
| Avg Total Active Minutes | Scorecard | FILTERED | Data!X:X | AVERAGE |
| Avg Calories per Active Minute | Scorecard | FILTERED | Data!AD:AD | AVERAGE |

**All-time + period (FIXED):** Scorecard on a single cell — e.g. AK3 (total classes), AK7–AK12 (YTD/MTD), AK13+ (PRs).

#### Consistency & Habits

| Chart | Type | Src | X axis | Y / Values |
|-------|------|-----|--------|------------|
| Classes by Day of Week | Column | FILTERED | Pivot: Day of Week (C) | COUNTA of Date |
| Classes by Class Time | Column | FILTERED | Pivot: Class Time (H) | COUNT of Date |
| Classes per Month over time | Column | FIXED | A2:A1002 | D2:D1002 |
| Classes by Coach | Bar | FIXED | W2:W1002 | X2:X1002 |
| Classes by Studio | Column/Pie | FIXED | AD2:AD1002 | AE2:AE1002 |

**Day of week order:** Add Day of Week Index (D) as Values = MIN, sort pivot rows by it, hide that series on the chart (Mon→Sun).

#### General Performance

| Chart | Type | Src | X axis | Y / Values |
|-------|------|-----|--------|------------|
| Calories distribution | Histogram | FILTERED | auto-bucket | Data!K:K |
| Calories vs Splat Points | Scatter | FILTERED | Data!K:K | Data!L:L |
| Calories per Active Minute distribution | Histogram | FILTERED | auto-bucket | Data!AD:AD |
| Avg Calories by Day of Week | Column | FILTERED | Pivot: Day of Week | AVERAGE Calories |
| Calories over time | Line | FIXED | A2:A1002 | F2:F1002 |
| Splat Points over time | Line | FIXED | A2:A1002 | G2:G1002 |
| Avg Cal/Active Min over time | Line | FIXED | A2:A1002 | N2:N1002 |
| Calories by Coach | Bar | FIXED | W2:W1002 | Y2:Y1002 |
| Cal/Active-Min by Coach | Bar | FIXED | W2:W1002 | AA2:AA1002 |
| Cal/Active-Min by Studio | Bar | FIXED | AD2:AD1002 | AG2:AG1002 |

#### Heart Rate & Zones

| Chart | Type | Src | X axis | Y / Values |
|-------|------|-----|--------|------------|
| Average Zone Mix | 100% stacked column or Pie | FILTERED | (none) | Pivot: AVERAGE of Y–AC (five zone %) |
| Zone Mix over time | 100% stacked column | FIXED | A2:A1002 | O2:S1002 |
| Avg % Max HR vs Max % Max HR | Scatter | FILTERED | Data!N:N | Data!P:P |
| Peak − Avg HR distribution | Histogram | FILTERED | auto-bucket | Data!Q:Q |
| Avg HR over time | Line | FIXED | A2:A1002 | H2:H1002 |
| Splat Points vs Red Zone min | Scatter | FILTERED | Data!V:V | Data!L:L |

#### Tread

| Chart | Type | Src | X axis | Y / Values |
|-------|------|-----|--------|------------|
| Steps per Mile distribution | Histogram | FILTERED | auto-bucket | Data!AF:AF |
| Elevation per Mile distribution | Histogram | FILTERED | auto-bucket | Data!AO:AO |
| Avg Speed vs Avg Incline | Scatter | FILTERED | Data!AH:AH | Data!AJ:AJ |
| Tread Distance distribution | Histogram | FILTERED | auto-bucket | Data!AE:AE |

Blank tread rows are excluded automatically.

#### Rower

| Chart | Type | Src | X axis | Y / Values |
|-------|------|-----|--------|------------|
| Avg Watts vs Avg Stroke Rate | Scatter | FILTERED | Data!AX:AX | Data!AR:AR |
| 500m Split distribution | Histogram | FILTERED | auto-bucket | Data!AV:AV |
| Rower Distance distribution | Histogram | FILTERED | auto-bucket | Data!AP:AP |

Format duration axes/histograms as **[mm]:ss** (values are day fractions).

#### Over-time tread/rower (not in Dash_Calc monthly band)

No FIXED source in the default layout. Options:

1. **FILTERED line chart** — X = `Data!B:B` (Date), Y = metric column. Year/Month slicers will narrow the timeline.
2. **Extend the script** (developer path) — add monthly avg columns in `Dashboard.js`.

### A5. Build notes

- **Duration axes** (pace, splits): number format `[mm]:ss`.
- **Histograms:** Customize → Histogram → bucket size.
- **FILTERED** whole-column ranges (`Data!K:K`) pick up new rows; blanks ignored.
- **FIXED** charts must use **Dash_Calc**, not **Data**, or slicers will collapse over-time / by-coach / by-studio views.
- After **Initialize Sheet**, **Dash_Calc** rebuilds; FIXED charts update if ranges still point at the same cells.
- **Refresh Dashboard Calcs** (menu) updates monthly band **A–S** and re-applies By Coach / By Studio QUERY anchors — use after editing date, calories, splats, HR, or zone minutes on **Data**.

---

*Script version at publish time: see Welcome tab / CHANGELOG.md.*
