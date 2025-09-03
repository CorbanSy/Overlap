"use strict";

/**
 * Overlap — Cloud Functions index.js
 * - storeNearbyPlacesAndDetails: One-off (or ad hoc) bulk loader for Places near a point.
 * - analyzeLikedPlace: Build keywords/sentiment when a user likes a place.
 * - ensurePlaceCategory: Stamps categoryKey on place docs (safety net).
 *
 * Notes for your current “store everything to test UI” phase:
 * - This stores enough fields for cards + recs, with short, capped arrays.
 * - Photos are rehosted to GCS (toggle REHOST_PHOTOS) for dev convenience.
 * - Reviews are stored (capped) so you can test UI and NLP.
 */

const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const axios = require("axios");
const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");
const { getStorage } = require("firebase-admin/storage");
const nlp = require("compromise");

// ----------------------------------------------------------------------------
// Boot / Globals
// ----------------------------------------------------------------------------
admin.initializeApp();
const db = admin.firestore();
const storage = getStorage();

setGlobalOptions({ region: "us-west2", memory: "2GiB", timeoutSeconds: 540 }); // keep region with your Firestore

// Use an env var in prod: set in "firebase functions:secrets:set GOOGLE_MAPS_API_KEY"
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyB6fvIePcBwSZQvyXtZvW-9XCbcKMf2I7o";
const REHOST_PHOTOS = true;   // flip to false if you prefer using Google photo URLs directly
const MAX_PHOTOS = 3;
const MAX_REVIEWS = 5;

// ----------------------------------------------------------------------------
// Category mapping (from your PLACE_CATEGORIES)
// ----------------------------------------------------------------------------
const GENERIC_TYPES = new Set(["establishment", "point_of_interest", "food", "store"]);
const TYPE_TO_CATEGORY = {
  // Dining
  restaurant: "Dining",
  cafe: "Dining",
  fine_dining_restaurant: "Dining",
  fast_food_restaurant: "Dining",
  // Nightlife
  night_club: "Nightlife",
  bar: "Nightlife",
  karaoke: "Nightlife",
  dance_hall: "Nightlife",
  // Shopping
  shopping_mall: "Shopping",
  market: "Shopping",
  clothing_store: "Shopping",
  grocery_store: "Shopping",
  gift_shop: "Shopping",
  // Entertainment
  movie_theater: "Entertainment",
  comedy_club: "Entertainment",
  video_arcade: "Entertainment",
  amusement_center: "Entertainment",
  bowling_alley: "Entertainment",
  zoo: "Entertainment",
  // Arts & Culture
  art_gallery: "ArtsAndCulture",
  museum: "ArtsAndCulture",
  historical_place: "ArtsAndCulture",
  cultural_landmark: "ArtsAndCulture",
  auditorium: "ArtsAndCulture",
  performing_arts_theater: "ArtsAndCulture",
  sculpture: "ArtsAndCulture",
  opera_house: "ArtsAndCulture",
  // Outdoors
  park: "Outdoors",
  beach: "Outdoors",
  campground: "Outdoors",
  hiking_area: "Outdoors",
  national_park: "Outdoors",
  ski_resort: "Outdoors",
  // Sports & Fitness
  gym: "SportsAndFitness",
  fitness_center: "SportsAndFitness",
  golf_course: "SportsAndFitness",
  stadium: "SportsAndFitness",
  arena: "SportsAndFitness",
  athletic_field: "SportsAndFitness",
  ice_skating_rink: "SportsAndFitness",
  sports_activity_location: "SportsAndFitness",
  swimming_pool: "SportsAndFitness",
  // Wellness
  spa: "Wellness",
  sauna: "Wellness",
  massage: "Wellness",
  yoga_studio: "Wellness",
  // Gaming
  amusement_park: "Gaming",
  casino: "Gaming",
  internet_cafe: "Gaming",
  // Travel
  tourist_attraction: "Travel",
  visitor_center: "Travel",
  event_venue: "Travel",
  hotel: "Travel",
  // Family Fun
  playground: "FamilyFun",
  childrens_camp: "FamilyFun",
  picnic_ground: "FamilyFun",
  water_park: "FamilyFun",
  botanical_garden: "FamilyFun",
  aquarium: "FamilyFun",
  // Education
  planetarium: "Education",
  state_park: "Education"
};

