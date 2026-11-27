# RUThere

Split a ride with Rutgers students already headed where you're going.
14:332:452 Software Engineering, Fall 2026, Group 10.

Team: Zen Castaneda, Joshua In, Aaron Chu, Azra Bano, Chris Savage, Anthony Morales, Abuchi Okpara.

## What RUThere is

If you don't have a car at Rutgers, getting around means a packed bus or a solo Uber that costs you the whole fare. RUThere matches Rutgers students who are leaving the same place at the same time and headed the same way. A student with a car posts a trip and sells seats, or when no driver is going your way, up to four students share one Uber and the app shows what each person owes. A $24 Uber becomes $6 each, and one car is on the road instead of four. Only verified Rutgers emails can sign up.

## Tech stack, in plain words

| Piece | What we use | Why |
|---|---|---|
| Website / app screens | React (with Vite) | Runs in the browser on laptops and phones, one codebase |
| Server / API | Node.js + Express | Handles accounts, trips, and later matching and the fare split |
| Database | PostgreSQL, hosted free on Supabase | Stores students, trips, groups, who owes what. One database transaction guarantees two people never get the same last seat |
| Sign-in | One-time code emailed with Brevo (free, 300/day) | No passwords. Scarletmail addresses only, code expires in 10 minutes |
| Maps | Google Maps / Places API | Address search, travel times, map of the pickup spot |
| Tests | Jasmine (unit) and Cucumber.js (acceptance) | Every must-have user story gets a scenario |
| Hosting | Render (API) and Vercel (client), both free | Public URL for the demo |

## Who codes what

Everyone owns one slice of the code. You build it on your own branch, open a pull request into `main`, one teammate reviews, merge. Your commits stay under your name, so the commit history shows who built what.

### Final phase (Nov 25 to Dec 6)

Exact tasks, shared deadlines and "done when" checks are in `docs/FINAL_PLAN.md`. Every piece uses free services only.

| Person | Branch | Your slice |
|---|---|---|
| Abuchi Okpara | `abuchi` | Ride search: a "find a ride" screen that runs the matching function, and offers a shared Uber when nothing matches |
| Joshua In | `joshua` | Shared Uber groups of up to 4: tables, join, leave, lock, meeting spot. Shares the table layout by Nov 27 |
| Zen Castaneda | `zen` | Fare split and payments: booker enters the fare, everyone sees their share and a Venmo link, mark paid, suggested price per seat with an admin cap |
| Azra Bano | `azra` | Live updates with Socket.IO: group and trip changes reach everyone within two seconds |
| Aaron Chu | `aaron` | Trust and safety: late-cancel strikes and suspension, report and block, free emergency alerts (ready-to-send text plus an email to the contact) |
| Chris Savage | `chris` | Sign in with Google (ScarletMail), demo data for the new features, a GitHub issue per user story, the pilot with real students |
| Anthony Morales | `anthony` | Driver rules (only approved drivers post, seats capped by the car), earnings total on the driver dashboard, Cucumber acceptance tests |

The final presentation and report are handled separately.

### Midterm (Oct 26 to Nov 8)

| Person | Branch | Your slice | Files you own |
|---|---|---|---|
| Zen Castaneda | `zen` | Google Maps: real address autocomplete, map of the pickup spot on each trip. Also owns the UI: one styling pass across all screens so the app looks like the proposal deck and works on a phone | `client/src/components/PlaceInput.jsx`, new `client/src/components/PickupMap.jsx`, `client/src/styles.css` |
| Joshua In | `joshua` | Database on Supabase + putting the app online (Render + Vercel) | `server/src/db/store.js`, `server/src/db/schema.sql`, hosting dashboards |
| Aaron Chu | `aaron` | Sign-in emails via Brevo, "resend code" button with a countdown | `server/src/lib/email.js`, `client/src/pages/SignIn.jsx` |
| Azra Bano | `azra` | Trip detail page, "my trips" page, cancel a trip you posted | new `client/src/pages/TripDetail.jsx`, new `client/src/pages/MyTrips.jsx`, `server/src/routes/trips.js` |
| Chris Savage | `chris` | Profile page (name + Venmo handle), filter trips by campus and day, seed data for the demo | new `client/src/pages/Profile.jsx`, `client/src/pages/Trips.jsx`, new `server/src/db/seed.js` |
| Anthony Morales | `anthony` | Driver application form + admin approve/reject, Cucumber acceptance tests | new `server/src/routes/drivers.js`, new `client/src/pages/DriverApply.jsx`, `server/features/` |
| Abuchi Okpara | `abuchi` | Matching rules: the function that finds trips leaving the same spot within 15 minutes, with tests | new `server/src/lib/matching.js`, new `server/spec/matchingSpec.js`, `docs/MATCHING.md` |

