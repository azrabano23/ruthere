/**
 * Rutgers Ridesharing App
 * Final Demo Seed Data
 *
 * Features:
 * - 5 sample student profiles
 * - 12 sample rides
 * - All 5 Rutgers-New Brunswick campuses
 * - Future departure dates
 * - Available seats and pricing
 * - Pickup map coordinates
 * - Demo data identification
 *
 * All information is fictional and intended
 * exclusively for demonstration purposes.
 */

// ------------------------------------------
// SAMPLE STUDENT PROFILES
// ------------------------------------------

export const demoUsers = [
  {
    id: 'demo-user-1',
    name: 'Alex Johnson',
    venmo: 'alex-rides-demo',
    campus: 'College Avenue',
  },
  {
    id: 'demo-user-2',
    name: 'Jordan Smith',
    venmo: 'jordan-rides-demo',
    campus: 'Busch',
  },
  {
    id: 'demo-user-3',
    name: 'Taylor Williams',
    venmo: 'taylor-rides-demo',
    campus: 'Livingston',
  },
  {
    id: 'demo-user-4',
    name: 'Morgan Davis',
    venmo: 'morgan-rides-demo',
    campus: 'Cook',
  },
  {
    id: 'demo-user-5',
    name: 'Casey Brown',
    venmo: 'casey-rides-demo',
    campus: 'Douglass',
  },
];

// ------------------------------------------
// RUTGERS CAMPUS LOCATIONS
// ------------------------------------------

export const demoLocations = {
  collegeAve: {
    label: 'College Avenue Student Center',
    campus: 'College Avenue',
    lat: 40.5035,
    lng: -74.4524,
  },

  busch: {
    label: 'Busch Student Center',
    campus: 'Busch',
    lat: 40.5235,
    lng: -74.4582,
  },

  livingston: {
    label: 'Livingston Student Center',
    campus: 'Livingston',
    lat: 40.5231,
    lng: -74.4366,
  },

  cook: {
    label: 'Cook Student Center',
    campus: 'Cook',
    lat: 40.4807,
    lng: -74.4365,
  },

  douglass: {
    label: 'Douglass Student Center',
    campus: 'Douglass',
    lat: 40.4843,
    lng: -74.4353,
  },
};

// ------------------------------------------
// DATE GENERATOR
// ------------------------------------------

// Generate departure dates relative to today.
// This ensures trips remain in the future
// whenever the demo is presented.

function futureDate(daysAhead, hour, minute = 0) {
  const date = new Date();

  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, minute, 0, 0);

  return date.toISOString();
}

// ------------------------------------------
// TRIP GENERATOR
// ------------------------------------------

function createTrip({
  id,
  driver,
  origin,
  destination,
  daysAhead,
  hour,
  minute = 0,
  seats,
  price,
  notes,
}) {
  return {
    id,
    driverId: driver.id,
    driverName: driver.name,
    driverVenmo: driver.venmo,

    origin,
    destination,

    departsAt: futureDate(
      daysAhead,
      hour,
      minute
    ),

    seats,
    pricePerSeatCents: Math.round(price * 100),

    notes,
    isDemo: true,
  };
}

// ------------------------------------------
// GENERATE DEMO TRIPS
// ------------------------------------------

