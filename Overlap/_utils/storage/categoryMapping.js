// _utils/categoryMapping.js
// Maps meetup topic categories (e.g., "Movies", "Social") to Google Place types,
// and provides helpers to test if a place fits a given topic.
// Prefers your server-stamped place.categoryKey when available, then falls back to types[].

import { PLACE_CATEGORIES } from "../placeCategories";

// ---- Generic types we usually ignore when deriving buckets
const GENERIC_TYPES = new Set(["establishment", "point_of_interest", "food", "store"]);

// ---- Topic (user-facing) -> Broad bucket (your canonical silo)
export const TOPIC_TO_BROAD_BUCKET = {
  Movies: "Entertainment",
  Music: "Nightlife",             // or "Entertainment" if you prefer venues over bars
  Social: "Nightlife",            // could be "Dining" + "Nightlife"; pick one for strictness
  Relaxing: "Wellness",           // or "Outdoors" depending on product intent
  Learning: "Education",
  Cooking: "Dining",
  Gaming: "Gaming",
  Travel: "Travel",
  Shopping: "Shopping",
  Outdoors: "Outdoors",
  Nightlife: "Nightlife",
  Dining: "Dining",
  SportsAndFitness: "SportsAndFitness", // keep name consistent with your backend
};

// ---- Build a single source of truth for Broad bucket -> included place types
const BROAD_BUCKET_TO_TYPES = Object.fromEntries(
  PLACE_CATEGORIES.map((c) => [c.key, [...new Set(c.includedTypes.map(normalizeType))]])
);

// Optionally: extend with a couple of “topic-only” helpers (e.g., Movies narrower than all Entertainment)
const TOPIC_EXTRAS = {
  Movies: ["movie_theater"],
  Music: ["night_club", "bar", "karaoke", "dance_hall", "live_music_venue"], // live_music_venue isn't an official type, but keeping for future-proofing
};

// ---- Public: mapping used by UIs that want topic -> types[]
export const MEETUP_CATEGORY_TO_PLACE_TYPES = new Proxy({}, {
  get(_, topic) {
    const broad = TOPIC_TO_BROAD_BUCKET[topic] || topic;
    const base = BROAD_BUCKET_TO_TYPES[broad] || [];
    const extras = TOPIC_EXTRAS[topic] || [];
    return [...new Set([...base, ...extras])];
  },
});

// ---- Helpers
export function getPlaceTypesForCategory(category) {
  return MEETUP_CATEGORY_TO_PLACE_TYPES[category] || [];
}

export function doesPlaceMatchCategory(place, meetupCategory) {
  if (!place || !meetupCategory) return false;

  // 1) Prefer server-stamped bucket
  const broad = TOPIC_TO_BROAD_BUCKET[meetupCategory] || meetupCategory;
  if (place.categoryKey && place.categoryKey === broad) return true;

  // 2) Fall back to type matching
  const allowed = new Set(getPlaceTypesForCategory(meetupCategory).map(normalizeType));
  if (allowed.size === 0) return true; // if no mapping, allow all

  const primaryType = normalizeType(place.primaryType);
  if (primaryType && allowed.has(primaryType)) return true;

  const placeTypes = Array.isArray(place.types) ? place.types.map(normalizeType) : [];
  const nonGeneric = placeTypes.filter((t) => !GENERIC_TYPES.has(t));
  return nonGeneric.some((t) => allowed.has(t));
}

// (Optional) If you ever want the broad bucket purely from the client:
export function deriveBroadBucketFromTypes(types = []) {
  const t = (Array.isArray(types) ? types : []).map(normalizeType).filter(Boolean);
  // First non-generic type that appears in one of the buckets wins
  for (const type of t) {
    if (GENERIC_TYPES.has(type)) continue;
    for (const [bucket, list] of Object.entries(BROAD_BUCKET_TO_TYPES)) {
      if (list.includes(type)) return bucket;
    }
  }
  return null;
}

function normalizeType(t) {
  return String(t || "").toLowerCase().trim();
}
