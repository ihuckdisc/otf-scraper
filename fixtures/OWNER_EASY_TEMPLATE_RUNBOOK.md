# Owner runbook — Easy install template

Publish or refresh the **copy-with-script** spreadsheet members use for Easy install. Do **not** rebuild Dashboard charts from scratch — duplicate the layout sheet.

**Drive naming (no SCRIPT_VERSION in the title):**

| File | Suggested name |
|------|----------------|
| Legacy layout-only | Keep `… [NO SCRIPTS]` (optional cleanup later) |
| Spike (temporary) | `OTF Scraper — Easy install (SPIKE)` |
| Public Easy master | `OTF Scraper — Easy install` (optional `[EASY]`) |

Version truth lives on **Welcome → Script version** and `CHANGELOG.md`.

---

## One-time publish (or refresh after a release)

1. **Duplicate layout**  
   Open the legacy layout sheet (`1OGeRMfHHzYOShJvv3GId_7X7XaB-kdzyr18XtjVQyGI` or your current layout master) → **File → Make a copy** → name `OTF Scraper — Easy install` (or keep using your SPIKE copy if that becomes the public master).

2. **Apps Script project**  
   **Extensions → Apps Script** → **Project Settings** → name the project **`OTF Email Scraper`**. Copy the **Script ID**.

3. **Local clasp target**  
   In the repo: copy `.clasp.easy.json.example` → `.clasp.easy.json` and set `"scriptId"` (file is gitignored).

4. **Civilian push** (no Tests / Fixtures):
   ```bash
   ./dev/pushEasy.sh
   ```
   Confirm Apps Script file list has the civilian modules only. **If `Tests` or `Fixtures` still appear** (left over from an earlier full push), delete those files in the Apps Script editor — `clasp push` does not remove remote-only files.

5. **Template hygiene**  
   - **Data:** headers only — **no class rows**.  
   - Reload spreadsheet → **OTF Scraper → Initialize Sheet**.  
   - Confirm Welcome shows the current `SCRIPT_VERSION` and the “charts fill in after Full Scrape” line.  
   - Log empty / clean.

6. **Drawing buttons**  
   Spike (2026-08-30): Update / Full Scrape drawings **survived** Make a copy — leave them on the master.

7. **Share**  
   Share master: **Anyone with the link → Viewer**. Do **not** grant Editor. Do **not** disable download/copy.

8. **Public URL (published)**  
   https://docs.google.com/spreadsheets/d/1w4b-6xZs3Kr0JXqa9X62HAJeLUKYnnnRzOzmexyx71g/copy  

   **Rename the Drive file anytime** (drop “SPIKE”, use `OTF Scraper — Easy install`). The spreadsheet ID and `/copy` URL stay the same. Do not create a new copy just to rename.

9. **Member simulation**  
   Incognito or second account: open `/copy` → Make a copy → reload → menu → Full Scrape → Allow on **their** copy → Data rows appear.

10. **Legacy**  
    Leave the old layout-only sheet alone. Docs keep it as a quiet footnote only.

---

## After every script release that ships to Easy

1. Bump is already in git (`SCRIPT_VERSION` + CHANGELOG).  
2. `./dev/pushEasy.sh`  
3. On the Easy **master**: reload → **Initialize Sheet** when CHANGELOG says Initialize: yes.  
4. Spot-check Welcome version.  
5. Optional: quick member-sim copy.

---

## Dev vs Easy

| Target | Config | Command |
|--------|--------|---------|
| Your personal/dev bound script | `.clasp.json` | `clasp push` |
| Easy public template | `.clasp.easy.json` + `.claspignore.easy` | `./dev/pushEasy.sh` |

Never commit `.clasp.easy.json` (contains Script ID). Commit `.clasp.easy.json.example` and `.claspignore.easy` only.
