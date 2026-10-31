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

## Who codes what

Everyone owns one slice of the code. You build it on your own branch, open a pull request into `main`, one teammate reviews, merge. Your commits stay under your name, so the commit history shows who built what.

| Person | Branch | Your slice | Files you own |
|---|---|---|---|
| Zen Castaneda | `zen` | Google Maps: real address autocomplete, map of the pickup spot on each trip. Also owns the UI: one styling pass across all screens so the app looks like the proposal deck and works on a phone | `client/src/components/PlaceInput.jsx`, new `client/src/components/PickupMap.jsx`, `client/src/styles.css` |
| Joshua In | `joshua` | Database on Supabase + putting the app online (Render + Vercel) | `server/src/db/store.js`, `server/src/db/schema.sql`, hosting dashboards |
| Aaron Chu | `aaron` | Sign-in emails via Resend, "resend code" button with a countdown | `server/src/lib/email.js`, `client/src/pages/SignIn.jsx` |
| Azra Bano | `azra` | Trip detail page, "my trips" page, cancel a trip you posted | new `client/src/pages/TripDetail.jsx`, new `client/src/pages/MyTrips.jsx`, `server/src/routes/trips.js` |
| Chris Savage | `chris` | Profile page (name + Venmo handle), filter trips by campus and day, seed data for the demo | new `client/src/pages/Profile.jsx`, `client/src/pages/Trips.jsx`, new `server/src/db/seed.js` |
| Anthony Morales | `anthony` | Driver application form + admin approve/reject, Cucumber acceptance tests | new `server/src/routes/drivers.js`, new `client/src/pages/DriverApply.jsx`, `server/features/` |
| Abuchi Okpara | `abuchi` | Matching rules: the function that finds trips leaving the same spot within 15 minutes, with tests | new `server/src/lib/matching.js`, new `server/spec/matchingSpec.js`, `docs/MATCHING.md` |

Each slice is about the same size: one or two screens or routes, plus a test. Exact steps and "done when" checks are in `docs/TEAM_PLAN.md`.

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

**Before the midterm (Nov 4 freeze)**
- [ ] Real address search with Google Maps, and a map of the pickup spot (Zen)
- [ ] UI pass: proposal-deck look, phone layout, empty and loading states (Zen)
- [ ] Real database on Supabase so data doesn't disappear (Joshua)
- [ ] Put the app on the internet at a public link (Joshua)
- [ ] Real sign-in emails instead of the console, resend button, countdown (Aaron)
- [x] Trip detail page, my trips page, cancel a trip (Azra)
- [x] Request a seat, no double-booking the last seat (Azra)
- [x] Give up your seat (Azra)
- [x] Emergency button: hold 2s, 5s to cancel, opens 911, alerts your emergency contact with location, RUPD resources (Azra)
- [ ] Profile page, trip filters, fake accounts and trips for the demo (Chris)
- [ ] Driver application and admin approval, Cucumber tests (Anthony)
- [ ] Matching rules spec and a tested matching function (Abuchi)
- [ ] Every user story as a GitHub issue (Anthony)
- [ ] Demo script and backup video (Chris)
- [ ] Slide deck with architecture and data model diagrams (Azra assembles, everyone fills their section)
- [ ] Register our presentation timeslot (Abuchi, today)

**After the midterm (Nov 9 to Dec 6)**
- [ ] Shared Uber groups of up to 4 when no driver matches
- [ ] Fare split screen showing what each person owes
- [ ] Live updates when a group fills or someone drops (Socket.IO)
- [ ] Leave a group, strikes for late cancels
- [ ] Emergency alert by real SMS (needs Twilio or similar), verify RUPD numbers with the department
- [ ] Message your group, report or block a user
- [ ] Test with real students and fix what breaks
- [ ] Final demo: one full pooled ride, live

## What's here (midterm scope, Oct 26 to Nov 8)

- **Sign in with a Rutgers email.** Six-digit one-time code, 10-minute expiry, locks after 5 wrong tries, non-Rutgers emails rejected.
- **Post a trip.** Pickup, destination, departure time, open seats, optional price per seat. Validated server-side (different endpoints, 10 minutes to 2 weeks out, 1 to 7 seats).
- **Trip list, trip detail, my trips.** Request a seat (exactly one rider can win the last seat), give it up, cancel a trip you posted.
- **Safety.** On every trip you're on: 911 and RUPD one tap away, and an emergency button that you hold for 2 seconds, with 5 seconds to cancel, which sends your live location and trip details to your emergency contact and opens the dialer with 911.
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

40 Jasmine specs: pure rules (`server/spec/*Spec.js`), the last-seat race, and end-to-end API tests that start the real server on a random port (`server/spec/apiSpec.js`).

## Turning on the real services

Each is one variable in `.env`. See `.env.example`.

| Service | Variable | What it unlocks | Who owns it |
|---|---|---|---|
| Supabase (Postgres) | `DATABASE_URL` | Persistent data. Run `npm run db:schema` once to create tables. | Joshua (also deploys) |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM` | Real sign-in emails instead of console output | Aaron |
| Google Maps | `VITE_GOOGLE_MAPS_KEY` | Address autocomplete and the pickup map | Zen |

## Layout

```
server/   Express API. src/app.js (routes wired up), src/routes (auth, trips, safety, pickup-spots), src/lib (pure logic, tested), src/db (schema.sql + store), spec/ (tests)
client/   React + Vite. src/pages (SignIn, PostTrip, Trips), src/components/PlaceInput.jsx
docs/     TEAM_PLAN.md (who does what through the midterm), design notes
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
| POST | `/safety/alert` | `{ tripId?, location? }` | Sends trip + location to the user's emergency contact |

## How we work

- Work on your own branch (`zen`, `joshua`, `aaron`, `azra`, `chris`, `anthony`, `abuchi`). Open a PR, one teammate reviews, merge to `main`.
- Never commit `.env`. Keys go in `.env` locally and in the hosting dashboard for production.
- Every user story is a GitHub issue using the "User story" template. Link PRs to their issue.
- Pure logic goes in `server/src/lib` with a Jasmine spec next to it in `server/spec`. Routes stay thin.
- `npm test` must pass before you open a PR.
