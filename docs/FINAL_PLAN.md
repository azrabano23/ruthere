# RUThere final phase: who builds what

Nov 25 to Dec 6. This picks up from `docs/TEAM_PLAN.md`, which covered everything up to the midterm. The work comes from the "Next Steps" section of our midterm report and the use cases that are not finished yet.

Same rules as the midterm. Everyone owns one slice, builds it on their own branch, opens a pull request into `main`, and gets one teammate to review it. Short plain commit messages. `npm test` must pass before you open a PR. Pure logic goes in `server/src/lib` with a Jasmine spec, routes stay thin, and every store method goes in both the memory store and the Postgres store.

The final presentation and report are handled separately and are not part of this plan.

## Everything stays free

No piece may need a paid service. If you find something that costs money, ask the group before you sign up.

| Need | Free choice | Limit to know about |
|---|---|---|
| Hosting | Vercel (site) and Render (API), free plans | Render's free server sleeps after 15 minutes idle and takes about a minute to wake |
| Database | Supabase free plan | Pauses after a week with no traffic |
| Email | Brevo free plan | 300 emails a day, shared by sign-in codes and safety alerts |
| Maps | Google Maps, Places and the embedded map | About 10,000 free calls a month per service. Keep the daily quota cap on so nothing can be charged |
| Live updates | Socket.IO (free library) on Render | The Vercel proxy does not carry websockets |
| Payments | Venmo payment links | No Venmo API, no money passes through us |
| Texts | The rider's own phone (`sms:` link) | Not automatic, the rider taps Send |
| Google sign-in | Google Identity Services | Rutgers may block outside apps on ScarletMail accounts, so test that first |
| Tests | Jasmine, Vitest, Cucumber.js, GitHub Actions | |

## Dates

- **Nov 27:** Joshua shares the groups table layout (task 2.1). Abuchi, Zen, Azra and Anthony build on it.
- **Nov 27:** Zen and Anthony agree on how a paid seat is stored (tasks 3.4 and 7.4).
- **Nov 27:** Chris confirms whether Google sign-in works with a ScarletMail account (task 6.1).
- **Dec 2:** Every slice merged into `main`, so the pilot runs on the finished app.
- **Dec 2 to Dec 6:** Pilot with real students. Fix what breaks.
- **Dec 6:** 50 real users. The final demo shows one full pooled ride: post, match, lock, ride, split.

## 1. Abuchi Okpara (branch `abuchi`): ride search and automatic matching

Use case 4. Connects the matching function you wrote to a screen.

1. `GET /trips/search?originLat&originLng&destLat&destLng&departsAt` in `server/src/routes/trips.js`. It loads upcoming trips and runs `findMatches` from `server/src/lib/matching.js`.
2. New `client/src/pages/FindRide.jsx` at `/find`: pickup, destination (both with `PlaceInput`) and a departure time.
3. Results show the driver's name, seats left and price per seat, closest departure first, with a link to the trip page to request a seat.
4. When nothing matches, show "No driver is going your way. Share an Uber instead", which opens Joshua's group flow with the same pickup, destination and time.
5. Hide blocked users' trips once Aaron's block list exists (task 5.3).
6. Tests: API spec for the search route and a Vitest spec for the results and the empty state.

Done when four seeded trips and one search return the right matches in the right order, and an empty search offers a shared Uber.

## 2. Joshua In (branch `joshua`): shared Uber groups

Use case 5. The biggest slice, and others depend on it.

1. **By Nov 27:** `groups` and `group_members` tables in `server/src/db/schema.sql`, with pickup, destination, departure time, meeting spot, status (open, locked, done, cancelled) and booker. Post the layout in the group chat.
2. Store methods in both stores: create a group, join, leave, lock, list open groups near a route and time.
3. Joining uses the same row lock as seat booking (`server/src/db/store.js`) so a group can never pass 4 people, even with many people joining at once.
4. Routes: `POST /groups`, `GET /groups/search`, `POST /groups/:id/join`, `DELETE /groups/:id/join`, `POST /groups/:id/lock`, `GET /groups/:id`. A group should match with the same 15-minute and distance rules as `findMatches`.
5. New `client/src/pages/Group.jsx`: members, meeting spot on `PickupMap`, "I'll book the Uber" button, Lock button.
6. Leaving before the group locks reopens the spot.
7. Tests: a race spec like the last-seat one (many people joining a group with one spot left, exactly one gets in), plus API specs.

Done when four students can find or start a group, it locks at four, and a fifth is refused.

## 3. Zen Castaneda (branch `zen`): fare split and payments

Use cases 3, 4 and 5.

