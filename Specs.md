# StudyFlow — Product & Design Specification
*A student-focused task manager with shared focus rooms*

> Placeholder name — swap "StudyFlow" for your app's real name throughout.

---

## 1. Vision

Turn a flat todo list into a **student operating system**: courses as containers for tasks, live dashboards instead of static lists, and a social layer (Pomodoro rooms + chat) that makes focused work feel less lonely — the same reason "study with me" livestreams and Discord co-working servers took off.

Three pillars:
1. **See everything at a glance** — dashboards, countdowns, progress bars, color-coded status.
2. **Nothing lives in isolation** — tasks belong to courses, courses belong to a term, notes attach to tasks.
3. **Study is social** — friends can drop into a shared timer room, see who's actually there, and ask quick questions without breaking anyone's focus.

---

## 2. Visual Design System

### 2.1 Color palette (dark theme, single accent per module)

| Token | Hex | Use |
|---|---|---|
| `bg-base` | `#0D0D0F` | App background |
| `bg-surface` | `#17171A` | Cards, panels |
| `bg-surface-raised` | `#1F1F23` | Hover / active row |
| `border-subtle` | `#2A2A2E` | Dividers, card borders |
| `text-primary` | `#F5F5F5` | Headings, body |
| `text-secondary` | `#9A9A9E` | Meta text, labels |
| `text-muted` | `#5C5C61` | Disabled, placeholders |

Module accent colors (used for icons, active nav item, section headers — **never** more than one accent per screen):

| Module | Accent | Hex |
|---|---|---|
| Tasks / Main | Amber/Gold | `#E8B84B` |
| Planning | Blue | `#4B9FE8` |
| Courses / Notes | Purple | `#9B6BE8` |
| Focus Rooms | Coral/Red | `#E85B4B` |
| Tracking / Stats | Teal-green | `#4BE8A0` |

Status pills (fixed regardless of module):

| Status | Background | Text |
|---|---|---|
| Not Started | `#2A2A2E` | `#9A9A9E` |
| In Progress | `#1E3A5F` | `#4B9FE8` |
| Done | `#1E4A34` | `#4BE8A0` |
| Overdue | `#4A1E1E` | `#E85B4B` |

Priority pills:

| Priority | Background | Text |
|---|---|---|
| Low | `#26333E` | `#7FB0D8` |
| Medium | `#3E3320` | `#E8B84B` |
| High | `#3E2020` | `#E85B4B` |

### 2.2 Typography
- Font: Inter / system-ui, sans-serif.
- Page title: 28px semibold.
- Section header: 13px, uppercase, letter-spacing 0.08em, paired with a small icon.
- Body / row text: 14px regular.
- Meta text (dates, counts): 12px, `text-secondary`.

### 2.3 Core visual patterns (borrowed from the reference screens)
- **Small-caps icon headers** for every section (`⚡ QUICK ACTIONS`, `📁 PROJECTS`) — turns dense data into scannable zones.
- **Colored pills**, never plain text, for status/priority — pre-sorts information visually before the user reads a word.
- **Inline computed fields**: "time left" and "% complete" calculated automatically, shown directly in the row.
- **Multiple saved views (tabs) over one dataset**: Today / This Week / Month / By Priority / Overdue — filters, not duplicated lists.
- **A stats sidebar** on the right: live counts (Due Today, Overdue, In Progress) so the dashboard is legible without opening anything.
- **Quick-capture bar** at the top: one-tap buttons for each item type (Task, Event, Reminder, Note) to remove "which button do I click" friction.

---

## 3. Navigation Structure

### 3.1 Top module bar (horizontal, like the reference)
```
▸ MAIN     ▸ NOTE-TAKING     ▸ PLANNING     ▸ TRACKING     ▸ FOCUS ROOMS     ▸ OTHERS
```

### 3.2 Left side nav (persistent, icon + label)
```
┌─────────────────────────┐
│  📋  StudyFlow           │
├─────────────────────────┤
│  ⚡ Quick Add             │
├─────────────────────────┤
│  🏠 Dashboard             │
│  ✅ Tasks                 │
│  📚 Courses               │
│  🗓️  Calendar              │
│  ⏱️  Focus Rooms           │
│  📝 Notes                 │
│  📊 Stats                 │
│  ⚠️  Overdue               │
├─────────────────────────┤
│  ⚙️  Settings              │
│  👤 Profile               │
└─────────────────────────┘
```
- Collapsible to icon-only rail on smaller screens.
- Active item gets the module's accent color as a left border + icon fill.
- Badge counters on **Overdue** and **Focus Rooms** (e.g. "2 friends studying now").

---

## 4. Data Model

