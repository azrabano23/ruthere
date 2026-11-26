// One in-process event bus. Routes publish what changed; the realtime layer forwards it to
// the browsers that should hear about it. Keeping routes ignorant of sockets means a route
// works the same in tests, and Joshua's group routes just call publish() too.
import { EventEmitter } from 'node:events';

export const bus = new EventEmitter();
bus.setMaxListeners(50);

export const TRIP_EVENTS = ['seat_taken', 'seat_released', 'trip_cancelled', 'trip_updated'];
export const GROUP_EVENTS = ['group_joined', 'group_left', 'group_locked', 'fare_entered', 'group_cancelled'];

/**
 * publish('seat_taken', { tripId, userIds: [...], seatsLeft })
 * - tripId / groupId: everyone watching that trip or group hears it
 * - userIds: these people hear it even if they are not watching the page (for toasts)
 */
export function publish(type, payload = {}) {
  const event = { type, at: new Date().toISOString(), ...payload };
  bus.emit('event', event);
  return event;
}
