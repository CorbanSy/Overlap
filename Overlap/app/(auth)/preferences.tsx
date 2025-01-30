import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import { useFilters } from "../../context/FiltersContext";

const { width, height } = Dimensions.get("window");

// Activity Labels
const activityLabels = [
  "Dining", "Fitness", "Outdoors", "Movies", "Gaming", "Social", "Music",
  "Shopping", "Travel", "Art", "Relaxing", "Learning", "Cooking", "Nightlife",
];

type Bubble = {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  rank: number | null;
};

// Function to create bubbles with spiral layout
const createBubbles = (): Bubble[] => {
  const bubbles: Bubble[] = [];
  const centerX = width / 2;
  const centerY = height / 2.5;
  let currentDistance = 50;
  let currentAngle = 0;
  const angleStep = (2 * Math.PI) / 10; 

  activityLabels.forEach((label) => {
    const x = centerX + Math.cos(currentAngle) * currentDistance;
    const y = centerY + Math.sin(currentAngle) * currentDistance;
    const radius = 50;

    bubbles.push({ id: label, label, x, y, size: radius, rank: null });

    currentAngle += angleStep;
    if (currentAngle >= 2 * Math.PI) {
      currentAngle = 0;
      currentDistance += 70;
    }
  });

  return bubbles;
};

export default function PreferencesScreen() {
  const router = useRouter();
  const auth = getAuth();
  const { filterState, setFilterState } = useFilters();

  const [bubbles, setBubbles] = useState<Bubble[]>(createBubbles());
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const [rankLabels, setRankLabels] = useState<Array<string | null>>(Array(5).fill(null));
  const [isDisclaimerVisible, setIsDisclaimerVisible] = useState(true);
  const [loading, setLoading] = useState(false);

  // Apply gravity effect initially
  useEffect(() => {
    const gravityInterval = setInterval(() => applyGravity(), 50);
    const stopGravityTimeout = setTimeout(() => clearInterval(gravityInterval), 2000);

    return () => {
      clearInterval(gravityInterval);
      clearTimeout(stopGravityTimeout);
    };
  }, []);

  // Gravity function: pulls bubbles towards the center
  const applyGravity = () => {
    const centerX = width / 2;
    const centerY = height / 2.5;

    setBubbles((prevBubbles) =>
      prevBubbles.map((bubble) => {
        let dx = centerX - bubble.x;
        let dy = centerY - bubble.y;
        const distance = Math.sqrt(dx ** 2 + dy ** 2);

        if (distance > 1) {
          const pullStrength = 2;
          dx = (dx / distance) * pullStrength;
          dy = (dy / distance) * pullStrength;

          return { ...bubble, x: bubble.x + dx, y: bubble.y + dy };
        }
        return bubble;
      })
    );

    adjustNeighbors();
  };

  // Adjust overlapping bubbles
  const adjustNeighbors = () => {
    setBubbles((prevBubbles) => {
      const updatedBubbles = [...prevBubbles];
      for (let i = 0; i < updatedBubbles.length; i++) {
        for (let j = i + 1; j < updatedBubbles.length; j++) {
          const bubbleA = updatedBubbles[i];
          const bubbleB = updatedBubbles[j];
          const dx = bubbleB.x - bubbleA.x;
          const dy = bubbleB.y - bubbleA.y;
          const distance = Math.sqrt(dx ** 2 + dy ** 2);
          const minDistance = bubbleA.size / 2 + bubbleB.size / 2;

          if (distance < minDistance && distance > 0) {
            const overlap = (minDistance - distance) / 2;
            const adjustX = (dx / distance) * overlap;
            const adjustY = (dy / distance) * overlap;

            bubbleA.x -= adjustX;
            bubbleA.y -= adjustY;
            bubbleB.x += adjustX;
            bubbleB.y += adjustY;
          }
        }
      }
      return updatedBubbles;
    });
  };

  // Assign ranking to bubbles
  const assignRank = (bubbleId: string) => {
    if (!selectedRank) return;

    setBubbles((prevBubbles) =>
      prevBubbles.map((bubble) =>
        bubble.id === bubbleId
          ? { ...bubble, rank: selectedRank, size: 50 + selectedRank * 10 }
          : bubble
      )
    );

    setRankLabels((prevLabels) => {
      const updatedLabels = [...prevLabels];
      updatedLabels[selectedRank - 1] = activityLabels.find((label) => label === bubbleId) || null;
      return updatedLabels;
    });
  };

  // Submit preferences
  const handleSubmitPreferences = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const firestore = getFirestore();
      const userRef = doc(collection(firestore, "preferences"), auth.currentUser.uid);
      await setDoc(userRef, { preferences: rankLabels });
      setLoading(false);
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error("Error submitting preferences:", error);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Modal for Instructions */}
      <Modal visible={isDisclaimerVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>
              Rank your preferences to personalize your experience. You can change these later.
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setIsDisclaimerVisible(false)}>
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Text style={styles.header}>Rank Your Preferences</Text>

      {/* Bubbles */}
      <View style={styles.bubblesContainer}>
        {bubbles.map((bubble) => (
          <TouchableOpacity
            key={bubble.id}
            style={[styles.bubble, { width: bubble.size, height: bubble.size, borderRadius: bubble.size / 2 }]}
            onPress={() => assignRank(bubble.id)}
          >
            <Text style={styles.bubbleText}>{bubble.label} {bubble.rank ? `(${bubble.rank})` : ""}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmitPreferences} disabled={loading}>
        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Submit</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ---------- STYLES ------------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0D1117", // Dark mode background to match Home.tsx
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 40,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#0D1117",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 20,
  },
  rankContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  rankBoxContainer: {
    alignItems: "center",
    marginHorizontal: 8,
  },
  rankBox: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  rankBoxActive: {
    backgroundColor: "#F5A623", // Highlighted when selected
  },
  rankBoxText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0D1117",
  },
  rankLabel: {
    color: "#AAAAAA",
    marginTop: 8,
    fontSize: 14,
  },
  bubblesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 20,
  },
  bubble: {
    backgroundColor: "#1B1F24",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    margin: 5,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  bubbleSelected: {
    backgroundColor: "#F5A623",
  },
  bubbleText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#F5A623",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#0D1117",
    fontWeight: "bold",
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1B1F24",
    padding: 20,
    borderRadius: 8,
    width: "80%",
    alignItems: "center",
  },
  modalText: {
    color: "#FFFFFF",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
  },
  modalButton: {
    backgroundColor: "#F5A623",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  modalButtonText: {
    color: "#0D1117",
    fontWeight: "bold",
    fontSize: 14,
  },
});

