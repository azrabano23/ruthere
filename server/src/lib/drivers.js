// Pure driver-application rules: validation and who counts as an admin. No database, so these are easy to test.

/** Admins are the emails listed in ADMIN_EMAILS (comma separated). Returns a Set of lowercase emails. */
export function adminEmails(raw = process.env.ADMIN_EMAILS ?? '') {
  return new Set(raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
}

export function isAdmin(user, admins = adminEmails()) {
  return Boolean(user?.email && admins.has(user.email.toLowerCase()));
}

/** Trims and normalizes an application body. */
export function cleanApplication(input = {}) {
  return {
    carMakeModel: String(input.carMakeModel ?? '').trim(),
    carColor: String(input.carColor ?? '').trim(),
    licensePlate: String(input.licensePlate ?? '').trim().toUpperCase(),
    seatsAvailable: Number(input.seatsAvailable),
  };
}

/** Validates an application. Returns an array of error strings (empty when valid). */
export function validateApplication(input) {
  const a = cleanApplication(input);
  const errors = [];
  if (a.carMakeModel.length < 2 || a.carMakeModel.length > 80) errors.push('Enter your car make and model');
  if (a.carColor.length < 3 || a.carColor.length > 30) errors.push('Enter your car color');
  if (!/^[A-Z0-9 -]{2,12}$/.test(a.licensePlate)) errors.push('Enter a valid license plate');
  if (!Number.isInteger(a.seatsAvailable) || a.seatsAvailable < 1 || a.seatsAvailable > 7) errors.push('Seats must be a whole number from 1 to 7');
  return errors;
}
