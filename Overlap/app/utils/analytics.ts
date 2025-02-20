// analytics.ts
import { analytics } from '../../FirebaseConfig'; // Adjust your path accordingly

export const logEvent = async (eventName: string, eventParams = {}) => {
  try {
    // For React Native Firebase, you might use:
    // await analytics().logEvent(eventName, eventParams);
    console.log(`Logged event: ${eventName}`, eventParams);
  } catch (error) {
    console.error('Error logging event: ', error);
  }
};