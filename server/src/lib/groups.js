// Pure Shared Uber Group rules: validation, join/leave/lock/meeting-spot decisions.
// No database calls so these can be unit tested cleanly.

export const MIN_LEAD_MS = 10 * 60 * 1000;            // departure at least 10 minutes out
export const MAX_LEAD_MS = 14 * 24 * 60 * 60 * 1000;  // and at most two weeks out
export const MIN_GROUP_CAPACITY = 2;
export const MAX_GROUP_CAPACITY = 4;

/** Validates a new Shared Uber Group post. Returns an array of error strings (empty when valid). */
export function validateGroup(input, now = Date.now()) {
  const errors = [];
  const { meetingSpot, destination, departsAt, maxCapacity = MAX_GROUP_CAPACITY } = input ?? {};

  if (!meetingSpot || typeof meetingSpot !== 'string' || !meetingSpot.trim()) {
    errors.push('Meeting spot is required');
  }
  if (!destination || typeof destination !== 'string' || !destination.trim()) {
    errors.push('Destination is required');
  }
  if (
    meetingSpot &&
    destination &&
    meetingSpot.trim().toLowerCase() === destination.trim().toLowerCase()
  ) {
    errors.push('Meeting spot and destination must be different');
  }

  const t = Date.parse(departsAt);
  if (Number.isNaN(t)) {
    errors.push('Departure time is required');
  } else if (t - now < MIN_LEAD_MS) {
    errors.push('Departure must be at least 10 minutes from now');
  } else if (t - now > MAX_LEAD_MS) {
    errors.push('Departure must be within two weeks');
  }

  if (
    !Number.isInteger(maxCapacity) ||
    maxCapacity < MIN_GROUP_CAPACITY ||
    maxCapacity > MAX_GROUP_CAPACITY
  ) {
    errors.push(`Group capacity must be a whole number from ${MIN_GROUP_CAPACITY} to ${MAX_GROUP_CAPACITY}`);
  }

  return errors;
}

/**
 * Decides whether a user can join a group based on the locked DB snapshot.
 * reasons: 'not_found' | 'locked' | 'cancelled' | 'departed' | 'already_joined' | 'full'
 */
export function decideJoinGroup({ group, userId, memberIds, now = Date.now() }) {
  if (!group) return { ok: false, reason: 'not_found' };
  if (group.status === 'cancelled') return { ok: false, reason: 'cancelled' };
  if (group.status === 'locked') return { ok: false, reason: 'locked' };
  if (Date.parse(group.departureTime) <= now) return { ok: false, reason: 'departed' };
  if (memberIds.includes(userId)) return { ok: false, reason: 'already_joined' };
  if (memberIds.length >= group.maxCapacity) return { ok: false, reason: 'full' };

  const willAutoLock = memberIds.length + 1 >= group.maxCapacity;
  return { ok: true, willAutoLock };
}

/**
 * Decides the outcome when a user leaves a group.
 * Returns { ok: false, reason } or { ok: true, nextStatus, nextLeaderId }
 */
export function decideLeaveGroup({ group, userId, members }) {
  if (!group) return { ok: false, reason: 'not_found' };

  // members expected sorted by joinedAt ASC
  const leavingMember = members.find((m) => m.userId === userId);
  if (!leavingMember) return { ok: false, reason: 'not_member' };

  const remaining = members.filter((m) => m.userId !== userId);

  if (remaining.length === 0) {
    return { ok: true, nextStatus: 'cancelled', nextLeaderId: null };
  }

  const nextLeaderId =
    leavingMember.role === 'leader' ? remaining[0].userId : null;

  // Re-open if it was full/locked and now has open space
  const nextStatus =
    group.status === 'locked' && remaining.length < group.maxCapacity
      ? 'open'
      : group.status;

  return { ok: true, nextStatus, nextLeaderId };
}

/** Only the current group leader may lock an open group. */
export function decideLockGroup({ group, userId, members }) {
  if (!group) return { ok: false, reason: 'not_found' };
  const member = members.find((m) => m.userId === userId);
  if (!member || member.role !== 'leader') return { ok: false, reason: 'not_leader' };
  if (group.status !== 'open') return { ok: false, reason: 'not_open' };
  return { ok: true };
}

/** Only the current group leader may change the meeting spot while the group is still open. */
export function decideUpdateMeetingSpot({ group, userId, members, meetingSpot }) {
  if (!group) return { ok: false, reason: 'not_found' };
  const member = members.find((m) => m.userId === userId);
  if (!member || member.role !== 'leader') return { ok: false, reason: 'not_leader' };
  if (group.status !== 'open') return { ok: false, reason: 'not_open' };
  if (!meetingSpot || typeof meetingSpot !== 'string' || !meetingSpot.trim()) {
    return { ok: false, reason: 'invalid_spot' };
  }
  return { ok: true };
}

export const GROUP_MESSAGES = {
  not_found: 'Uber group not found',
  locked: 'This group is already locked',
  cancelled: 'This group has been cancelled',
  departed: 'This group has already departed',
  already_joined: "You're already in this group",
  full: 'Sorry, this group already has 4 riders',
  not_member: 'You are not a member of this group',
  not_leader: 'Only the group leader can perform this action',
  not_open: 'Group must be open to make this change',
  invalid_spot: 'A valid meeting spot is required',
};