# 🎓 Delivery Manager — Dr. Aravind Padmaraju Masterclass Funnel

---

# 📄 **Delivery Manager — Dr. Aravind Padmaraju Masterclass Funnel SOP**

### 🔗 **Reference Documents**

Before beginning this SOP, get access to and skim each of these:

- **Indian Leads Live Sheet** — all incoming leads (access: **Edit**) → `[TODO: paste link]`
- **Delivery Manager Sheet** — master nurture sequences, the locked source of truth (access: **Edit**) → `[TODO: paste link]`
- **Coach Aravind Sheet → Cashfree Payments** — who paid (access: **View**) → `[TODO: paste link]`
- **Testimonial Drive** — testimonial content for nurture (access: **View**) → `[TODO: paste link]`
- **Session Video Drive** — Sir's session videos (access: **Download**) → `[TODO: paste link]`
- **Pixel Academy Ops Sheet** — agency source of record → [Ops Sheet](https://docs.google.com/spreadsheets/d/1z0ANFdtY6A3ORcuzsmuBhE-QK086YyK6jLv9thtYKaE/edit)

> 🎬 **Loom TODO before handoff:** Record a 2-min screen walkthrough of each tool login (Zoom Support-Rate account, GHL, Growth + TagMango, Pabbly) so Sowmya can find them without asking.

---

### 🎯 **Purpose**

This SOP teaches the Delivery Manager how to run a single Dr. Aravind Padmaraju masterclass end to end — creating the Zoom and WhatsApp links, nurturing registered leads so they actually show up, running the live session manually, pasting the right links in chat during the pitch, and reporting joins and sales afterward. The Delivery Manager is the bridge between the ads/funnel team and the live class: the funnel team fills the room, this role converts it.

---

### 👥 **Who This SOP Is For**

- **Delivery Manager** (currently 👤 Sowmya)
- Any Operations team member who covers masterclass delivery when the primary is unavailable

---

### 🧠 **Overview**

Each masterclass moves through three stages: **setup** (you create the links and hand 5 details to the funnel team), **nurture** (2–3 messages/day so registrants show up), and **live delivery** (you play Sir's pre-recorded video inside a Zoom session and work the chat for ~2 hours). Systems involved: **Zoom** (Support-Rate account), **GoHighLevel (GHL)** for the international funnel, **Growth + TagMango** for the Indian funnel, **Pabbly** for backend lead automation (already set up), several **Google Sheets** (Indian Leads Live, Delivery Manager, Cashfree Payments), the **Testimonial** and **Session Video** Drives, **WhatsApp groups** (e.g. WB002), and **Canva** for nurture images.

Two delivery modes exist: **India = always manual** (you sit and run the meeting live); **Worldwide = Simulive** (Zoom auto-plays the video, but chat is still manual). This SOP covers both.

> 🎨 **Brand colours for any image:** deep purple `#2D1B69` + gold `#F5A623`.

---

## 🪜 **Step-by-Step Process**

---

### **STEP 1 – Set up a new masterclass & hand off to the funnel team**

- Pick the session **mode** in Zoom: **Meeting** (manual, India default), **Webinar**, or **Simulive** (see STEP 12).
- In the **Zoom Support-Rate account**, schedule the session and copy the **Zoom link**.
- Create the **WhatsApp group** and copy the **group invite link**.
- Name the event using the Naming Rules:
    - 1 day, 90–120 min → **Masterclass**
    - 2 days → **Boot Camp**
    - 1–2 days (general) → **Workshop**
- Send **all 5 items in ONE WhatsApp message** to the funnel team:
    1. Masterclass name
    2. Date
    3. Time
    4. WhatsApp group link
    5. Zoom link
- Confirm:
    - ✅ One single message sent (not five separate ones)
    - ✅ Zoom link and WhatsApp link both open correctly when you test them

📌 **Tip:** The funnel team runs ads + automates the rest off these 5 fields. A wrong date here means ads run with the wrong date — double-check before sending.

---

### **STEP 2 – Daily nurture rhythm**

Run this rhythm every day a masterclass is in its registration window:

- **☀️ Morning:** Run the lead-gap check (STEP 3) → send the morning nurture message.
- **🌤️ Afternoon:** Send 1 nurture message (testimonial / poll / countdown).
- **🌙 Evening:** Send 1 nurture message. If tomorrow is a session day, prep the session (STEP 5).
- Confirm:
    - ✅ 2–3 nurture messages sent today (normal masterclass) — **6–7/day** for a Daily Boot Camp

---

### **STEP 3 – Lead-gap reconciliation (daily)**

- Leads auto-add to the WhatsApp group + Indian Leads Live Sheet via **Pabbly**.
- Compare the **Live Sheet count** against the **WhatsApp group member count**.
- Example: 100 in sheet, 70 in group → **30 missing**.
- Send the list of missing leads to 🧑‍💼 **Ramsha (Sales Lead)** for **welcome calls** → she calls them and adds them to the group.
- Track daily until everyone in the sheet is in the group.
- Confirm:
    - ✅ Gap count logged for today
    - ✅ Missing leads forwarded to Ramsha
    - ✅ Yesterday's missing leads now in the group (or escalated again)

> 💡 **Recommended automation**
> - **Tool:** Make (or extend the existing Pabbly setup)
> - **Trigger:** Daily scheduled run (e.g. 9:00 AM IST)
> - **Inputs:** Indian Leads Live Sheet rows; current WhatsApp group member list
> - **Outputs:** Auto-generated "missing leads" list posted to Ramsha's WhatsApp / a sheet tab
> - **Next step:** Install the build chain first, then ideate and ship.
>   - SEED — `git clone https://github.com/ChristopherKahler/seed ~/.claude/skills/seed`
>   - PAUL — `git clone https://github.com/ChristopherKahler/paul ~/.claude/skills/paul`
>   - Then run: `/seed:tasks:ideate` → `/paul:plan` → `/paul:apply`

---

### **STEP 4 – Run the 12-message nurture sequence**

Send the sequence below per masterclass round. **The messages never change — only the date & time change each round.** Master copy lives in the **Delivery Manager Sheet** (keep the sheet as the locked source of truth, not only the WhatsApp group — a deleted group must never lose your sequence).

| # | Message | Media |
|---|---|---|
| 1 | Welcome — "Thank you for registering" | ➕ Welcome video |
| 2 | About Us | Text |
| 3 | Introduction to Sir | ➕ Sir's video |
| 4 | "Let's get to know each other" | ➕ Sir's video |
| 5 | Poll (Sir shares it in the group) | Text |
| 6 | Powerful testimonial (Testimonial Drive) | Image / video |
| 7 | Countdown: 3 → 2 → 1 day to go | Image |
| 8 | Testimonial (evening before) | Image / video |
| 9 | Session morning ~8 AM: "Today is the masterclass" | Image |
| 10 | ~10 AM → 1 hr → 30 min → 10 min to go | Images |
| 11 | "We are LIVE" | Image |
| 12 | +5 min: "We are already live" (latecomers) | Image |

- Where content comes from: **Sir** shares polls & videos directly in the group; **testimonials** from the Testimonial Drive; **countdown images** made in Canva / ChatGPT.
- Confirm:
    - ✅ All messages pulled from the Delivery Manager Sheet master copy
    - ✅ Date & time updated for this round

📌 **Tip:** A 2–5 min delay on any message is fine — sending is manual.

> 💡 **Recommended automation**
> - **Tool:** Make + a WhatsApp Business API / Pabbly WhatsApp module
> - **Trigger:** Scheduled offsets relative to session date/time (e.g. "morning of", "10 min before")
> - **Inputs:** Session date/time; the locked message templates from the Delivery Manager Sheet; testimonial/countdown image URLs
> - **Outputs:** Messages auto-posted to the WhatsApp group on schedule (Sir's live polls/videos stay manual)
> - **Next step:** Install the build chain first, then ideate and ship.
>   - SEED — `git clone https://github.com/ChristopherKahler/seed ~/.claude/skills/seed`
>   - PAUL — `git clone https://github.com/ChristopherKahler/paul ~/.claude/skills/paul`
>   - Then run: `/seed:tasks:ideate` → `/paul:plan` → `/paul:apply`

---

### **STEP 5 – Before session day: prep**

- In **GHL → Custom Values**, update the **date & time** for the session. **Do this before the masterclass** or ads show the wrong date.
- Download Sir's session video from the **Session Video Drive** in advance.
- **Test that the file opens** — high-res files may not play on every laptop.
    - If it fails → upload to Sir's YouTube → download the MP4 → use that copy.
- Prepare backups: keep a **backup MP4** and a **second device** (phone / laptop) logged into the same Zoom, ready.
- Open a notepad and keep these **4 links** ready:
    - WhatsApp group link
    - Payment link (Gold ₹7,777)
    - Test link
    - Gift link
- Confirm:
    - ✅ GHL date/time updated
    - ✅ Video downloaded AND test-played successfully
    - ✅ Backup MP4 + 2nd device ready
    - ✅ All 4 links in the notepad

🧠 **Note:** If the poster timing changed, you may skip the first ~10 min intro (edit the poster in Canva or skip manually).

---

### **STEP 6 – Start the live session (manual / Meeting mode)**

> Indian funnel = **always manual**. You play Sir's video inside a live Zoom meeting.

- Log in to the **Support-Rate Zoom account**.
- Start the meeting.
- **Share → More → Video File.**
- ✅ **"Optimize for video clip" → TICKED ON**
- ✅ **"Share Sound" → TICKED ON** — *no sound = ruined session. Never miss this.*
- Select the downloaded session video → **Share**.
- Confirm Sir's voice + screen are playing for participants.
- Confirm:
    - ✅ Optimize ON, Share Sound ON, both verified before continuing
    - ✅ A test participant can hear audio and see the video

> 🎬 **Loom TODO before handoff:** Record the exact Share → More → Video File → Optimize/Share-Sound click path. This is the highest-risk step and it's pure UI — a video beats text.

---

### **STEP 7 – During the session: links & chat duties**

Sit at the laptop the full ~2 hrs and watch chat.

| When | Action |
|---|---|
| Sir says "Join WhatsApp group & type *I am interested*" | Paste the WhatsApp link → then **give chat access** (below) |
| People type "I am interested" | **Screenshot** → tag 🧑‍💼 Ramsha / sales team |
| Sir reveals price | Paste the **GOLD payment link (₹7,777)** immediately |
| Sir mentions gift | Paste the **gift link** |
| "Link not opening" | Reply & help |
| "Can I pay half / block a seat?" | Reply in chat |
| Someone pays (shows in Cashfree sheet) | Say **"Congratulations [name]"** live |

**How to give WhatsApp chat access (exact taps):**
Group → Group Settings → Edit group settings → Send messages → set to **"All participants."** This lets new joiners type "I am interested."

- Confirm:
    - ✅ Every "I am interested" screenshotted + forwarded to Ramsha
    - ✅ Gold ₹7,777 link posted the moment price was revealed

---

### **STEP 8 – End the session**

- Stop the video file.
- Turn your **camera ON**.
- Say: *"Hello everyone, I'm [Name] from Team Dr. Aravind Padmaraju. Any queries, just raise your hand — we're here to help."*
- Keep it short. **Unmute raised hands → answer** (usually "link not opening" / "what bonuses?").
- Confirm:
    - ✅ Camera on, intro delivered
    - ✅ All raised hands answered before leaving

---

### **STEP 9 – If something breaks during live (Panic Plan)**

| Problem | Do this |
|---|---|
| No sound | Stop share → re-share → confirm "Share Sound" ON before continuing |
| Video freezes / lags | Chat: "One moment — fixing a small technical issue 🙏" → restart the Video File share |
| File won't play | Switch to the **backup MP4** (YouTube-downloaded copy) on your laptop |
| Zoom drops / laptop crashes | Rejoin immediately from the **backup device** → call 🧑‍💼 Ambika / Divya |
| Anything you can't fix in **60 seconds** | Call Ambika or Divya right away — they're in the backend |

🧠 **Note:** Always keep a backup MP4 + a second device logged into the same Zoom, ready before you start.

---

### **STEP 10 – Post-session reporting (to Ramsha / Sales)**

- Send Ramsha a report in this format:
    > "[Date] — [Masterclass] — [X] joined, [Y] during pitch, [Z] sales. Interested leads forwarded."
    >
    > Example: *"28 June — 4D Heal & Manifest — 60 joined, 40 during pitch, 4 sales."*
- Add 2nd-pitch numbers if any.
- Forward **all interested leads** to Ramsha.
- Confirm:
    - ✅ Report sent with joined / pitch / sales numbers
    - ✅ Interested leads forwarded
    - ✅ Payments visible in Coach Aravind Sheet → Cashfree Payments (Gold ₹7,777)

---

### **STEP 11 – Update the funnel for the next session**

- **GHL → Custom Values** → update **date & time** for the next round.
- **Zoom link:** update **only AFTER** the session.
- Folder: **"Women India 4D HM."**
- Confirm:
    - ✅ Next date/time set in GHL
    - ✅ Zoom link rotated post-session

---

### **STEP 12 – (Alternative) Automated Webinar — Simulive setup**

> Only **Webinar** mode can be automated. Meeting mode = always manual. Use this for the **Worldwide** funnel.

- Create webinar → choose **Simulive** (not "Live").
- ✅ Tick **"Transition to live afterwards"** — the meeting stays ON after the video so you can talk. If unticked, it ends instantly.
- Select / upload the video (up to 3).
- Set **start time in IST**. Duration auto-fits.
- Registration: **Required.** Password: **Not required.**
- Backstage **OFF** · Q&A **OFF** · host extras **OFF** · Recording **ON only if needed**.
- Add **Mobile Number** to registration: Registration Settings → Edit → Questions → enable Mobile Number (default = name + email only).
- Save.
- **On the day:** it auto-starts → click the green **"Join"** for host access → video runs hands-free → **chat is still manual** (paste links as asked, exactly like STEP 7).

🧠 **Timezone rule:** Always set the time in **IST**. The Dubai-based account displays a different time (e.g. 6:20 PM IST shows as 4:50 PM Dubai) — that's normal, ignore the display.

🧠 **Note:** Current Simulive — **Worldwide 4D H&M**, Tue / Thu / Sat, 6:30 PM IST (schedule a **6:20 PM** start for the 10-min intro). Old 2:30 PM slot = cancelled.

---

## 🗂️ **Checklist Before Marking Complete**

**Setup**
✅ Zoom + WhatsApp links created; 5-item message sent to funnel team in ONE message
✅ Event named per Naming Rules

**Daily (registration window)**
✅ Lead-gap check done; missing leads sent to Ramsha
✅ 2–3 nurture messages sent (6–7 for Boot Camp) from the master sheet

**Before session**
✅ GHL date/time updated
✅ Video downloaded AND test-played; backup MP4 + 2nd device ready
✅ 4 links ready in notepad; Zoom logged in

**Live**
✅ Share Video File → Optimize ON → Share Sound ON → audio + video confirmed
✅ Watched chat full ~2 hrs
✅ Group-join link pasted + chat access set to "All participants"
✅ "Interested" replies screenshotted + tagged to Ramsha
✅ Gold ₹7,777 link pasted at price reveal; gift link when mentioned
✅ Buyers congratulated live

**After**
✅ Camera ON → short intro → raised hands answered
✅ Report (joined / pitch / sales) sent to Ramsha; interested leads forwarded
✅ Next session date set in GHL; Zoom link rotated

---

## 🧠 **Notes & Reminders**

- **Share Sound ON is non-negotiable.** No sound = ruined session. Verify it every single time before the video plays.
- **The Delivery Manager Sheet is the locked source of truth** for the nurture sequence — never rely only on the WhatsApp group; a deleted group must never cost you the sequence.
- **Never** rely on a single copy of the video — always have a backup MP4 + a second device logged into Zoom before you start.
- **Update the GHL date BEFORE the masterclass**, never after — ads pull from it and will show the wrong date otherwise.
- **First 1–2 sessions:** Divya or Ambika are in the backend with you. If anything goes wrong, **call them first**.
- **Download & store now** (recurring India sessions): 4D Heal & Manifest (IN) · Holistic Chakra Reset (IN) · Inner Child Healing (IN).
- **Standard offer:** Gold **₹7,777** (paste this payment link at price reveal).

---

### 📋 Naming Rules (reference)

| Length | Name |
|---|---|
| 1 day, 90–120 min | Masterclass |
| 2 days | Boot Camp |
| 1–2 days (general) | Workshop |

### 🗓️ Weekly Schedule (fixed) — ~4 India sessions/week

| Session | Day & Time (IST) |
|---|---|
| 4D Heal & Manifest | Wed 6:00 PM + Sun 11:00 AM |
| Inner Child Healing | Friday — 🔴 **[TODO: confirm exact time]** |
| Holistic Chakra Reset | 🔴 **[TODO: fill fixed day & time]** |
| Worldwide 4D H&M (Simulive) | Tue / Thu / Sat, 6:30 PM (start 6:20) |

Schedule each session in Zoom in advance.

### ⚡ Quick Session-Day Run Sheet (keep open live)

- **BEFORE:** Video downloaded + tested · Backup MP4 + 2nd device ready · 4 links ready · Zoom logged in · Countdown messages sent.
- **START:** Share → Video File · Optimize ON ✅ · Share Sound ON ✅ · Play.
- **DURING:** Group join → paste link + give chat access → screenshot "interested" → tag Ramsha · Price → paste Gold ₹7,777 link · Gift link when asked · Reply to all doubts · Congratulate buyers.
- **IF IT BREAKS:** Stall in chat → restart share / backup MP4 → call Ambika / Divya.
- **AFTER:** Stop video → camera ON → short intro → answer hands · Report joined / pitch / sales to Ramsha · Forward interested · Update next date in GHL.

---

## 📞 **Escalation**

- **Owner:** Charan (manages the Dr. Aravind funnel for Pixel Academy)
- **Escalation contacts (save all three first):**
    - 🧑‍💼 **Ramsha** — Sales Lead (payments, interested leads) — WhatsApp **9555530576**
    - 🧑‍💼 **Ambika** — Backend support / guidance — WhatsApp **9727436381**
    - 🧑‍💼 **Divya** — Backend support / guidance — WhatsApp **7671975592**
- **When to escalate:**
    - **Anything that breaks during a live session and can't be fixed in 60 seconds** → call Ambika or Divya immediately (they're in the backend).
    - **Zoom drops / laptop crashes** → rejoin from the backup device, then call Ambika / Divya.
    - **Interested leads & payment questions** → forward to Ramsha.

---

## 📅 **Metadata**

| Field | Value |
|---|---|
| Business | pixel-academy |
| Department | operations |
| Created | 2026-06-28 |
| Last updated | 2026-06-28 |
| Version | 1.0 |
| Author | Charan (for Sowmya) — adapted from the Delivery Manager SOP Google Doc |
