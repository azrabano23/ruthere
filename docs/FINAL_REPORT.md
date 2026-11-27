# RUThere: Final Report

14:332:452 Software Engineering, Fall 2026, Group 10
Zen Castaneda, Joshua In, Aaron Chu, Azra Bano, Chris Savage, Anthony Morales, Abuchi Okpara

Live site: https://ruthere-5buf.vercel.app · Repository: https://github.com/azrabano23/ruthere

Status as of November 27, 2026. Sections 5 and 6 describe the work scheduled through December 6 and will be updated after the pilot.

## 1. Project overview

Getting around Rutgers–New Brunswick without a car means a crowded campus bus that stops where campus stops, or a solo Uber that costs one student the whole fare. Students leaving the same place at the same time still end up in separate cars. RUThere is a web app that matches verified Rutgers students headed the same way at the same time, so four students share one car and each pays a quarter of the fare.

The app offers two ways to ride. A **student driver** with an admin-approved car posts a trip with open seats and a price per seat; riders pay the driver directly. When no driver is going a rider's way, up to four students share an **Uber**: one member books it and the app shows what each person owes. Every trip carries safety features: Rutgers-only accounts, an emergency button that reaches 911 and the rider's emergency contact, and the ability to report or block another user.

Our objectives for the semester, from the proposal, were:

1. Rutgers-only accounts, verified by email, with no passwords stored.
2. Automatic matching by pickup area, destination and a 15-minute departure window.
3. A fare split that every rider sees before they commit, with no double-booking of seats.
4. Safety: an emergency button and verified riders only.
5. A working, deployed app tested with real students.

Objectives 1, 3 and 4 are complete and deployed. Objective 2's matching function is written and tested; the screen that uses it and the shared-Uber groups are the final phase. Objective 5's pilot runs December 2 to 6.

## 2. Work completed

### Timeline

| Date | Milestone |
|---|---|
| Oct 9 | Proposal: requirements, user stories, use cases |
| Oct 29 | Repository created. Sign-in, trip posting, trip list, test suite, CI |
| Oct 30 | Trip detail, my trips, cancel, seat reservation with a race test, give up a seat, emergency button |
| Nov 1–4 | Google Maps, pickup maps, Supabase database, Render API, Vercel site, Brevo email, driver applications, matching function, profile and filters, demo data |
| Nov 4 | Code freeze. All seven branches merged into `main`, 84 tests |
| Nov 6 | Midterm presentation |
| Nov 7–25 | Landing page redesign, final-phase plan |
| Nov 25–27 | Late-cancel strikes, report and block, free emergency alerts; live updates over Socket.IO. 126 tests |

### Features on `main` today

**Accounts.** Sign in with a Rutgers email and a six-digit code. Codes expire after ten minutes and lock after five wrong tries; non-Rutgers addresses are rejected. A profile holds a display name, Venmo or Zelle handle, and an emergency contact (phone and email).

**Trips.** Post a trip with a pickup, destination, departure time, open seats and an optional price per seat, validated on the server (different endpoints, ten minutes to two weeks out, one to seven seats). Address search uses Google Places; without a key, a built-in list of the ten campus pickup spots. Browse upcoming trips, filter by campus and day, see each pickup spot on a map, open a trip, request a seat, give it up, and cancel a trip you posted.

**Seat reservation.** Exactly one rider can take the last seat, even when many request it at the same instant. An automated test fires 25 simultaneous requests at a one-seat trip and asserts one success, 24 "full" responses and one row in the database.

**Drivers.** Students apply to drive with their car's make, model, color, plate and seat count. Admins (emails listed in `ADMIN_EMAILS`) review a queue and approve or reject; approval is one transaction so two admins can't both decide. A driver dashboard lists the driver's trips.

**Matching.** A pure, tested `findMatches` function implements the proposal's rules: pickups within 200 meters, departures within 15 minutes, destinations within 400 meters, seat capacity, a four-rider cap for shared Ubers, no self-matches, results ranked by time difference then distance.

**Safety.** On every trip a rider is on: 911 and Rutgers University Police one tap away, and an emergency button held for two seconds with a five-second cancel window. When it fires, the app opens the dialer with 911, emails the emergency contact a message with the trip and a live map link, and offers a pre-filled text message the rider sends from their own phone. The panel states plainly that the rider must tap Call and Send themselves.

