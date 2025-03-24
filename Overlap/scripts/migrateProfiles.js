// migrateProfiles.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Your service account key file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateProfiles() {
  try {
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;
      const profileRef = db
        .collection('users')
        .doc(uid)
        .collection('profile')
        .doc('main');
      const profileSnap = await profileRef.get();

      // Use the `exists` property (no parentheses):
      if (profileSnap.exists) {
        const data = profileSnap.data();
        
        // If the profile doc has no `email` field, fetch it from Auth
        if (!data.email) {
          try {
            const userRecord = await admin.auth().getUser(uid);
            const email = userRecord.email;

            if (email) {
              await profileRef.set({ email }, { merge: true });
              console.log(`Updated profile for ${uid} with email ${email}`);
            } else {
              console.log(`User ${uid} does not have an email in Auth.`);
            }
          } catch (authError) {
            console.error(`Error fetching user record for ${uid}:`, authError);
          }
        } else {
          console.log(`Profile for ${uid} already has an email.`);
        }
      } else {
        console.log(`No profile doc exists for ${uid}`);
      }
    }

    console.log("Migration complete");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

migrateProfiles();
