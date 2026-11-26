-- RUThere schema (midterm scope + the tables matching will need)
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  payment_handle text,
  is_driver_approved boolean not null default false,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz not null default now()
);

create table if not exists signin_codes (
  email text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0
);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references users(id),
  origin_label text not null, origin_lat double precision not null, origin_lng double precision not null,
  dest_label text not null,   dest_lat double precision not null,   dest_lng double precision not null,
  departs_at timestamptz not null,
  seats int not null check (seats between 1 and 7),
  price_per_seat_cents int check (price_per_seat_cents is null or price_per_seat_cents >= 0),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists trips_departs_at on trips(departs_at);

-- Seat reservations. The unique index plus a transaction-time count is what guarantees
-- two riders can never both take the last seat (matching phase, Nov 9-22).
create table if not exists seat_reservations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  rider_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique (trip_id, rider_id)
);

create table if not exists driver_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  car_make_model text not null,
  car_color text not null,
  license_plate text not null,
  seats_available int not null check (seats_available between 1 and 7),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create unique index if not exists driver_applications_one_pending_per_user
  on driver_applications(user_id) where status = 'pending';

create index if not exists driver_applications_status on driver_applications(status, created_at);

-- Trust and safety (use cases 6 and 7). "add column if not exists" so running this file again
-- on a live database adds the new columns without touching existing rows.
alter table users add column if not exists emergency_contact_email text;
alter table users add column if not exists suspended_until timestamptz;

-- One row per late cancellation (leaving less than an hour before departure).
create table if not exists strikes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  trip_id uuid references trips(id) on delete set null,
  reason text not null default 'late_cancel',
  created_at timestamptz not null default now()
);
create index if not exists strikes_user_time on strikes(user_id, created_at);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id) on delete cascade,
  reported_id uuid not null references users(id) on delete cascade,
  trip_id uuid references trips(id) on delete set null,
  reason text not null check (reason in ('unsafe', 'harassment', 'no_show', 'payment', 'other')),
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'dismissed', 'suspended')),
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reports_status on reports(status, created_at);

-- A block hides both people from each other, whichever of them made it.
create table if not exists blocks (
  blocker_id uuid not null references users(id) on delete cascade,
  blocked_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocked on blocks(blocked_id);