export function generateDemoTrips() {
  const [alex, jordan, taylor, morgan, casey] =
    demoUsers;

  const {
    collegeAve,
    busch,
    livingston,
    cook,
    douglass,
  } = demoLocations;

  const trips = [
    {
      id: 'demo-trip-1',
      driver: alex,
      origin: collegeAve,
      destination: livingston,
      daysAhead: 1,
      hour: 9,
      minute: 30,
      seats: 3,
      price: 4,
      notes: 'Heading to Livingston for class.',
    },
    {
      id: 'demo-trip-2',
      driver: jordan,
      origin: busch,
      destination: collegeAve,
      daysAhead: 1,
      hour: 11,
      seats: 2,
      price: 5,
      notes: 'Quick ride to College Ave.',
    },
    {
      id: 'demo-trip-3',
      driver: taylor,
      origin: livingston,
      destination: busch,
      daysAhead: 1,
      hour: 14,
      minute: 15,
      seats: 3,
      price: 3,
      notes: 'Leaving after my afternoon lecture.',
    },
    {
      id: 'demo-trip-4',
      driver: morgan,
      origin: cook,
      destination: douglass,
      daysAhead: 2,
      hour: 8,
      minute: 45,
      seats: 4,
      price: 2,
      notes: 'Morning campus ride.',
    },
    {
      id: 'demo-trip-5',
      driver: casey,
      origin: douglass,
      destination: collegeAve,
      daysAhead: 2,
      hour: 12,
      minute: 30,
      seats: 2,
      price: 4,
      notes: 'Heading toward the Yard.',
    },
    {
      id: 'demo-trip-6',
      driver: alex,
      origin: collegeAve,
      destination: busch,
      daysAhead: 2,
      hour: 16,
      seats: 3,
      price: 5,
      notes: 'Room for three passengers.',
    },
    {
      id: 'demo-trip-7',
      driver: jordan,
      origin: busch,
      destination: livingston,
      daysAhead: 3,
      hour: 10,
      seats: 2,
      price: 3,
      notes: 'Going to Livingston Plaza.',
    },
    {
      id: 'demo-trip-8',
      driver: taylor,
      origin: livingston,
      destination: douglass,
      daysAhead: 3,
      hour: 13,
      minute: 45,
      seats: 3,
      price: 5,
      notes: 'Afternoon ride available.',
    },
    {
      id: 'demo-trip-9',
      driver: morgan,
      origin: cook,
      destination: collegeAve,
      daysAhead: 4,
      hour: 9,
      minute: 15,
      seats: 4,
      price: 4,
      notes: 'Heading downtown.',
    },
    {
      id: 'demo-trip-10',
      driver: casey,
      origin: douglass,
      destination: busch,
      daysAhead: 4,
      hour: 17,
      minute: 30,
      seats: 2,
      price: 6,
      notes: 'Evening ride after class.',
    },
    {
      id: 'demo-trip-11',
      driver: alex,
      origin: collegeAve,
      destination: cook,
      daysAhead: 5,
      hour: 11,
      minute: 30,
      seats: 3,
      price: 4,
      notes: 'Pickup outside the student center.',
    },
    {
      id: 'demo-trip-12',
      driver: jordan,
      origin: busch,
      destination: douglass,
      daysAhead: 6,
      hour: 15,
      seats: 2,
      price: 5,
      notes: 'Flexible pickup time.',
    },
  ];

  return trips.map(createTrip).sort(
    (a, b) =>
      new Date(a.departsAt) - new Date(b.departsAt)
  );
}

// ------------------------------------------
// DEMO DATA HELPERS
// ------------------------------------------

// Find a demo student by their ID.
export function getDemoUser(userId) {
  return demoUsers.find(
    (user) => user.id === userId
  ) || null;
}

// Find a demo trip by its ID.
export function getDemoTrip(tripId) {
  return generateDemoTrips().find(
    (trip) => trip.id === tripId
  ) || null;
}

// Get all trips associated with a campus.
export function getDemoTripsByCampus(campus) {
  return generateDemoTrips().filter(
    (trip) =>
      trip.origin.campus === campus ||
      trip.destination.campus === campus
  );
}

// Get all trips departing on a selected date.
// Date must be formatted as YYYY-MM-DD.
export function getDemoTripsByDate(selectedDate) {
  return generateDemoTrips().filter((trip) => {
    const date = new Date(trip.departsAt);

    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');
    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}` === selectedDate;
  });
}

// Get a summary of the demo dataset.
export function getDemoStats() {
  const trips = generateDemoTrips();

  return {
    totalTrips: trips.length,
    totalUsers: demoUsers.length,
    totalAvailableSeats: trips.reduce(
      (sum, trip) => sum + trip.seats,
      0
    ),
    campuses: [
      'College Avenue',
      'Busch',
      'Livingston',
      'Cook',
      'Douglass',
    ],
  };
}