function categoryFromTypes(types = []) {
  // prefer specific over generic types
  for (const t of types) {
    if (!GENERIC_TYPES.has(t) && TYPE_TO_CATEGORY[t]) return TYPE_TO_CATEGORY[t];
  }
  // fallback to any mapping
  for (const t of types) if (TYPE_TO_CATEGORY[t]) return TYPE_TO_CATEGORY[t];
  return null;
}

function subCategoryFromTypes(types = []) {
  // Pick a representative subtype within your category—for Dining this could be 'cafe'/'steakhouse'/...
  const preferredOrder = [
    "cafe", "restaurant",
    "bar", "night_club", "karaoke",
    "shopping_mall", "market",
    "movie_theater", "video_arcade", "amusement_center", "bowling_alley",
    "art_gallery", "museum",
    "park", "beach", "campground", "hiking_area", "national_park", "ski_resort",
    "gym", "fitness_center", "golf_course", "stadium", "ice_skating_rink",
    "spa", "sauna", "yoga_studio",
    "amusement_park", "casino", "internet_cafe",
    "tourist_attraction", "event_venue", "hotel",
    "playground", "water_park", "botanical_garden", "aquarium",
    "planetarium", "state_park"
  ];
  for (const p of preferredOrder) if (types.includes(p)) return p;
  return types.find(t => !GENERIC_TYPES.has(t)) || null;
}

function priceSymbols(priceLevel) {
  return typeof priceLevel === "number" ? "$".repeat(Math.max(0, Math.min(4, priceLevel))) : "";
}

function qualityScore(rating, count) {
  const r = typeof rating === "number" ? rating : 0;
  const c = typeof count === "number" ? count : 0;
  return Number((r * Math.log(1 + c)).toFixed(3));
}

function deriveBadges(attrs = {}) {
  const b = [];
  if (attrs.servesBrunch) b.push("Brunch");
  if (attrs.servesBreakfast) b.push("Breakfast");
  if (attrs.servesLunch) b.push("Lunch");
  if (attrs.servesDinner) b.push("Dinner");
  if (attrs.servesCoffee) b.push("Coffee");
  if (attrs.servesDessert) b.push("Dessert");
  if (attrs.servesVegetarianFood) b.push("Vegetarian");
  if (attrs.outdoorSeating) b.push("Outdoor");
  if (attrs.goodForGroups) b.push("Groups");
  if (attrs.goodForChildren) b.push("Kid-friendly");
  if (attrs.liveMusic) b.push("Live music");
  if (attrs.goodForWatchingSports) b.push("Sports");
  if (attrs.reservable) b.push("Reservations");
  if (attrs.delivery) b.push("Delivery");
  if (attrs.takeout) b.push("Takeout");
  if (attrs.allowsDogs) b.push("Dog-friendly");
  return b.slice(0, 8);
}

/** crude "Open until ..." helper from weekday_text; good enough for UI dev */
function openStatusFromWeekdayText(opening_hours, utcOffsetMinutes) {
  try {
    if (!opening_hours || !Array.isArray(opening_hours.weekday_text)) return { openNow: opening_hours?.open_now ?? null, text: null };
    const offset = typeof utcOffsetMinutes === "number" ? utcOffsetMinutes : 0;
    const nowUTC = new Date();
    const local = new Date(nowUTC.getTime() + offset * 60 * 1000);
    const dayIndex = local.getUTCDay(); // 0=Sun .. 6=Sat
    const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const mapIndex = [6, 0, 1, 2, 3, 4, 5]; // Sun->idx6, Mon->0 ...
    const today = order[mapIndex[dayIndex]];
    const line = opening_hours.weekday_text.find(s => s.startsWith(today));
    let text = null;
    if (line) {
      // Example: "Monday: 7:00 AM – 11:00 PM"
      const m = line.split(":").slice(1).join(":").trim();
      text = m ? (opening_hours.open_now ? `Open — ${m.split("–")[1] ? `until ${m.split("–")[1].trim()}` : m}` : `Closed — ${m}`) : null;
    }
    return { openNow: opening_hours.open_now ?? null, text };
  } catch {
    return { openNow: opening_hours?.open_now ?? null, text: null };
  }
}

