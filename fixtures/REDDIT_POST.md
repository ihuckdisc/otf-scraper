# Reddit post draft — r/orangetheory

Copy the **Post body** below into a new submission. Tweak links before posting. Flair suggestion: **Misc** or **Tips** (whatever fits that week).

---

## Title options (pick one)

- **OTF performance email → Google Sheet tracker (2025 refresh, dashboard template + self-install script)**
- **Updated OTF email scraper for Google Sheets — builds on the 2018 “no computer skills” tool, with a full dashboard**
- **Anyone else spreadsheet their OTbeat emails? Open-source scraper + dashboard layout**

---

## Post body

If you still have years of **OTbeatReport@orangetheoryfitness.com** summaries in Gmail, this might be useful.

A while back someone shared [**OTF Email Scraperv2 – no computer skills required**](https://www.reddit.com/r/orangetheory/comments/8usrp1/otf_email_scraperv2_no_computer_skills_required/) here (2018). That was a huge help for a lot of us. This is a **spiritual successor**: same idea (pull your own OTF performance emails into a Sheet), but rebuilt for newer email formats, more metrics (zones, tread, rower when they’re in the mail), dedupe/review flags, and a **dashboard template** with slicers.

**What it does**

- One row per class on a **Data** tab (calories, splats, HR, zone minutes/%, tread, rower, etc. when the email has them)
- **Update** = sync new emails since your last class; **Full Scrape** = backfill everything from that sender
- **Gmail read-only** + **your spreadsheet only** — does not delete or send mail
- **Add Manual Row** for classes with no email (hello 2020–2023 gap)
- Optional **dashboard layout** (charts + Year/Month/Studio/Coach slicers) — FIXED over-time charts use a helper tab so slicing doesn’t wreck your trends

**What it doesn’t do**

- Not official OTF / not affiliated
- Not automatic — you run Update when you want (menu or a button you assign once)
- Won’t parse every weird template perfectly — flagged rows go to a **Status** column for review

**Install (important — two parts)**

Google will show a scary OAuth screen if you use someone else’s copy *with their script attached*. This release is split on purpose:

1. **Copy the dashboard layout** (charts/slicer setup — **no script**):  
   https://docs.google.com/spreadsheets/d/1TFLzWsZW90z2KTGOdj5pyVDa6giAIKlapsNSYnw0IDw/copy  
2. **Add the scraper to *your* copy** from GitHub (paste into Extensions → Apps Script, or clasp if you’re nerdy):  
   https://github.com/ihuckdisc/otf-scraper  
   Full steps: `fixtures/USER_GUIDE.md` in the repo (Initialize Sheet → Full Scrape → approve permissions).

Runs entirely in **your** Google account. I don’t see your email or your stats.

**Requirements**

- Performance summary emails from **OTbeatReport@orangetheoryfitness.com** in the Gmail you connect
- A Google account and ~15–20 min first setup

**Repo / help**

- GitHub: https://github.com/ihuckdisc/otf-scraper  
- Chart rebuild cheat sheet: `fixtures/DASHBOARD_REFERENCE.md`  
- Issues/questions: GitHub issues (or reply here — I’ll check when I can)

If you used the 2018 sheet and loved it, this is the same rabbit hole with more columns and a sturdier parser. If you never got into it, you’re not missing anything official — just a nerdy way to visualize class history.

---

## First comment (optional — pin-worthy install checklist)

Quick checklist:

1. Open template **/copy** link → save to your Drive  
2. **Extensions → Apps Script** → paste project files from GitHub → Save  
3. Reload sheet → **OTF Scraper → Initialize Sheet**  
4. **Full Scrape** → approve Gmail read + this sheet only  
5. Optional: **Insert → Drawing** buttons → assign `runUpdate` / `runFullScrape`  
6. Slice dashboard; if a chart acts weird, see `DASHBOARD_REFERENCE.md` (FIXED vs FILTERED sources)

---

## Notes for poster (do not paste)

- Publish the template sheet **without** a bound script before sharing the `/copy` link.
- Expect OAuth questions — point people to self-install, not “use my copy with script.”
- r/orangetheory often appreciates brevity; trim tables if mods complain about length.
- Credit the 2018 thread link; add OP username in a thank-you edit if you find it in the thread.
