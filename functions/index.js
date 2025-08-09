"use strict";

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const axios = require("axios");
const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");
const { getStorage } = require("firebase-admin/storage");
const nlp = require("compromise");

admin.initializeApp();
const db = admin.firestore();
const storage = getStorage();

// Optional global default config
setGlobalOptions({ memory: "1GiB", timeoutSeconds: 540 });

/* ==============================
   1. analyzeLikedPlace Function
============================== */
exports.analyzeLikedPlace = onDocumentCreated("users/{userId}/likes/{placeId}", async (event) => {
  const { userId, placeId } = event.params;
  try {
    const reviewSnap = await db.collection("places").doc(placeId).collection("reviews").get();
    const reviews = reviewSnap.docs.map((docSnap) => docSnap.data());
    if (!reviews || reviews.length === 0) return;

    const allReviewsText = reviews.map((r) => r.text).join(". ");

    let extracted = typeof nlp(allReviewsText).nounPhrases === "function"
      ? nlp(allReviewsText).nounPhrases().out("array")
      : nlp(allReviewsText).nouns().out("array");

    const removeDeterminer = (phrase) => phrase.replace(/^(the|a|an)\s+/i, "").trim();
    const stopwords = new Set(["i", "me", "my", "we", "our", "us", "you", "your", "he", "she", "it", "they", "them", "the", "a", "an", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with", "is", "are"]);
    const negativeTerms = new Set(["bad", "awful", "disgusting", "slow", "unfriendly", "terrible", "sappy", "experience"]);

    const cleaned = extracted.map((word) => removeDeterminer(word.toLowerCase()));
    const filtered = cleaned.filter((phrase) => {
      const words = phrase.split(/\s+/);
      if (words.length < 1 || words.length > 3) return false;
      if (negativeTerms.has(phrase)) return false;
      return words.every((word) => !stopwords.has(word));
    });

    const keywords = Array.from(new Set(filtered));

    let sentimentScore = 0;
    const positiveWords = ["good", "great", "awesome", "delicious", "friendly", "fantastic"];
    const negativeWords = ["bad", "awful", "disgusting", "slow", "unfriendly", "terrible"];
    const tokens = nlp(allReviewsText).out("array").map((t) => t.toLowerCase());
    tokens.forEach((token) => {
      if (positiveWords.includes(token)) sentimentScore += 1;
      if (negativeWords.includes(token)) sentimentScore -= 1;
    });

    const scaledSentiment = sentimentScore / tokens.length;

    await db.collection("places").doc(placeId).collection("analysis").doc("latest").set({
      keywords,
      sentiment: scaledSentiment,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    const profileRef = db.collection("users").doc(userId).collection("profile").doc("main");
    const profileSnap = await profileRef.get();
    let currentVector = profileSnap.exists ? profileSnap.data().keywords || {} : {};
    keywords.forEach((kw) => { currentVector[kw] = (currentVector[kw] || 0) + 1; });

    await profileRef.set({
      keywords: currentVector,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

  } catch (error) {
    console.error("analyzeLikedPlace error:", error);
  }
});

/* ==============================
   2. storeNearbyPlacesAndDetails Function
============================== */
exports.storeNearbyPlacesAndDetails = onRequest(
  { timeoutSeconds: 540, memory: "1GiB" },
  async (req, res) => {
    const { lat, lng, radius = 5000, types = ["restaurant", "museum", "park"] } = req.query;
    const apiKey = "AIzaSyB6fvIePcBwSZQvyXtZvW-9XCbcKMf2I7o"; // ✅ use your own key
    const maxPlaces = 200;
    let storedCount = 0;
    let nextPageToken = null;

    try {
      for (const type of types) {
        do {
          console.log(`📍 Fetching nearby places for type: ${type}`);
          const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}${nextPageToken ? `&pagetoken=${nextPageToken}` : ""}`;
          const nearbyResponse = await axios.get(url);
          const places = nearbyResponse.data.results;

          console.log(`✅ Fetched ${places.length} places for type: ${type}`);
          nextPageToken = nearbyResponse.data.next_page_token || null;

          for (const place of places) {
            if (storedCount >= maxPlaces) break;
            console.log(`🔍 Fetching details for place: ${place.name} (${place.place_id})`);
            const exists = await db.collection("places").doc(place.place_id).get();
            if (exists.exists) continue;

            const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=place_id,name,formatted_address,geometry,types,rating,user_ratings_total,formatted_phone_number,website,opening_hours,photos,reviews&key=${apiKey}`;
            const detailRes = await axios.get(detailUrl);
            const d = detailRes.data.result;

            const photosMeta = d.photos?.slice(0, 5) || [];
            const photoUrls = [];

            for (let i = 0; i < photosMeta.length; i++) {
              const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photosMeta[i].photo_reference}&key=${apiKey}`;
              const response = await fetch(photoUrl);
              const buffer = await response.buffer();
              const filePath = `places/${d.place_id}/${uuidv4()}.jpg`;
              const file = storage.bucket().file(filePath);
              await file.save(buffer, { contentType: "image/jpeg" });
              const [url] = await file.getSignedUrl({ action: "read", expires: "03-01-2030" });
              photoUrls.push(url);
            }

            await db.collection("places").doc(d.place_id).set({
              id: d.place_id,
              name: d.name,
              formatted_address: d.formatted_address,
              location: {
                lat: d.geometry.location.lat,
                lng: d.geometry.location.lng,
              },
              types: d.types || [],
              rating: d.rating || 0,
              userRatingsTotal: d.user_ratings_total || 0,
              phoneNumber: d.formatted_phone_number || "",
              website: d.website || "",
              openingHours: d.opening_hours?.weekday_text || [],
              photoReference: d.photos?.[0]?.photo_reference || null,
              photos: photoUrls,
              reviews: d.reviews?.map((r) => ({
                text: r.text,
                rating: r.rating,
                authorName: r.author_name,
                relativeTime: r.relative_time_description,
              })) || [],
              description: "",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            storedCount++;
          }

          if (storedCount >= maxPlaces) break;
          if (nextPageToken) await new Promise(r => setTimeout(r, 2000));
        } while (nextPageToken && storedCount < maxPlaces);
      }

      res.status(200).send(`Stored ${storedCount} places.`);
    } catch (err) {
      console.error("Error storing places:", err);
      res.status(500).send("Failed to store places.");
    }
  }
);