// ----------------------------------------------------------------------------
// 1) analyzeLikedPlace — extracts keywords/sentiment from reviews (either on doc or fetched on-the-fly)
// ----------------------------------------------------------------------------
exports.analyzeLikedPlace = onDocumentCreated("users/{userId}/likes/{placeId}", async (event) => {
  const { userId, placeId } = event.params;

  try {
    // Try to use stored reviews first (dev/testing); otherwise fetch fresh reviews from Places
    let reviews = [];
    const placeDoc = await db.collection("places").doc(placeId).get();
    if (placeDoc.exists) {
      const d = placeDoc.data();
      reviews = Array.isArray(d?.reviews) ? d.reviews : [];
    }

    if (reviews.length === 0) {
      const detailUrl =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${encodeURIComponent(placeId)}` +
        `&fields=place_id,reviews` +
        `&key=${GOOGLE_MAPS_API_KEY}`;
      const detailRes = await axios.get(detailUrl);
      const d = detailRes?.data?.result || {};
      reviews = (d.reviews || []).map(r => ({
        text: r.text,
        rating: r.rating,
        authorName: r.author_name,
        relativeTime: r.relative_time_description
      }));
    }

    if (!reviews || reviews.length === 0) return;

    // Build a single blob and extract phrases
    const allText = reviews.map(r => r.text).join(". ");
    let extracted =
      typeof nlp(allText).nounPhrases === "function"
        ? nlp(allText).nounPhrases().out("array")
        : nlp(allText).nouns().out("array");

    const removeDeterminer = (phrase) => phrase.replace(/^(the|a|an)\s+/i, "").trim();
    const STOP = new Set(["i", "me", "my", "we", "our", "us", "you", "your", "he", "she", "it", "they", "them", "the", "a", "an", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with", "is", "are"]);
    const NEG = new Set(["bad", "awful", "disgusting", "slow", "unfriendly", "terrible", "sappy", "experience"]);

    const cleaned = extracted.map(w => removeDeterminer(w.toLowerCase()));
    const filtered = cleaned.filter(phrase => {
      const words = phrase.split(/\s+/);
      if (words.length < 1 || words.length > 3) return false;
      if (NEG.has(phrase)) return false;
      return words.every(w => !STOP.has(w));
    });
    const keywords = Array.from(new Set(filtered)).slice(0, 40);

    // ultra-simple sentiment pulse
    let sentimentScore = 0;
    const pos = new Set(["good", "great", "awesome", "delicious", "friendly", "fantastic"]);
    const neg = new Set(["bad", "awful", "disgusting", "slow", "unfriendly", "terrible"]);
    const tokens = nlp(allText).out("array").map(t => t.toLowerCase());
    for (const t of tokens) {
      if (pos.has(t)) sentimentScore += 1;
      if (neg.has(t)) sentimentScore -= 1;
    }
    const scaledSentiment = tokens.length ? sentimentScore / tokens.length : 0;

    // write derived analysis on the place
    await db.collection("places").doc(placeId).collection("analysis").doc("latest").set({
      keywords,
      sentiment: scaledSentiment,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // fold into user's keyword profile vector
    const profileRef = db.collection("users").doc(userId).collection("profile").doc("main");
    const profileSnap = await profileRef.get();
    let currentVector = profileSnap.exists ? (profileSnap.data().keywords || {}) : {};
    keywords.forEach(kw => { currentVector[kw] = (currentVector[kw] || 0) + 1; });

    await profileRef.set({
      keywords: currentVector,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

  } catch (err) {
    console.error("analyzeLikedPlace error:", err);
  }
});

// ----------------------------------------------------------------------------
// 2) storeNearbyPlacesAndDetails — bulk loader for a lat/lng + types[] (cap arrays, derive fields)
// ----------------------------------------------------------------------------
exports.storeNearbyPlacesAndDetails = onRequest(
  { timeoutSeconds: 540, memory: "2GiB" },
  async (req, res) => {
    const {
      lat,
      lng,
      radius = 6000,           // 6km default
      maxPlaces = 800,         // stop early for dev
      // optional: pass types[]; otherwise use a useful default
      types: typesQuery
    } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "lat and lng are required query params" });
    }

    // Accept ?types=restaurant,cafe,bar or array of types
    const types = Array.isArray(typesQuery)
      ? typesQuery
      : (typeof typesQuery === "string" ? typesQuery.split(",").map(s => s.trim()).filter(Boolean) : [
          "restaurant", "cafe", "bar", "tourist_attraction",
          "shopping_mall", "hotel", "gym", "movie_theater",
          "library", "park", "museum", "art_gallery",
          "amusement_park", "aquarium", "bowling_alley",
          "casino", "night_club", "spa", "stadium", "zoo"
        ]);

    let storedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    console.log(`🧭 Nearby load @ ${lat},${lng} radius=${radius}m, types=${types.length}, max=${maxPlaces}`);

    try {
      for (const type of types) {
        if (storedCount >= maxPlaces) break;

        let nextPageToken = null;
        let page = 0;

        do {
          page++;

          const nearbyUrl =
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
            `?location=${lat},${lng}&radius=${radius}&type=${encodeURIComponent(type)}` +
            `&key=${GOOGLE_MAPS_API_KEY}` +
            (nextPageToken ? `&pagetoken=${nextPageToken}` : "");

          const nearbyResp = await axios.get(nearbyUrl);
          const batch = nearbyResp?.data?.results || [];
          nextPageToken = nearbyResp?.data?.next_page_token || null;

          console.log(`➡️  ${type} page ${page}: ${batch.length} results`);

          for (const place of batch) {
            if (storedCount >= maxPlaces) break;

            const placeId = place.place_id;
            if (!placeId) continue;

            try {
              const ref = db.collection("places").doc(placeId);
              const exists = await ref.get();
              if (exists.exists) {
                skippedCount++;
                continue;
              }

              // Fetch Details (ask for a rich set for UI testing)
              const detailUrl =
                `https://maps.googleapis.com/maps/api/place/details/json` +
                `?place_id=${encodeURIComponent(placeId)}` +
                `&fields=place_id,name,display_name,formatted_address,short_formatted_address,geometry,types,primary_type,` +
                `price_level,rating,user_ratings_total,international_phone_number,website,opening_hours,utc_offset,photos,reviews,` +
                `business_status,url,` +
                // tasty Dining attributes (some may not exist)
                `serves_breakfast,serves_brunch,serves_lunch,serves_dinner,serves_coffee,serves_dessert,` +
                `serves_vegetarian_food,serves_beer,serves_wine,serves_cocktails,` +
                `good_for_groups,good_for_children,outdoor_seating,live_music,good_for_watching_sports,` +
                `reservable,allows_dogs,` +
                `delivery,takeout,dine_in` +
                `&key=${GOOGLE_MAPS_API_KEY}`;

              const detailRes = await axios.get(detailUrl);
              const d = detailRes?.data?.result || {};
              if (!d.place_id) {
                console.warn(`detail missing place_id for ${placeId}`);
              }

              // Photos -> either rehost to GCS (dev) or keep Google photo URLs
              const photosMeta = Array.isArray(d.photos) ? d.photos.slice(0, MAX_PHOTOS) : [];
              const photos = [];
              const attributions = [];

              for (const p of photosMeta) {
                if (p.html_attributions && p.html_attributions.length) {
                  attributions.push(...p.html_attributions);
                }
                if (REHOST_PHOTOS) {
                  try {
                    const photoApi = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${p.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`;
                    const response = await fetch(photoApi);
                    const buffer = await response.buffer();
                    const filePath = `places/${d.place_id}/${uuidv4()}.jpg`;
                    const file = storage.bucket().file(filePath);
                    await file.save(buffer, { contentType: "image/jpeg" });
                    const [url] = await file.getSignedUrl({ action: "read", expires: "03-01-2030" });
                    photos.push(url);
                  } catch (photoErr) {
                    console.error(`photo rehost error for ${placeId}:`, photoErr.message);
                  }
                } else {
                  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${p.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`;
                  photos.push(url);
                }
              }

              // Hours & open-now string (best-effort)
              const opening_hours = d.opening_hours || {};
              const { openNow, text: openStatusText } = openStatusFromWeekdayText(opening_hours, d.utc_offset);

              // Attributes block (boolean-ish)
              const attributes = {
                dineIn: d.dine_in ?? null,
                delivery: d.delivery ?? null,
                takeout: d.takeout ?? null,
                servesBreakfast: d.serves_breakfast ?? null,
                servesBrunch: d.serves_brunch ?? null,
                servesLunch: d.serves_lunch ?? null,
                servesDinner: d.serves_dinner ?? null,
                servesCoffee: d.serves_coffee ?? null,
                servesDessert: d.serves_dessert ?? null,
                servesVegetarianFood: d.serves_vegetarian_food ?? null,
                servesBeer: d.serves_beer ?? null,
                servesWine: d.serves_wine ?? null,
                servesCocktails: d.serves_cocktails ?? null,
                goodForGroups: d.good_for_groups ?? null,
                goodForChildren: d.good_for_children ?? null,
                outdoorSeating: d.outdoor_seating ?? null,
                liveMusic: d.live_music ?? null,
                goodForWatchingSports: d.good_for_watching_sports ?? null,
                reservable: d.reservable ?? null,
                allowsDogs: d.allows_dogs ?? null
              };

              const types = d.types || place.types || [];
              const categoryKey = categoryFromTypes(types);
              const subCategoryKey = subCategoryFromTypes(types);

              // Derived helpers
              const priceLevel = typeof d.price_level === "number" ? d.price_level : null;
              const rating = typeof d.rating === "number" ? d.rating : null;
              const userRatingCount = typeof d.user_ratings_total === "number" ? d.user_ratings_total : null;

              const doc = {
                // identity / spine
                id: d.place_id || placeId,
                source: "google",
                categoryKey: categoryKey,
                subCategoryKey: subCategoryKey,
                primaryType: d.primary_type || null,
                types,

                // geo
                location: {
                  lat: d.geometry?.location?.lat ?? place.geometry?.location?.lat ?? null,
                  lng: d.geometry?.location?.lng ?? place.geometry?.location?.lng ?? null,
                },

                // card basics
                displayName: d.display_name || d.name || place.name || null,
                formatted_address: d.formatted_address || null,
                shortFormattedAddress: d.short_formatted_address || null,
                googleMapsUri: d.url || null,
                website: d.website || null,
                internationalPhoneNumber: d.international_phone_number || null,

                // social proof & price
                rating,
                userRatingCount,
                priceLevel,
                priceSymbols: priceSymbols(priceLevel),
                qualityScore: qualityScore(rating, userRatingCount),

                // hours
                openingHours: Array.isArray(opening_hours.weekday_text) ? opening_hours.weekday_text : [],
                utcOffsetMinutes: typeof d.utc_offset === "number" ? d.utc_offset : null,
                openNow,
                openStatusText,

                // media
                photos,
                photoReference: photosMeta?.[0]?.photo_reference || null,
                attributions: Array.from(new Set(attributions)),

                // attributes + badges
                attributes,
                badges: deriveBadges(attributes),

                // reviews (capped)
                reviews: Array.isArray(d.reviews)
                  ? d.reviews.slice(0, MAX_REVIEWS).map(r => ({
                      authorName: r.author_name,
                      rating: r.rating,
                      relativeTime: r.relative_time_description,
                      text: r.text
                    }))
                  : [],

                // ops
                businessStatus: d.business_status || null,
                fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7d dev TTL
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              };

              // write
              await ref.set(doc, { merge: true });
              storedCount++;

              // tiny gap to be gentle on quotas
              await new Promise(r => setTimeout(r, 80));
            } catch (placeErr) {
              console.error(`place error (${place.name || place.place_id}):`, placeErr.message);
              errorCount++;
            }
          }

          // Google requires a small delay before using next_page_token
          if (nextPageToken && storedCount < maxPlaces) {
            await new Promise(r => setTimeout(r, 2000));
          }
        } while (nextPageToken && storedCount < maxPlaces);

        // brief pause between types
        if (storedCount < maxPlaces) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      const summary = { storedCount, skippedCount, errorCount, typesProcessed: types.length };
      console.log("✅ storeNearbyPlacesAndDetails summary:", summary);
      return res.status(200).json({ message: "Completed nearby population.", summary });

    } catch (err) {
      console.error("❌ storeNearbyPlacesAndDetails fatal:", err);
      return res.status(500).json({ message: "Population failed", error: err.message, storedCount, skippedCount, errorCount });
    }
  }
);

// ----------------------------------------------------------------------------
// 3) ensurePlaceCategory — stamp/repair categoryKey if a place is missing it
// ----------------------------------------------------------------------------
exports.ensurePlaceCategory = onDocumentWritten("places/{placeId}", async (event) => {
  try {
    const after = event.data?.after?.data();
    if (!after) return;

    if (!after.categoryKey || !after.subCategoryKey) {
      const types = Array.isArray(after.types) ? after.types : [];
      const categoryKey = after.categoryKey || categoryFromTypes(types);
      const subCategoryKey = after.subCategoryKey || subCategoryFromTypes(types);

      if (categoryKey || subCategoryKey) {
        await event.data.after.ref.set(
          {
            categoryKey: categoryKey || null,
            subCategoryKey: subCategoryKey || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          },
          { merge: true }
        );
      }
    }
  } catch (err) {
    console.error("ensurePlaceCategory error:", err);
  }
});