Each midterm slice was about the same size: one or two screens or routes, plus a test. Exact steps are in `docs/TEAM_PLAN.md`.

### Daily workflow

```bash
git checkout yourname
git pull origin main          # get everyone else's merged work
# ... code ...
npm test
git add -A && git commit -m "short plain message of what you did"
git push origin yourname
```

Then open a pull request on GitHub from `yourname` into `main`. Keep commit messages short and plain: "add trip detail page", "fix code expiry bug".

## To-do list (plain version)

Check the box when it is merged to `main`.

**Done**
- [x] Sign in with a Rutgers email and a 6-digit code
- [x] Post a trip (pickup, destination, time, seats, price)
- [x] See the list of upcoming trips
- [x] Pick a campus spot as the address (works without a Google key)
- [x] Database tables designed
- [x] Tests run automatically on every pull request
- [x] 114 tests (100 server, 14 client): server rules, API end-to-end, and client pages

**Before the midterm (Nov 4 freeze)**
- [x] Real address search with Google Maps, and a map of the pickup spot (Zen)
- [ ] UI pass: proposal-deck look, phone layout, empty and loading states (Zen)
- [x] Real database on Supabase so data doesn't disappear (Joshua)
- [x] Site on Vercel (Joshua, Azra)
- [x] API on Render, site points at it by default (Joshua, Azra)
- [x] Real sign-in emails instead of the console, resend button, countdown (Aaron)
- [x] Trip detail page, my trips page, cancel a trip (Azra)
- [x] Request a seat, no double-booking the last seat (Azra)
- [x] Give up your seat (Azra)
- [x] Emergency button: hold 2s, 5s to cancel, opens 911, builds an alert with your location for your emergency contact (logged on the server until real SMS is added), RUPD resources (Azra)
- [x] Profile page, trip filters, fake accounts and trips for the demo (Chris)
- [x] Driver application and admin approval (Anthony)
- [ ] Cucumber acceptance tests (moved to the final phase, Anthony)
- [x] Matching rules spec and a tested matching function (Abuchi)
- [ ] Every user story as a GitHub issue (moved to the final phase, Chris)
- [ ] Demo script and backup video (Chris)
- [ ] Slide deck with architecture and data model diagrams (Azra assembles, everyone fills their section)
- [ ] Register our presentation timeslot on page 6 of the course doc (Abuchi, ASAP, first come first served)
- [ ] Add all six teammates as collaborators on this repo (Azra)

**After the midterm**
- [x] Landing page redesign with scroll animations and a "Sign up" button (Aaron)

**Final phase (Nov 25 to Dec 6, details in `docs/FINAL_PLAN.md`)**
- [ ] Find a ride: search by pickup, destination and time using the matching function (Abuchi)
- [ ] Shared Uber groups of up to 4 when no driver matches (Joshua)
- [ ] Fare split: each person's share, Venmo link, mark paid (Zen)
- [ ] Suggested price per seat and an admin price cap (Zen)
- [ ] Live updates when a group fills, someone drops or a trip is cancelled (Azra)
- [x] Strikes for late cancels, one-week suspension after three (Aaron)
- [x] Report and block a user, admin report queue (Aaron)
- [x] Emergency alert to the contact for free: ready-to-send text from the rider's phone plus an email (Aaron)
- [ ] Sign in with Google using ScarletMail (Chris)
- [ ] Only approved drivers can post, seats capped by the car (Anthony)
- [ ] Driver earnings total (Anthony)
- [ ] Cucumber acceptance tests in CI (Anthony)
- [ ] Every user story as a GitHub issue (Chris)
- [ ] Pilot with about 50 real students, fix what breaks (Chris collects, each owner fixes)
- [ ] Final demo: one full pooled ride, live

**Later, not in this phase**
- [ ] Message your group
- [ ] Rate the people you rode with
- [ ] Automatic texts to the emergency contact (needs a paid SMS service)
- [ ] Verify RUPD numbers with the department

## What's here (midterm scope, Oct 26 to Nov 8)

- **Sign in with a Rutgers email.** Six-digit one-time code, 10-minute expiry, locks after 5 wrong tries, non-Rutgers emails rejected.
- **Post a trip.** Pickup, destination, departure time, open seats, optional price per seat. Validated server-side (different endpoints, 10 minutes to 2 weeks out, 1 to 7 seats).
- **Trip list, trip detail, my trips.** Request a seat (exactly one rider can win the last seat), give it up, cancel a trip you posted.
- **Safety.** On every trip you're on: 911 and RUPD one tap away, and an emergency button that you hold for 2 seconds, with 5 seconds to cancel, which sends your live location and trip details to your emergency contact and opens the dialer with 911.
- **Address search.** Google Places Autocomplete when a key is set, otherwise a built-in list of the campus pickup spots from the proposal.