1. The group's booker enters the total Uber fare on the group page. Store it in cents.
2. Every member sees their share using `splitFareCents` from `server/src/lib/trips.js`, plus the booker's payment handle.
3. A "Pay with Venmo" link: `https://venmo.com/<handle>?txn=pay&amount=<dollars>&note=RUThere`. Zelle handles are shown to copy, since Zelle has no payment link.
4. **By Nov 27, with Anthony:** how a paid seat is stored. Riders mark "I paid", the booker or driver marks "Received". Same for student-driver seats.
5. Suggested price per seat on `PostTrip.jsx`, worked out from the straight-line distance between pickup and destination in our own code (no paid Google distance service). Admins set the most a seat can cost (`MAX_SEAT_PRICE_CENTS` in `.env`) and the server refuses anything above it.
6. Tests: Jasmine specs for the suggested price and the price cap, a Vitest spec for the split screen.

Done when the $24 fare shows $6.00 for each of four riders with a working Venmo link, and a driver can't post a seat above the cap.

## 4. Azra Bano (branch `azra`): live updates

Proposal requirement: group changes reach everyone within two seconds.

1. Add Socket.IO to the Express server and the client.
2. The Vercel proxy does not carry websockets, so the client connects straight to Render. The session cookie does not reach Render that way, so add `GET /auth/socket-token` (through the proxy, signed in) that returns a short-lived token the socket sends when it connects.
3. Events: group joined, group left, group locked, fare entered, trip cancelled, seat taken or given up. Each person only receives events for their own groups and trips.
4. Render's free server sleeps, so the client reconnects quietly and reloads the page data when it does.
5. When a driver cancels a trip, everyone on it gets a notice (use case 3).
6. Tests: a spec that connects two sockets and checks one sees the other's join within two seconds.

Done when two phones on the same group see each other join and leave without refreshing.

## 5. Aaron Chu (branch `aaron`): trust and safety

Use cases 6 and 7. All free, no Twilio.

1. Strikes: leaving a group or giving up a seat less than one hour before departure adds a strike. Three strikes in 30 days blocks requesting rides for 7 days. Show the count and any suspension on the profile.
2. Report a user from a trip or group, with a reason. New admin queue next to driver approvals to review reports and suspend an account.
3. Block a user from a trip or group. Blocked people never see each other's trips or groups (Abuchi and Joshua call your check).
4. Emergency alert, free version: after the 911 dialer, a "Text [contact] my location" button opens an `sms:` link with the contact's number and a message filled in (location link and trip). Test the link format on iPhone and Android.
5. Emergency contact email on the profile. When an alert fires, the server emails the contact through Brevo (`server/src/lib/email.js`) with the same message.
6. The safety panel says plainly that the rider has to tap Call and Send themselves.
7. Tests: Jasmine specs for the strike rules, block filtering and the alert email against the fake Brevo.

Done when a third late cancel suspends a test account, a blocked user's trips disappear, and an alert sends the email and opens a filled-in text.

## 6. Chris Savage (branch `chris`): Google sign-in and the pilot

1. **By Nov 27:** Google Cloud OAuth client and a test with one ScarletMail account. If Rutgers blocks outside apps, tell the group and skip to task 4.
2. "Sign in with Google" on the sign-in card, limited to `@scarletmail.rutgers.edu`. The server checks Google's ID token and sets the same session cookie as the code flow. The emailed code stays as the backup.
3. API spec for the token check, with Google's response faked.
4. Demo data: extend `client/src/data/seedData.js` with groups, a locked group with a fare, paid and unpaid seats, and a driver with earnings.
5. One GitHub issue per user story in the proposal, using the "User story" template, with Given/When/Then and the owner from this plan.
6. Pilot from Dec 2: onboard about 50 students, QR codes to `ruthere-5buf.vercel.app` at the pickup spots, a short feedback form, and a running bug list. Pass each bug to the owner of that slice.

Done when a ScarletMail Google account signs in (or the block is confirmed and written up), every user story has an issue, and the pilot has a bug list.

## 7. Anthony Morales (branch `anthony`): driver rules, earnings and acceptance tests

Use cases 2 and 3. Extends the driver code you built for the midterm.

1. Only approved drivers can post trips. `POST /trips` refuses everyone else, and `PostTrip.jsx` points them to the driver application.
2. A trip's seats can't be more than the car's seat count from the approved application.
3. License and insurance confirmation checkboxes on the driver application, stored with it.
4. **By Nov 27, with Zen:** agree how a paid seat is stored. Then add a running earnings total to `DriverDashboard.jsx` from seats marked received.
5. Cucumber.js in `server/`, `npm run test:acceptance`, one scenario per must-have requirement in the proposal. At least: non-Rutgers email rejected, unapproved student can't post, a $24 fare split four ways is $6 each, a fifth rider can't join a full group, a seat can't be priced above the cap.
6. Add `test:acceptance` to `.github/workflows/test.yml`.

Done when an unapproved account can't post, earnings add up on the dashboard, and the Cucumber suite runs in CI.
