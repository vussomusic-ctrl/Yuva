// Single source of truth for the room-count filter values. "5+" means 5 or more
// (filterListings treats it as l.rooms >= 5). Shared by the Filters screen and
// the Search quick-filter chips so the set never drifts.

export const ROOMS = ["1", "2", "3", "4", "5+"] as const;
export type RoomKey = (typeof ROOMS)[number];
