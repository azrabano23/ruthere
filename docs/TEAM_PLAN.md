# RUThere team tasks

Repo: github.com/azrabano23/ruthere. Read the README, run `npm install && npm run dev`, then do your tasks on your own branch and open a pull request into `main`. Short plain commit messages. Code freeze Nov 4. Midterm Nov 6 or 9.

## Zen Castaneda (branch `zen`)
1. Google Cloud project, enable Maps JavaScript API + Places API, browser key restricted to localhost:5173 and our deployed domain, daily quota cap. Put it in `.env` as `VITE_GOOGLE_MAPS_KEY`.
2. Confirm `client/src/components/PlaceInput.jsx` switches to real autocomplete. Fix what breaks.
3. New `client/src/components/PickupMap.jsx`: small map of the pickup spot on each trip card and on the trip detail page. Shows nothing when no key.
4. Slides: opening hook (0:00–1:00). Scene first, then $24 vs $6, one car instead of four.
5. Give Joshua the key privately for production. Never commit it.

## Joshua In (branch `joshua`)
1. Free Supabase project. Connection string in `.env` as `DATABASE_URL`. Run `npm run db:schema`. `/health` must say `"store":"postgres"`.
2. Run the whole flow against Postgres and fix bugs in `server/src/db/store.js` (`pgStore`).
3. Deploy API to Render (root `server`, start `npm start`) and client to Vercel (root `client`, build `npm run build`, output `dist`). Set `CLIENT_ORIGIN` and `VITE_API_URL`. Cookies must work across the two origins.
4. Collect keys from Zen and Aaron, set them in the hosting dashboards. Share the public URL by Nov 1.
5. Slides: overview and objectives (1:00–2:00).

## Aaron Chu (branch `aaron`)
1. Free Resend account, `RESEND_API_KEY` and `EMAIL_FROM` in `.env`. A real code must arrive at a scarletmail address via `server/src/lib/email.js`.
2. In `client/src/pages/SignIn.jsx`: 10-minute countdown on the code step and a "Resend code" button.
3. Jasmine spec for any helper you write.
4. Slides: progress vs. timeline (2:00–3:15). Collect everyone's status on Nov 2.
5. Timekeeper at rehearsals.

## Azra Bano (branch `azra`)
1. ~~`GET /trips/mine`, `DELETE /trips/:id` (poster only), store methods in both stores.~~ Done.
2. ~~Trip detail page with a working "Request a seat" button.~~ Done.
3. ~~My trips page with Cancel.~~ Done.
4. ~~Seat reservation that cannot double-book the last seat, with a race test.~~ Done.
5. ~~Give up your seat.~~ Done.
6. ~~Safety (professor's ask): emergency button per use case 7, 911 and RUPD resources, emergency contact on the account, alert with live location.~~ Done. Follow-up: real SMS delivery (Twilio) and confirm the RUPD numbers with the department.
7. Presentation draft 1 in Drive by Nov 2: full deck skeleton in the proposal's style, one section per speaker with time budget, architecture diagram, data model diagram, technical slides (3:15–5:15) filled in, one safety slide. Everyone drops their slides into it.
8. Repo owner: review and merge PRs.

## Chris Savage (branch `chris`)
1. `client/src/pages/Profile.jsx` at `/profile`: edit display name and Venmo/Zelle handle (`PATCH /auth/me`).
2. Filters on `client/src/pages/Trips.jsx`: by pickup campus and by day.
3. `server/src/db/seed.js` with 3–4 test accounts and 5–6 realistic trips, `npm run seed` in root `package.json`, works on memory and Postgres.
4. `docs/DEMO_SCRIPT.md`: exact clicks, timed to 75 seconds. Backup screen recording on Nov 4.
5. Slides: live demo (5:15–6:30).

## Anthony Morales (branch `anthony`)
1. `driver_applications` table in `server/src/db/schema.sql` and store methods in both stores.
2. `server/src/routes/drivers.js`: `POST /drivers/apply`, `GET /drivers/me`, `POST /drivers/:id/approve` and `/reject` (admin = emails in `ADMIN_EMAILS`). Approve sets `users.is_driver_approved`.
3. `client/src/pages/DriverApply.jsx` at `/drive`.
4. Cucumber.js in `server/`, `npm run test:acceptance`, two scenarios: non-Rutgers email rejected, $24 split four ways is $6.
5. One GitHub issue per user story from the proposal (15 total) with Given/When/Then and an owner.
6. Slides: challenges and remaining work (6:30–8:15).

## Abuchi Okpara (branch `abuchi`)
1. Register our timeslot on page 6 of the course Google Doc today.
2. `docs/MATCHING.md`: precise matching rules (same pickup spot or within N meters, departure within 15 minutes, destinations within a few minutes, max 4 in a shared Uber, never more riders than seats).
3. `server/src/lib/matching.js` with `findMatches(request, trips, now)` and `server/spec/matchingSpec.js` with at least six cases.
4. `docs/QA_BANK.md`: ten likely questions, one-paragraph answers, who answers.
5. Slides: close (8:15–9:15) and run Q&A.
