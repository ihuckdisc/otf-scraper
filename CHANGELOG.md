# Changelog

All notable user-facing script and doc changes.

**Members:** use the **Initialize** line and the **After paste** / Easy-install steps. Treat file upgrades as **all required civilian files** (User Guide checklist) unless a release says otherwise.

**Maintainers:** file lists below name GitHub paths (e.g. `Config.js`). In Apps Script those files are named without `.js` (e.g. `Config`). Easy template: `./dev/pushEasy.sh` + [`fixtures/OWNER_EASY_TEMPLATE_RUNBOOK.md`](fixtures/OWNER_EASY_TEMPLATE_RUNBOOK.md).

---

## 1.5.5 — 2026-08-30

**Initialize:** yes (Welcome chart line).

**For members — why:** Easy install path (copy sheet that already has the script). Welcome notes that charts fill after Full Scrape. Paste install moves to a User Guide appendix. Upgrades: replace-all files, or optional new Easy copy + move Data.

**After install / paste:** reload → if Welcome version missing or behind, **Initialize Sheet** once → confirm Welcome shows `1.5.5` → **Full Scrape** (first time) or **Update**.

**Easy template URL:** https://docs.google.com/spreadsheets/d/1w4b-6xZs3Kr0JXqa9X62HAJeLUKYnnnRzOzmexyx71g/copy  
Renaming the Drive file (e.g. drop “SPIKE”) does **not** change this URL.

**Maintainers — files:**

- `Config.js` (version)
- `Welcome.js`
- `Tests.js` (optional; developers)
- Docs: `fixtures/USER_GUIDE.md`, `fixtures/OWNER_EASY_TEMPLATE_RUNBOOK.md`, `README.md`, `CHANGELOG.md`
- Publish: `.claspignore.easy`, `.clasp.easy.json.example`, `dev/pushEasy.sh`

---

## 1.5.4 — 2026-08-30

**Initialize:** yes (Welcome rewrite).

**For members — why:** Welcome is shorter (next action + Help only). Troubleshooting lives in the User Guide. Menu item for the chart helper is clearer. Same scrape timeout fix as 1.5.3.

**After paste:** reload sheet → **Initialize Sheet** once → confirm Welcome shows `1.5.4` → use **Update**.

**Maintainers — files:**

- `Config.js` (version)
- `Welcome.js`
- `Menu.js`
- `Tests.js` (optional; developers)
- Docs: `fixtures/USER_GUIDE.md`, `fixtures/DASHBOARD_REFERENCE.md`, `README.md`, `CHANGELOG.md`

---

## 1.5.3 — 2026-08-30

**Initialize:** yes (Welcome + Dash_Calc scorecard rows change).

**For members — why:** Update / Full Scrape no longer rebuild the whole chart-helper tab or restamp all Data rows on every run (fixes Spreadsheets timeouts after first import). YTD/MTD scorecards added.

**After paste:** reload → **Initialize Sheet** once → Welcome shows `1.5.3` → **Update** (do not Full Scrape just to “refresh”). Prefer **1.5.5+** if available.

**Maintainers — files (all recommended):**

- `Config.js` (version)
- `Ingest.js`
- `SheetIO.js`
- `Log.js`
- `Welcome.js`
- `Dashboard.js`
- `Menu.js`
- `Tests.js` (optional)
- Docs: `fixtures/USER_GUIDE.md`, `fixtures/DASHBOARD_REFERENCE.md`, `README.md`, `CHANGELOG.md`

---

## 1.5.2 — prior

Dash_Calc QUERY refresh fix; expanded manual install checklist in USER_GUIDE.