**Trust.** Giving up a seat less than an hour before departure adds a strike; three strikes in 30 days pause ride requests for a week. Riders can report another user to an admin queue, or block them so neither sees the other's trips.

**Live updates.** The server runs Socket.IO beside Express. When a seat is taken or given up, everyone on that trip sees the change without refreshing; when a driver cancels, every rider gets a personal notice. The client reconnects on its own when the free API host wakes from sleep. The group events the final phase needs are already wired.

**Operations.** The site deploys to Vercel and the API to Render on every push to `main`. Data lives in PostgreSQL on Supabase. A health check queries the database and names the error when it fails. 126 automated tests (107 server, 19 client) run in GitHub Actions on every pull request.

### Process

Seven people, one branch each, pull requests into `main` with one teammate's review, short plain commit messages, and the test suite as the gate. Every branch merged clean. User stories are tracked in the README's checklist and the final-phase plan assigns each remaining item to one owner.

## 3. Technical implementation

### Architecture

```
Browser (React + Vite, on Vercel)
   │  HTTPS, cookie session (through Vercel's /api proxy)
   │  WebSocket, short-lived token (straight to Render)
   ▼
Express API (Node.js, on Render)          ──►  Google Maps (addresses, pickup map)
   accounts · trips · seats · drivers     ──►  Brevo (sign-in codes, safety emails)
   safety · trust · realtime
   │  SQL, row locks
   ▼
PostgreSQL (on Supabase)
   users · signin_codes · trips · seat_reservations
   driver_applications · strikes · reports · blocks
```

We chose one server and one database on purpose: the hardest correctness problem in a ride app, two people booking the same last seat, is solved cleanly by a single database transaction, and a single server keeps the rules in one place.

### Code layout

Pure rules live in `server/src/lib` as plain functions with no database, so they are tested directly: email domain checks, code expiry, trip validation, fare splitting, reservation decisions, matching, strike rules, safety messages. Routes in `server/src/routes` stay thin: validate, call the store, respond. The store in `server/src/db/store.js` has two implementations behind one interface, an in-memory one for tests and development and a PostgreSQL one for production, so every feature works with no setup and tests run in under a second. Routes publish events on an in-process bus; the realtime layer forwards them to the right socket rooms, so routes never know sockets exist.

### The seat reservation

Each "request a seat" runs in one transaction: `SELECT ... FOR UPDATE` on the trip row, which makes other requests for that trip wait; count the reservations inside the lock; insert if there is room or return "full"; commit. The next request in line sees the updated count. A unique index on (trip, rider) blocks double-joining. The in-memory store does the check and insert in one synchronous block, which Node cannot interrupt, so the same test proves both.

### Live updates

The Vercel proxy cannot carry websockets, so the browser opens its socket straight to the API host. The session cookie does not travel that way, so the client first calls `GET /auth/socket-token` through the proxy and hands the five-minute token to the socket. Each socket joins a private room for its user and may ask to watch a trip it is on; the server checks membership before joining the room. Events reach only those rooms. A test starts a real server, connects two real sockets, has one rider take a seat over HTTP, and proves the driver's socket sees it within two seconds.

### Testing

| Suite | Covers |
|---|---|
| Jasmine, pure rules | Email domains, code expiry and lockout, trip validation, fare split, reservation decisions, matching, strike rules, safety messages, driver rules |
| Jasmine, store | The 25-rider race, giving up a seat, driver approval, blocks in both directions |
| Jasmine, API end to end | Real HTTP routes on a random port: sign-in, trips, seats, cancel permissions, safety alerts, reports, blocks, health check, error messages |
| Jasmine, realtime | Two real sockets on a real server, token checks, room isolation, cancellation notices |
| Vitest + Testing Library | Sign-in page, trips list and filters, trip detail, live updates, emergency text links |

All 126 run on every pull request in GitHub Actions. Cucumber.js acceptance scenarios for the must-have requirements are the final phase (Anthony).

## 4. Challenges

