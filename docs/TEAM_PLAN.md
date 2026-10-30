# RUThere Midterm Plan

Group 10, 14:332:452 Software Engineering. Midterm presentation: **Nov 6 or Nov 9**, 10 minutes, five criteria at 20 points each (opening, flow, close, technical depth, delivery).

This document is written so that each person, or an AI agent working for them, can pick up their section with no other context. Repo: `github.com/azrabano23/ruthere`. Read the README first, run `npm install && npm run dev`, confirm the app works locally, then start your tasks.

## 1. Where we are

- Proposal done Oct 9. Design phase (Oct 12 to 25) produced the data model, matching rules and screens on paper.
- Code scaffold created Oct 29: sign-in with Rutgers email code, trip posting with validation, trip list, campus-spot address picker, Postgres schema, 13 passing Jasmine tests. It runs with zero API keys.
- Midterm promise from our report: sign-up and trip posting with address search. That is what we demo.
- Matching and fare split are the Nov 9 to 22 phase. We show the design, not a fake demo.

## 2. Key dates

| Date | Milestone |
|---|---|
| Oct 29 | Repo up, timeslot registered, everyone has run the app locally |
| Nov 1 | All services live (Supabase, Resend, Google Maps); app deployed to a public URL |
| Nov 2 | Content lock: every slide in the shared deck, demo script written |
| Nov 3 | First timed run-through, cut to 9:15 |
| Nov 4 | Demo freeze, backup recording done, no more merges to main before the talk |
| Nov 5 | Dress rehearsal, no notes |
| Nov 6 or 9 | Present |

## 3. Run of show (10 minutes)

| Time | Segment | Speaker |
|---|---|---|
| 0:00–1:00 | Hook: 9:40 AM at CASC, exam on Busch, $24 vs $6 | Zen |
| 1:00–2:00 | What RUThere is, two modes, three objectives | Joshua |
| 2:00–3:15 | Progress vs. the timeline, honest status | Aaron |
| 3:15–5:15 | Technical implementation: architecture, data model, how sign-in and posting work | Azra |
| 5:15–6:30 | Live demo | Chris |
| 6:30–8:15 | Challenges and remaining work | Anthony |
| 8:15–9:15 | Close: three takeaways, "Four students. One car. A quarter of the fare." | Abuchi |
| 9:15–10:00 | Q&A buffer, Abuchi directs, Azra and Chris answer technical | all |

Every speaker writes one hand-off sentence to the next speaker. That is most of the "organized flow" score.

## 4. Work split

Each person has one slice of code (one or two screens or routes plus a test), one presentation task, and one team job. Code slices are sized for roughly 4 to 6 hours each between now and Nov 4, so the commit history shows even work. Each build task lists the files to touch and a "done when" check so an agent can execute it.

---

### Zen Castaneda

**Build: Google Maps.** Branch `zen`.
1. Create a Google Cloud project, enable Maps JavaScript API and Places API, create a browser key restricted to our deployed domain and `localhost:5173`. Set a daily quota cap so we stay inside the free tier.
2. Put the key in `.env` as `VITE_GOOGLE_MAPS_KEY` and confirm `client/src/components/PlaceInput.jsx` switches to real autocomplete. Fix anything broken.
3. Add a small static map of the pickup spot to each trip card in `client/src/pages/Trips.jsx` (Maps Static API or an embedded map), falling back to nothing when no key is set.
- Done when: typing "Easton Ave" in Pickup shows real suggestions, posting a trip stores real lat/lng, and each trip card shows its pickup on a map. Share the key with Joshua privately for the production deploy, never in the repo.

**Present: Opening hook (0:00–1:00), slides 1 to 2.** Open with the scene, not the title. Land $24 vs $6 and one car instead of four. First sentence memorized.

**Team job:** Reviewer for Joshua's and Abuchi's PRs.

---

### Joshua In