Matching, groups and the fare split are the Nov 9 to 22 phase. The emergency button is already in. The schema already has the tables they need, and `splitFareCents` is in place and tested.

## Run it in two minutes (no keys needed)

```bash
npm install
cp .env.example server/.env   # the server reads .env from server/
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:4000 (`GET /health` to check)
- With no email key, the sign-in code is **printed in the server terminal**. Copy it from there.
- With no database URL, data lives in memory and resets on restart.

Run the tests:

```bash
npm test
```

Server: 100 Jasmine specs covering pure rules, the last-seat race, driver approval, matching, strikes, blocking and reports, the emergency alert email, and end-to-end API tests that start the real server on a random port (`server/spec/`). Client: 14 Vitest + Testing Library specs for the sign-in, trips and trip detail pages and the text-message link (`client/src/test/`). CI runs both on every pull request.

## Turning on the real services

Each is one variable in `.env`. See `.env.example`.

| Service | Variable | What it unlocks | Who owns it |
|---|---|---|---|
| Supabase (Postgres) | `DATABASE_URL` | Persistent data. Run `npm run db:schema` once to create tables. | Joshua (also deploys) |
| Brevo | `BREVO_API_KEY`, `EMAIL_FROM` (a sender verified in Brevo) | Real sign-in emails instead of console output | Aaron |
| Google Maps | `VITE_GOOGLE_MAPS_KEY` | Address autocomplete and the pickup map | Zen |

## Layout

```
server/   Express API. src/app.js (routes wired up), src/routes (auth, trips, safety, pickup-spots), src/lib (pure logic, tested), src/db (schema.sql + store), spec/ (tests)
client/   React + Vite. src/pages (SignIn, PostTrip, Trips), src/components/PlaceInput.jsx
docs/     FINAL_PLAN.md (who does what Nov 25 to Dec 6), TEAM_PLAN.md (who did what through the midterm), design notes
```

## API

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/request-code` | `{ email }` | Rutgers domains only |
| POST | `/auth/verify` | `{ email, code }` | Sets an httpOnly session cookie, returns `{ user, isNew }` |
| GET | `/auth/me` | | Current user |
| PATCH | `/auth/me` | `{ displayName, paymentHandle, emergencyContactName, emergencyContactPhone }` | |
| POST | `/auth/signout` | | |
| GET | `/pickup-spots` | | Campus spots used by the stubbed address search |
| GET | `/trips` | | Upcoming trips |
| POST | `/trips` | `{ origin, destination, departsAt, seats, pricePerSeatCents?, notes? }` | `origin`/`destination` are `{ label, lat, lng }` |
| GET | `/trips/mine` | | Trips I posted |
| GET | `/trips/:id` | | Includes `seatsLeft` and `joined` |
| POST | `/trips/:id/request` | | Reserve a seat. 409 when full, already joined, or your own trip |
| DELETE | `/trips/:id/request` | | Give up my seat |
| DELETE | `/trips/:id` | | Poster only |
| GET | `/safety/resources` | | 911, RUPD, Rutgers public safety |
| POST | `/safety/alert` | `{ tripId?, location? }` | Emails the emergency contact (if they have an email) and returns `message` + `smsTo` so the phone can open a ready-to-send text |
| GET | `/trust/me` | | My late-cancel strikes, any suspension, and who I blocked |
| GET | `/trust/report-reasons` | | Reasons a user can be reported for |
| POST | `/trust/reports` | `{ userId, reason, details?, tripId? }` | Report someone. An admin reviews it |
| POST | `/trust/blocks` | `{ userId }` | Block someone: you stop seeing each other's trips and can't join them |
| DELETE | `/trust/blocks/:userId` | | Unblock |
| GET | `/trust/reports` | | Admin only: open reports |
| POST | `/trust/reports/:id/dismiss` | | Admin only |
| POST | `/trust/reports/:id/suspend` | | Admin only: pauses the reported user's ride requests for a week |

## How we work

- Work on your own branch (`zen`, `joshua`, `aaron`, `azra`, `chris`, `anthony`, `abuchi`). Open a PR, one teammate reviews, merge to `main`.
- Never commit `.env`. Keys go in `.env` locally and in the hosting dashboard for production.
- Every user story is a GitHub issue using the "User story" template. Link PRs to their issue.
- Pure logic goes in `server/src/lib` with a Jasmine spec next to it in `server/spec`. Routes stay thin.
- `npm test` must pass before you open a PR.
