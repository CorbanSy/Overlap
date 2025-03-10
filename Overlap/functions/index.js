"use strict";

const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

const nlp = require("compromise");
// Uncomment the next line if you install the plugin for noun phrases
// require("compromise-noun-phrases")(nlp);

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
        const allReviewsText = reviews.map((r) => r.text).join(". ");

        // 3) NLP: extract noun phrases (if available) or fallback to nouns
        let extracted = [];
        if (typeof nlp(allReviewsText).nounPhrases === "function") {
          extracted = nlp(allReviewsText).nounPhrases().out("array");
        } else {
          extracted = nlp(allReviewsText).nouns().out("array");
        }

        // Remove leading determiners (e.g., "the", "a", "an")
        const removeDeterminer = (phrase) => phrase.replace(/^(the|a|an)\s+/i, "").trim();

        // Define a set of common stopwords to filter out
        const stopwords = new Set([
          "i", "me", "my", "we", "our", "us", "you", "your", "he", "she", "it", "they", "them",
          "the", "a", "an", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with", "is", "are",
        ]);

        // Define negative terms to exclude (these terms likely don't represent a category)
        const negativeTerms = new Set([
          "bad", "awful", "disgusting", "slow", "unfriendly", "terrible", "sappy", "experience",
        ]);

        // Process the extracted phrases:
        const cleaned = extracted.map((word) => removeDeterminer(word.toLowerCase()));

        // Filter out stopwords, overly long phrases, and negative terms.
        // We assume a category is likely 1-3 words long.
        const filtered = cleaned.filter((phrase) => {
          const words = phrase.split(/\s+/);
          if (words.length < 1 || words.length > 3) return false;
          // Exclude if any word is a stopword (or the entire phrase is in negativeTerms)
          if (negativeTerms.has(phrase)) return false;
          for (const word of words) {
            if (stopwords.has(word)) return false;
          }
          return true;
        });

        const keywords = Array.from(new Set(filtered));

        // 4) Naive sentiment analysis
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
        const tokens = nlp(allReviewsText).out("array").map((t) => t.toLowerCase());
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

        // 6) Update user's interest vector in their profile
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
