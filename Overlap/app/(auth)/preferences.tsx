import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { getAuth } from "firebase/auth";
import { markPreferencesComplete, saveProfileData } from '../utils/storage'; // adjust the path as needed
import { router } from 'expo-router'
const { width, height } = Dimensions.get("window");

// Define Theme Colors
const themeColors = {
  bg: "#0D1117",
  primary: "#F5A623",
  white: "#FFFFFF",
  secondary: "#1B1F24",
};

// Define Bubble Type
type Bubble = {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  rank: number | null;
};

// Initial activity labels
const activityLabels: string[] = [
  "Dining", "Fitness", "Outdoors", "Movies", "Gaming", "Social", "Music",
  "Shopping", "Travel", "Art", "Relaxing", "Learning", "Cooking", "Nightlife",
];

// Function to create initial bubbles with a spiral layout
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
  const navigation = useNavigation();
  const auth = getAuth();
  const [bubbles, setBubbles] = useState<Bubble[]>(createBubbles());
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const [rankLabels, setRankLabels] = useState<(string | null)[]>(Array(5).fill(null));
  const [isDisclaimerVisible, setIsDisclaimerVisible] = useState<boolean>(true);

  useEffect(() => {
    const gravityInterval = setInterval(() => applyGravity(), 50);
    const stopGravityTimeout = setTimeout(() => clearInterval(gravityInterval), 2000);

    return () => {
      clearInterval(gravityInterval);
      clearTimeout(stopGravityTimeout);
    };
  }, [bubbles]);

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

          return {
            ...bubble,
            x: bubble.x + dx,
            y: bubble.y + dy,
          };
        }
        return bubble;
      })
    );

    adjustNeighbors();
  };

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

  const assignRank = (bubbleId: string) => {
    if (!selectedRank) return;

    setBubbles((prevBubbles) =>
      prevBubbles.map((bubble) =>
        bubble.id === bubbleId
          ? { ...bubble, rank: selectedRank, size: 50 + selectedRank * 10 }
          : bubble.rank === selectedRank
          ? { ...bubble, rank: null, size: 50 }
          : bubble
      )
    );

    setRankLabels((prevLabels) => {
      const updatedLabels = [...prevLabels];
      const bubble = bubbles.find((b) => b.id === bubbleId);
      if (bubble) {
        updatedLabels[selectedRank - 1] = bubble.label;
      }
      return updatedLabels;
    });
  };

  const selectRank = (rank: number) => {
    setSelectedRank((prevRank) => (prevRank === rank ? null : rank));
  };

  const handleSubmitPreferences = async () => {
    const auth = getAuth();
    if (!auth.currentUser) return;

    try {
      // Gather final top categories from rankLabels
      // rankLabels is an array of length 5 with each category or "Unassigned"
      const finalRanks = rankLabels.filter(
        (label) => label && label !== "Unassigned"
      );

      // If you need exactly 5, ensure finalRanks.length === 5, or do nothing
      await saveProfileData(finalRanks);

      // Also set local "preferencesComplete" in AsyncStorage
      await markPreferencesComplete();

      // Navigate away
      router.push('/home');
    } catch (error) {
      console.error("Error submitting preferences:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Modal visible={isDisclaimerVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>
              Welcome! Ranking your preferences helps us personalize your
              experience. Don't worry—these can be updated later!
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setIsDisclaimerVisible(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Text style={styles.header}>Rank Your Preferences</Text>

      <View style={styles.rankContainer}>
        {Array.from({ length: 5 }).map((_, index) => (
          <View key={index + 1} style={styles.rankBoxContainer}>
            <TouchableOpacity
              style={[
                styles.rankBox,
                { backgroundColor: selectedRank === index + 1 ? themeColors.primary : "#FFFFFF" },
              ]}
              onPress={() => selectRank(index + 1)}
            >
              <Text
                style={[styles.rankBoxText, { color: selectedRank === index + 1 ? "#FFFFFF" : "#000000" }]}
              >
                {index + 1} Rank
              </Text>
            </TouchableOpacity>
            <Text style={styles.rankLabel}>{rankLabels[index] || "Unassigned"}</Text>
          </View>
        ))}
      </View>

      <View style={styles.bubblesContainer}>
        {bubbles.map((bubble) => (
          <TouchableOpacity
            key={bubble.id}
            style={[
              styles.bubble,
              {
                width: bubble.size,
                height: bubble.size,
                borderRadius: bubble.size / 2,
                transform: [{ translateX: bubble.x - width / 2 }, { translateY: bubble.y - height / 2.5 }],
                backgroundColor: bubble.rank ? themeColors.primary : themeColors.secondary,
              },
            ]}
            onPress={() => assignRank(bubble.id)}
          >
            <Text style={styles.bubbleText}>{bubble.label}{bubble.rank ? ` (${bubble.rank})` : ""}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmitPreferences}>
        <Text style={styles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ---------- STYLES ------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.bg,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalButton: {
    backgroundColor: "#F5A623",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: themeColors.white,
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalText: {
    fontSize: 16,
    color: "#0D1117",
    textAlign: "center",
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: themeColors.white,
    textAlign: "center",
    marginTop: 20,
  },
  bubblesContainer: {
    flex: 1,
    position: "relative", // Ensures all bubbles are positioned within this container
    justifyContent: "center",
    alignItems: "center",
  },
  bubble: {
    position: "absolute", // Ensures the bubbles move correctly in the container
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: themeColors.primary, // Teal background for bubbles
  },
  bubbleText: {
    color: themeColors.white,
    fontWeight: "bold",
  },
  rankContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  rankBoxContainer: {
    alignItems: "center",
  },
  rankBox: {
    width: width / 6,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: themeColors.primary, // Teal background
    borderColor: themeColors.primary, // Match border color with teal
  },
  rankBoxText: {
    fontWeight: "bold",
    fontSize: 14,
    color: themeColors.white, // White text for rank boxes
  },
  rankLabel: {
    color: themeColors.white,
    marginTop: 5,
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: themeColors.primary,
    padding: 15,
    borderRadius: 8,
    alignSelf: "center",
  },
  submitButtonText: {
    color: themeColors.white,
    fontWeight: "bold",
  },
});

