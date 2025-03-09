"use strict";

const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

const nlp = require("compromise");

exports.analyzeLikedPlace = onDocumentCreated(
    "users/{userId}/likes/{placeId}",
    async (event) => {
      const {userId, placeId} = event.params;
      try {
      // 1) Load reviews for this place
        const reviewSnap = await db
            .collection("places")
            .doc(placeId)
            .collection("reviews")
            .get();
        const reviews = reviewSnap.docs.map((docSnap) => docSnap.data());

        if (!reviews || reviews.length === 0) {
          functions.logger.info(`No reviews found for place: ${placeId}`);
          return;
        }

        // 2) Concatenate text from all reviews
        const allReviewsText = reviews
            .map((r) => r.text)
            .join(". ");

        // 3) NLP: extract nouns
        const docNlp = nlp(allReviewsText);
        const allNouns = docNlp.nouns().out("array");
        const keywords = Array.from(
            new Set(allNouns.map((k) => k.toLowerCase())),
        );

        // 4) Simple naive sentiment
        let sentimentScore = 0;
        const positiveWords = [
          "good",
          "great",
          "awesome",
          "delicious",
          "friendly",
          "fantastic",
        ];
        const negativeWords = [
          "bad",
          "awful",
          "disgusting",
          "slow",
          "unfriendly",
          "terrible",
        ];
        const tokens = docNlp
            .out("array")
            .map((t) => t.toLowerCase());

        tokens.forEach((token) => {
          if (positiveWords.includes(token)) {
            sentimentScore += 1;
          }
          if (negativeWords.includes(token)) {
            sentimentScore -= 1;
          }
        });
        const scaledSentiment = sentimentScore / tokens.length;

        // 5) Write analysis to Firestore
        await db
            .collection("places")
            .doc(placeId)
            .collection("analysis")
            .doc("latest")
            .set(
                {
                  keywords,
                  sentiment: scaledSentiment,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                {merge: true},
            );

        // 6) Update user's interest vector
        const profileRef = db
            .collection("users")
            .doc(userId)
            .collection("profile")
            .doc("main");
        const profileSnap = await profileRef.get();

        let currentVector = {};
        if (profileSnap.exists) {
          currentVector = profileSnap.data().keywords || {};
        }
        keywords.forEach((kw) => {
          if (!currentVector[kw]) {
            currentVector[kw] = 0;
          }
          currentVector[kw] += 1;
        });

        await profileRef.set(
            {
              keywords: currentVector,
              lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            },
            {merge: true},
        );

        functions.logger.info(
            `analyzeLikedPlace: success for user=${userId}, place=${placeId}`,
        );
      } catch (error) {
        functions.logger.error("analyzeLikedPlace error:", error);
      }
    },
);