```
User
 ├─ id, name, avatar, timezone
 ├─ streak_count, total_focus_minutes
 └─ friends[] (User refs)

Term (Semester)
 ├─ id, name ("Fall 2026"), start_date, end_date, is_current

Course
 ├─ id, term_id, name, color_tag, instructor { name, email }
 └─ progress_percent (computed from tasks)

Task
 ├─ id, course_id (nullable — "personal" tasks allowed)
 ├─ title, type (assignment | exam | reading | lab_report | personal)
 ├─ priority (low | medium | high)
 ├─ status (not_started | in_progress | done)
 ├─ due_date, time_estimate
 ├─ recurrence (none | daily | weekly | custom_rrule)
 ├─ linked_notes[] (Note refs)
 └─ time_left (computed field, not stored)

Note
 ├─ id, task_id (nullable), course_id (nullable)
 ├─ title, body, tags[], saved_url (optional, for "read later" articles)

FocusRoom
 ├─ id, code (6-char shareable, e.g. "PLR-482")
 ├─ host_user_id
 ├─ settings { work_minutes, break_minutes, long_break_every, rounds }
 ├─ status (lobby | focusing | on_break | ended)
 ├─ current_round, started_at
 └─ participants[] (RoomParticipant)

RoomParticipant
 ├─ user_id, room_id
 ├─ state (joined | focusing | on_break | quit | completed)
 ├─ joined_at, left_at
 └─ focus_minutes_this_session

RoomMessage
 ├─ id, room_id, user_id
 ├─ body, type (text | raised_hand | system_event)
 └─ created_at
```

---

## 5. Views / Pages

### 5.1 Dashboard (Home)
- Top: Quick Actions bar (Task, Exam, Reading, Reminder, Note — one tap each).
- Center: tabbed task table — **Today / Tomorrow / This Week / Month / By Priority** — with columns: Course · Priority · Status · Due Date · Time Left.
- Right sidebar:
  - **Stats card**: Due Today, Due This Week, Overdue, In Progress, Completed — plain counts, updates live.
  - **Next Focus Sessions** card: upcoming scheduled room sessions with friends.
  - **Currently studying** card: avatars of friends live in a Focus Room right now, with a one-tap "Join" button.

### 5.2 Courses
- Grid or list of course cards, each showing: color tag, progress bar, instructor contact, next due item.
- Click into a course → **Backpack view**, grouped by type (Assignments / Lab Reports / Notes / Readings), each group collapsible, each item showing due date inline — directly modeled on the reference "university" template.

### 5.3 Calendar / Month view
- Standard month grid; tasks render as colored dots/pills on their due date; click a day to see the day's list.

### 5.4 Overdue & Unscheduled
- A dedicated, always-visible section (not buried in filters) — tasks with no due date or a past due date land here automatically, so nothing silently falls through the cracks.

### 5.5 Stats / Tracking
- Weekly completion rate, streak counter, total focus-room minutes this week, most-used course tag.

### 5.6 Focus Rooms *(new — detailed in §6)*

### 5.7 Notes
- Simple note list, filterable by course/tag, with a "saved articles" sub-section for read-later links (mirrors the reference "notebook" pattern).

---

## 6. Focus Rooms — Pomodoro with Friends

This is the differentiating feature: a **shared, synchronized Pomodoro timer** with visible presence and a context-aware chat.

### 6.1 Core loop
1. **Host creates a room** → sets work/break length, number of rounds, optional course tag ("Studying: Organic Chem").
2. App generates a **shareable 6-character code** (e.g. `PLR-482`) and a joinable link.
3. Friends **join via code or link** → land in the **Lobby**.
4. Host starts the session → timer is **server-synced**, so every participant sees the identical countdown regardless of when their tab loads.
5. Through the session, the app tracks each participant's **state** in real time: `joined → focusing → on_break → completed`, or `quit` if they leave early.
6. At the end, everyone sees a **session recap**: who completed the full session, who dropped, total minutes focused per person.

### 6.2 Room Lobby (wireframe)
```
┌──────────────────────────────────────────────────────┐
│  ⏱  FOCUS ROOM · Code: PLR-482          [Copy Link]  │
│  Organic Chem Study Sesh          🔒 Locked by host   │
├──────────────────────────────────────────────────────┤
│  ROUND SETTINGS                                       │
│  Work: 25 min   Break: 5 min   Rounds: 4   Long: 15m  │
├──────────────────────────────────────────────────────┤
│  IN LOBBY (4)                                         │
│  🟢 You (host)                                        │
│  🟢 Mira            ready                             │
│  🟡 Deniz           connecting…                       │
│  ⚪ Kaan            invited, not joined                │
├──────────────────────────────────────────────────────┤
│              [ ▶ Start Session ]                      │
└──────────────────────────────────────────────────────┘
```

