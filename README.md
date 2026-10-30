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
| Sign-in | One-time code emailed with Resend | No passwords. Rutgers emails only, code expires in 10 minutes |
| Maps | Google Maps / Places API | Address search, travel times, map of the pickup spot |
| Tests | Jasmine (unit) and Cucumber.js (acceptance) | Every must-have user story gets a scenario |
| Hosting | Render (API) and Vercel (client), both free | Public URL for the demo |

## To-do list (plain version)

Check the box when it is merged to `main`. Full details, files and owners are in `docs/TEAM_PLAN.md`.

**Done**
- [x] Sign in with a Rutgers email and a 6-digit code
- [x] Post a trip (pickup, destination, time, seats, price)
- [x] See the list of upcoming trips
- [x] Pick a campus spot as the address (works without a Google key)
- [x] Database tables designed
- [x] Tests run automatically on every pull request

**Before the midterm (Nov 4 freeze)**
- [ ] Real address search with Google Maps, and a map of the pickup spot (Zen)
- [ ] Real database on Supabase so data doesn't disappear (Joshua)
- [ ] Put the app on the internet at a public link (Joshua)
- [ ] Real sign-in emails instead of the console (Aaron)
- [ ] "Resend code" button and countdown on the sign-in screen (Aaron)
- [ ] Edit your name and Venmo handle (Aaron)
- [ ] Trip detail page with a "Request a seat" button (Chris)
- [ ] Fake test accounts and trips for the demo, demo script, backup video (Chris)
- [ ] Every user story as a GitHub issue (Anthony)
- [ ] Cucumber acceptance tests for "non-Rutgers email rejected" and "$24 split 4 ways is $6" (Anthony)
- [ ] Written spec of the matching rules and a tested matching function (Abuchi)
- [ ] Slide deck with architecture and data model diagrams (Azra)
- [ ] Register our presentation timeslot (Abuchi, today)

**After the midterm (Nov 9 to Dec 6)**
- [ ] Matching: find trips leaving the same spot within 15 minutes, going near your destination
- [ ] Request and reserve a seat (no double-booking the last seat)
- [ ] Shared Uber groups of up to 4 when no driver matches
- [ ] Fare split screen showing what each person owes
- [ ] Live updates when a group fills or someone drops (Socket.IO)
- [ ] Driver application and admin approval
- [ ] Leave a group, strikes for late cancels
- [ ] Emergency button
- [ ] Message your group, report or block a user
- [ ] Test with real students and fix what breaks
- [ ] Final demo: one full pooled ride, live

## What's here (midterm scope, Oct 26 to Nov 8)

- **Sign in with a Rutgers email.** Six-digit one-time code, 10-minute expiry, locks after 5 wrong tries, non-Rutgers emails rejected.
- **Post a trip.** Pickup, destination, departure time, open seats, optional price per seat. Validated server-side (different endpoints, 10 minutes to 2 weeks out, 1 to 7 seats).
- **Trip list.** Upcoming trips, soonest first.
- **Address search.** Google Places Autocomplete when a key is set, otherwise a built-in list of the campus pickup spots from the proposal.

Matching, groups, fare split and the emergency button are the Nov 9 to 22 phase. The schema already has the tables they need, and `splitFareCents` is in place and tested.

## Run it in two minutes (no keys needed)

```bash
npm install
cp .env.example .env
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

## Turning on the real services

Each is one variable in `.env`. See `.env.example`.

| Service | Variable | What it unlocks | Who owns it |
|---|---|---|---|
| Supabase (Postgres) | `DATABASE_URL` | Persistent data. Run `npm run db:schema` once to create tables. | Joshua (also deploys) |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM` | Real sign-in emails instead of console output | Aaron |
| Google Maps | `VITE_GOOGLE_MAPS_KEY` | Address autocomplete and the pickup map | Zen |

## Layout

```
server/   Express API. src/routes (auth, trips, pickup-spots), src/lib (pure logic, tested), src/db (schema.sql + store)
client/   React + Vite. src/pages (SignIn, PostTrip, Trips), src/components/PlaceInput.jsx
docs/     TEAM_PLAN.md (who does what through the midterm), design notes
```

## API

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/request-code` | `{ email }` | Rutgers domains only |
| POST | `/auth/verify` | `{ email, code }` | Sets an httpOnly session cookie, returns `{ user, isNew }` |
| GET | `/auth/me` | | Current user |
| PATCH | `/auth/me` | `{ displayName, paymentHandle }` | |
| POST | `/auth/signout` | | |
| GET | `/pickup-spots` | | Campus spots used by the stubbed address search |
| GET | `/trips` | | Upcoming trips |
| POST | `/trips` | `{ origin, destination, departsAt, seats, pricePerSeatCents?, notes? }` | `origin`/`destination` are `{ label, lat, lng }` |
| GET | `/trips/:id` | | |

## How we work

- One branch per task, named `yourname/short-task`. Open a PR, one teammate reviews, merge to `main`.
- Never commit `.env`. Keys go in `.env` locally and in the hosting dashboard for production.
- Every user story is a GitHub issue using the "User story" template. Link PRs to their issue.
- Pure logic goes in `server/src/lib` with a Jasmine spec next to it in `server/spec`. Routes stay thin.
- `npm test` must pass before you open a PR.
