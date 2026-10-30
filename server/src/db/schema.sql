-- RUThere schema (midterm scope + the tables matching will need)
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  payment_handle text,
  is_driver_approved boolean not null default false,
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