### 6.3 Live session screen (wireframe)
```
┌───────────────────────────────┬────────────────────────┐
│         🔴 FOCUS · Round 2/4    │   💬 Room Chat          │
│                                │  ─────────────────────  │
│           23:41                │  🔒 Chat muted during   │
│         remaining              │     focus — reactions   │
│                                │     only                │
│   [ ⏸ Pause ]  [ 🚪 Leave ]     │                         │
├───────────────────────────────┤  ✋ Deniz raised a hand   │
│  PARTICIPANTS (4)              │     2 min ago            │
│  🟢 You         focusing        │                         │
│  🟢 Mira        focusing        │  ─────────────────────  │
│  🟡 Deniz       ✋ has question │  [ type when unmuted ]  │
│  ⚫ Kaan        quit (12:03)     │                         │
└───────────────────────────────┴────────────────────────┘
```

### 6.4 Presence & status rules
| State | Meaning | Visible to room as |
|---|---|---|
| `joined` | In lobby, hasn't started | Gray dot |
| `focusing` | Actively in a work block | Green dot |
| `on_break` | In a break block | Blue dot |
| `quit` | Left before the session ended | Dark/gray dot + timestamp of when they left |
| `completed` | Stayed until the final round ended | ✅ checkmark |

This is the "who quit and who joined" mechanic you asked for — every participant's row updates in real time, and a departure is logged with a timestamp rather than the person just silently disappearing.

### 6.5 Chat behavior (context-aware, not just a plain sidebar chat)
- **During a focus block**: chat input is locked to plain text; only lightweight reactions and a **✋ "raise hand" signal** are allowed, so people can flag they have a question without derailing anyone's focus.
- **During a break block**: chat unlocks fully for normal messages.
- **System messages** auto-post: "Deniz joined", "Mira quit after 12 min", "Round 3 starting" — so the log itself becomes a lightweight session history.
- Optional: a **"quick question" thread** that pins any message sent with the ✋ flag so the host can address it at the next break without scrolling.

### 6.6 Session recap (shown to everyone when the room ends)
```
┌──────────────────────────────────────────┐
│  ✅ Session Complete — 1h 40m             │
│                                            │
│  Mira      100 min focused   ✅ completed  │
│  You        88 min focused   ✅ completed  │
│  Deniz      52 min focused   🚪 quit R3    │
│  Kaan       12 min focused   🚪 quit R1    │
│                                            │
│  🔥 Your streak: 5 days                    │
│              [ Share Recap ]  [ Rematch ]  │
└──────────────────────────────────────────┘
```
- "Share Recap" exports a small image/card for social sharing (streak flex — genuinely drives repeat usage in study-together apps).
- "Rematch" instantly spins up a new room with the same participants and settings.

### 6.7 Gamification hooks (optional, phase 2)
- Daily/weekly **streaks** for showing up to at least one focus session.
- **Leaderboard** among friends: total focus minutes this week.
- **Badges**: "Never quit early — 10 sessions", "Hosted 5 rooms".

---

## 7. Technical Notes (for whoever builds this)

- **Real-time layer required** for room state + chat: Supabase Realtime, Firebase Realtime DB/Firestore, or a custom WebSocket server (Socket.io/Ably/Pusher) all fit; pick based on your existing backend.
- **Timer authority**: the timer must be **server-driven** (store `started_at` + duration, compute remaining time on each client), not client-driven — otherwise timers drift out of sync across participants.
- **Reconnect handling**: a dropped connection should re-sync the participant's state and remaining time from the server on reconnect, not reset it.
- **Room codes**: short-lived, expire when the room ends or after a max idle time, to avoid stale/guessable codes.
- Existing todo data model (tasks, courses, terms) can stay in your current database — Focus Rooms is an additive module, not a rewrite of the task system.

---

## 8. Suggested Build Phases

| Phase | Scope |
|---|---|
| 1 | Visual refactor: dark theme, pills, section headers, tabs over existing task list |
| 2 | Courses as containers + term filter + dashboard stats sidebar |
| 3 | Overdue/unscheduled dedicated view + recurring tasks |
| 4 | Focus Rooms MVP: create/join by code, synced timer, live presence, no chat yet |
| 5 | Room chat with focus/break-aware locking + raise-hand |
| 6 | Session recap, streaks, sharing |
| 7 | Leaderboards/badges (optional polish) |

---

*End of spec. Next step: if you share your current app's code or stack, I can start applying §2–§5 directly to your codebase, then scaffold the Focus Room data model and real-time logic from §6–§7.*