**Two riders could win the last seat.** Any check-then-insert written as two steps has a window where both pass the check. We moved the check inside a transaction that locks the trip row, and wrote the 25-rider race test first so the fix had to prove itself. This is the one place we used an AI assistant deliberately, because the bug never shows in a demo and ruins a real ride.

**Two hosts, one session.** The site is on Vercel and the API on Render. A cookie set by Render is a cross-site cookie that browsers drop, so every request after sign-in failed. We routed API calls through a Vercel rewrite so the cookie is first-party, and gave the websocket, which cannot use the rewrite, its own short-lived token.

**The server could not reach the database.** Supabase's direct address is IPv6-only and Render has no IPv6, so every database call hung with an empty error. We added a health check that actually queries the database and reports the real message, which pointed at the cause, and switched to Supabase's IPv4 session pooler.

**Email needs a domain.** Every email service refuses to send from a domain you have not verified, and we don't own one. We switched to Brevo's free plan and print codes to the server log in development. Google sign-in with ScarletMail, which needs no email at all, is in the final phase.

**Everything had to be free.** Render's free API sleeps after 15 minutes, Supabase pauses after a week idle, Brevo allows 300 emails a day, and there is no free way to send a text. We wrote the sleep and reconnect handling into the client, keep the Maps quota cap on, and made the emergency text a pre-filled message the rider sends from their own phone.

**Seven people, one codebase, tight dates.** One branch per person, pull requests with a review, the test suite as the gate, and one person merging kept `main` green through 70 commits and 22 merged pull requests.

## 5. Next steps (November 27 to December 6)

Each item has one owner in `docs/FINAL_PLAN.md`.

| Work | Owner | What "done" looks like |
|---|---|---|
| Ride search screen using `findMatches` | Abuchi | Four seeded trips and one search return the right matches in order; an empty search offers a shared Uber |
| Shared-Uber groups: tables, join with a row lock, lock at four, meeting spot | Joshua | Four students form a group, a fifth is refused |
| Fare split with Venmo payment links, suggested seat price, admin price cap | Zen | $24 shows $6.00 each with a working link; no seat above the cap |
| Group live events on the realtime layer already in place | Azra | Two phones in one group see each other join and leave |
| Only approved drivers post; seats capped by the car; driver earnings; Cucumber acceptance tests in CI | Anthony | Unapproved account can't post; suite runs in CI |
| Google sign-in with ScarletMail; demo data; user stories as GitHub issues; pilot | Chris | 50 students onboarded, bug list running |
| Final demo | All | One full pooled ride on stage: post, match, lock, ride, split |

After the course: message your group, rate the people you rode with, automatic texts to the emergency contact (needs a paid SMS service), and a review of New Jersey's rules on paid rides before anyone drives for money outside the class.

## 6. Team contributions

Measured on `main` as of November 27, excluding merge commits and lock files. Joshua's work on the Supabase database and the Render and Vercel deployments lives in hosting dashboards rather than git, so his row understates it.

| Member | Commits | Lines added | Main work |
|---|---|---|---|
| Azra Bano | 36 | 2,844 | Project scaffold, sign-in, trips, seat reservation and race test, give up a seat, emergency button and safety panel, API and client test suites, live updates over Socket.IO, deployment configuration, debugging of the database and cookie problems, all merges to `main`, midterm deck, this report |
| Aaron Chu | 9 | 1,582 | Brevo email, resend code and countdown, landing page redesign, late-cancel strikes, report and block, free emergency alerts, final-phase plan |
| Zen Castaneda | 5 | 1,081 | Google Maps address search, pickup maps, UI redesign, dark mode, driver dashboard, mobile styles |
| Chris Savage | 6 | 773 | Profile page, trip filters by campus and day, demo data |
| Anthony Morales | 12 | 419 | Driver applications and admin approval, driver dashboard page |
| Abuchi Okpara | 1 | 316 | Matching function and specification, Q&A bank |
| Joshua In | 1 | 2 | Supabase database, Render and Vercel deployments, production cookie fix |

Suggested contribution split, to be agreed by the team: Azra 35%, Aaron 15%, Zen 12%, Anthony 10%, Chris 10%, Abuchi 9%, Joshua 9%.