**Build: Database and deployment.** Branch `joshua`.
1. Create a free Supabase project, copy the Postgres connection string into `.env` as `DATABASE_URL`.
2. Run `npm run db:schema` to apply `server/src/db/schema.sql`. Start the server and confirm `/health` reports `"store":"postgres"`. Run the full flow (sign in, post trip, list trips) and fix any bugs in `server/src/db/store.js` `pgStore`.
3. Deploy the API to Render (free web service, root `server`, start `npm start`) and the client to Vercel or Netlify (root `client`, build `npm run build`, output `dist`). Set `CLIENT_ORIGIN` on the API and `VITE_API_URL` on the client. Confirm the session cookie works across the two origins (`sameSite`, `secure`, HTTPS).
4. Collect the keys from Zen (Maps) and Aaron (Resend) and set them in the hosting dashboards. Share the public URL with the team by Nov 1.
- Done when: a teammate opens the public URL on their phone, signs in with a real email, posts a trip, and it is still there the next day.

**Present: Overview and objectives (1:00–2:00), 1 slide.** Two modes in one sentence each. Three semester objectives: Rutgers-only accounts, automatic matching by route and time, a fair split everyone sees.

**Team job:** Reviewer for Aaron's and Chris's PRs.

---

### Aaron Chu

**Build: Email and sign-in polish.** Branch `aaron`.
1. Create a free Resend account, verify a sender (or use their test domain), put `RESEND_API_KEY` and `EMAIL_FROM` in `.env`. Confirm a real code arrives at a scarletmail address via `server/src/lib/email.js`.
2. In `client/src/pages/SignIn.jsx` add a 10-minute countdown on the code step and a "Resend code" button (calls `/auth/request-code` again).
3. Add a Jasmine spec for the countdown/expiry helper if you write one.
- Done when: a teammate signs in on their phone with a real email and no console access, and the resend button works after the code expires.

**Present: Progress vs. plan (2:00–3:15), 1 slide.** Reuse the proposal timeline slide with completed phases colored. Say what is done, what is half done, what is not started. Collect status from everyone on Nov 2.

**Team job:** Timekeeper at every rehearsal. Anything past 9:15 gets cut.

---

### Azra Bano

**Build: Trip detail, my trips, cancel a trip.** Branch `azra`.
1. Add `GET /trips/mine` (trips the signed-in user posted) and `DELETE /trips/:id` (poster only, 403 otherwise, 404 if missing) in `server/src/routes/trips.js`. Add `trips.listByPoster` and `trips.delete` to both stores in `server/src/db/store.js`.
2. Add `client/src/pages/TripDetail.jsx` at `/trips/:id`: route, time, seats, price, poster display name, notes, and a "Request a seat" button that shows "Coming Nov 9" for now. Link each card in `Trips.jsx` to it.
3. Add `client/src/pages/MyTrips.jsx` at `/my-trips` with a Cancel button per trip. Add the nav link in `App.jsx`.
4. Add a Jasmine spec for any pure helper you write (for example a "can this user cancel this trip" check).
- Done when: you can post a trip, open it, see it under My trips, cancel it, and it disappears from the list. Someone else cannot cancel your trip.

**Present: Technical implementation (3:15–5:15), 2 to 3 slides.** Architecture diagram, data model diagram, one "how it works" slide (email code sign-in, trip posting with address search, the seat_reservations unique constraint). Technical Q&A with Chris.

**Team job:** Repo owner, merges to main, deck owner. Create the shared deck in Drive now with a placeholder section per speaker; from Nov 2 assemble everyone's slides and write the transitions.

---


### Chris Savage

**Build: Profile page, trip filters, demo data.** Branch `chris`.
1. Add `client/src/pages/Profile.jsx` at `/profile` to edit display name and Venmo/Zelle handle (`PATCH /auth/me` already exists). Nav link in `App.jsx`.
2. In `client/src/pages/Trips.jsx` add filters: by pickup campus and by day (today, tomorrow, this week). Filtering can be client-side for now.
3. Write `server/src/db/seed.js` that creates 3 to 4 test accounts and 5 to 6 realistic upcoming trips (CASC to Busch, Hill Center to train station, Livingston to Cook). Add `npm run seed` to the root `package.json`. It must work against both the memory store and Postgres.
4. Write `docs/DEMO_SCRIPT.md`: the exact clicks in order, the exact email and trip to use, timed to 75 seconds. On Nov 4 record the backup screen capture on the deployed site.
- Done when: filters work, a profile edit sticks after refresh, `npm run seed` fills the list, and the demo runs from the script in under 75 seconds twice in a row.

