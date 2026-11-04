import { validateApplication, cleanApplication, isAdmin, adminEmails } from '../src/lib/drivers.js';
import { createStore } from '../src/db/store.js';

describe('driver application rules', () => {
  const good = { carMakeModel: 'Honda Civic', carColor: 'blue', licensePlate: 'abc 123', seatsAvailable: 3 };
  it('accepts a valid application and normalizes the plate', () => {
    expect(validateApplication(good)).toEqual([]);
    expect(cleanApplication(good).licensePlate).toBe('ABC 123');
  });
  it('rejects missing or silly values', () => {
    expect(validateApplication({ ...good, carMakeModel: '' })).toContain('Enter your car make and model');
    expect(validateApplication({ ...good, licensePlate: '!!!' })).toContain('Enter a valid license plate');
    expect(validateApplication({ ...good, seatsAvailable: 9 }).length).toBe(1);
  });
  it('only treats listed emails as admins', () => {
    const admins = adminEmails('Azra@scarletmail.rutgers.edu, abuchi@rutgers.edu');
    expect(isAdmin({ email: 'azra@scarletmail.rutgers.edu' }, admins)).toBeTrue();
    expect(isAdmin({ email: 'someone@rutgers.edu' }, admins)).toBeFalse();
  });
});

describe('driver approval in the store', () => {
  it('approves once and marks the user as a driver', async () => {
    delete process.env.DATABASE_URL;
    const store = await createStore();
    const student = await store.users.create({ email: 'driver@rutgers.edu' });
    const admin = await store.users.create({ email: 'admin@rutgers.edu' });
    const app = await store.driverApplications.create(student.id, { carMakeModel: 'Honda Civic', carColor: 'blue', licensePlate: 'ABC 123', seatsAvailable: 3 });
    await expectAsync(store.driverApplications.create(student.id, { carMakeModel: 'x', carColor: 'y', licensePlate: 'Z', seatsAvailable: 1 })).toBeRejected();
    const reviewed = await store.driverApplications.review(app.id, { status: 'approved', reviewerId: admin.id });
    expect(reviewed.status).toBe('approved');
    expect((await store.users.findById(student.id)).isDriverApproved).toBeTrue();
    expect(await store.driverApplications.review(app.id, { status: 'rejected', reviewerId: admin.id })).toBeNull(); // already reviewed
  });
});
