# RUThere midterm Q&A bank

Prepared by Abuchi Okpara for Group 10. Answers describe what is implemented now versus planned functionality; do not present planned features as already live.

### 1. What problem does RUThere solve? — Abuchi (close/Q&A)
Rutgers students often have overlapping trips but pay for separate rides or rely on crowded campus transportation. RUThere lets a student post a trip with a pickup, destination, departure time, and number of seats. The longer-term idea is to match students going the same way and allow cost-sharing; that feature is being developed in phases.

### 2. How does the matching algorithm decide two trips are compatible? — Abuchi
The matching logic checks a pickup distance of no more than 200 meters, a departure difference of no more than 15 minutes, and a destination distance of no more than 400 meters. It excludes past trips, full trips when availability data is supplied, and the requester's own trip. Results are ranked with the closest departure times first.

### 3. Why use coordinates instead of comparing campus names? — Abuchi
A campus name is not precise enough: two stops may have similar labels but still be inconveniently far apart. We use latitude and longitude and calculate the Haversine straight-line distance. It is fast to test without external services; future routing can improve the estimated real-world walking time.

### 4. What if two users try to reserve the last seat? — Azra (reservations)
The server's seat-reservation logic is separate from matching. With PostgreSQL, a transaction locks the relevant trip row and checks availability before insertion. It also enforces one reservation per rider per trip. This prevents two people from successfully claiming the same last seat during a race; our matching function only suggests candidates.

### 5. How does sign-in keep the app limited to Rutgers students? — Aaron (auth)
RUThere checks for an allowed Rutgers email and verifies a one-time sign-in code. The code expires and repeated bad guesses are limited. This avoids keeping student-created passwords, although Rutgers-only email verification is not the same thing as a university-managed identity service.

### 6. How is the system organized technically? — Joshua (architecture)
The React client displays pages and collects trip information, while a Node.js and Express API implements the application rules and endpoints. The data layer supports PostgreSQL via Supabase and an in-memory fallback for local development. The matching engine is a pure JavaScript module so its behavior can be tested independently of the database or UI.

### 7. How did you test the project? — Abuchi (matching), Anthony (acceptance), Azra (API)
We use Jasmine for focused rules and API tests, and Cucumber for acceptance scenarios. The matching module has deterministic tests for time boundaries, geographic distances, full trips, self-matching, and shared-Uber limits. The team runs `npm test` before opening pull requests; wider acceptance testing checks user-facing behavior.

### 8. What is the hardest technical challenge? — Azra (backend), Joshua (database)
Making seat reservations safe under simultaneous requests is a key challenge. Showing a trip as available is not enough because another person could join at the same moment. We handle that at the database transaction level rather than trusting a front-end seat count or the match ranking.

### 9. What can the current demo do, and what remains? — Chris (demo), Abuchi (close)
The current midterm scope includes Rutgers email sign-in, trip posting and browsing, trip details, and requesting or giving up seats. The matching algorithm and its tests are a separate contribution; displaying automated matches and creating shared-Uber groups in the live interface require further integration. Fare splitting and live group updates are later-phase milestones.

### 10. How would you improve matching after the midterm? — Abuchi
We would calculate actual walking or travel times rather than only straight-line distances, connect matching to a dedicated API and front-end search, and include up-to-date seat counts before recommendations. For shared Ubers, we would persist groups of at most four students, then show an accurate fare split and update the group as people join or leave.