**Present: Live demo (5:15–6:30).** Sign up with a Rutgers email, enter the code, post a trip with real autocomplete, show it in the list, open its detail page. Backup video ready to play.

**Team job:** Technical Q&A alongside Azra.

---


### Anthony Morales

**Build: Driver application and approval, acceptance tests.** Branch `anthony`.
1. Add a `driver_applications` table to `server/src/db/schema.sql` (user_id, make, model, color, plate, seats, status pending/approved/rejected, created_at) and matching store methods in `server/src/db/store.js` (both stores).
2. Add `server/src/routes/drivers.js`: `POST /drivers/apply` (signed-in user submits car details, confirms license and insurance), `GET /drivers/me` (my application status), `POST /drivers/:id/approve` and `/reject` (admin only; for now admin = emails listed in an `ADMIN_EMAILS` env var). Approving sets `users.is_driver_approved`.
3. Add `client/src/pages/DriverApply.jsx` at `/drive` with the form and the current status.
4. Set up Cucumber.js in `server/` with `npm run test:acceptance` and two scenarios: "non-Rutgers email is rejected" and "$24 split four ways is $6 each" (backed by `splitFareCents`).
5. Create one GitHub issue per user story from the proposal (10 must, 4 should, 1 nice) with the "User story" template, each with a Given/When/Then and an owner.
- Done when: a student can apply, an admin can approve them, `/auth/me` then shows `isDriverApproved: true`, and `npm run test:acceptance` passes.

**Present: Challenges and remaining work (6:30–8:15), 2 slides.** Each challenge with its mitigation: last-seat race condition, Google Maps free tier, NJ rules on paid rides, cross-origin cookies, seven-person coordination. Remaining plan Nov 9 to Dec 6.

**Team job:** Issues board hygiene, every PR links an issue.

---


### Abuchi Okpara

**Build: Matching design and stub.** Branch `abuchi`.
1. Write `docs/MATCHING.md`: the rules from the report as a precise spec. Same pickup area (define "area": same campus spot, or within N meters), departure within 15 minutes, destinations within a few minutes of each other (define it in meters or travel time), max 4 riders in a shared Uber, never more riders than seats for a driver trip, shared-Uber option offered whenever no driver trip matches.
2. Implement `server/src/lib/matching.js` with a pure function `findMatches(request, trips, now)` that applies those rules, plus `server/spec/matchingSpec.js` with at least six cases (matches, 16 minutes apart fails, far destination fails, full trip excluded, etc.). No routes yet, that is Nov 9.
3. Write `docs/QA_BANK.md`: ten likely questions from the professor and classmates with a one-paragraph answer and who answers each.
- Done when: `npm test` includes the matching specs and they pass, and the Q&A bank is in the shared Drive.

**Present: Close and Q&A (8:15–10:00), 1 slide.** Three takeaways, the closing line, then direct questions to the right person.

**Team job:** Register our timeslot on page 6 of the course Google Doc **today, Oct 29**. First-come first-served. Prefer Nov 6 if Chris confirms the demo is ready by Nov 4, otherwise Nov 9.

---

## 5. Rules for everyone (and your agents)

- Work on your own branch (`zen`, `joshua`, `aaron`, `azra`, `chris`, `anthony`, `abuchi`), PR into `main`, one review, squash merge. `npm test` green before you open the PR. Short plain commit messages.
- Never commit `.env` or any key. Keys are shared with Joshua privately and live in the hosting dashboards.
- Keep routes thin. Logic that can be tested without a server goes in `server/src/lib` with a spec.
- If you finish early, pick the next unassigned issue from the board. If you are stuck for more than an hour, post in the group chat with what you tried.
- No merges to `main` after the Nov 4 freeze until after we present.

## 6. Rubric map

| Criterion (20 each) | Who carries it |
|---|---|
| Compelling opening | Zen |
| Organized flow | Joshua, Aaron, everyone's hand-off sentences |
| Concise, memorable close | Abuchi |
| Technical depth | Azra's diagrams, Chris, Anthony, Joshua's deploy, Abuchi's matching spec |
| Audience-centric delivery | Everyone: no reading from slides, eye contact, Aaron keeps us on time |
