import React, { useState } from "react";
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
import { markPreferencesComplete, savePreferences } from "../utils/storage"; // adjust the path as needed
import { router } from "expo-router";

const { width, height } = Dimensions.get("window");

// Define Theme Colors
const themeColors = {
  bg: "#0D1117",
  primary: "#F5A623",
  white: "#FFFFFF",
  secondary: "#1B1F24",
};

type Bubble = {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  rank: number | null;
};

const defaultBubbleSize = 100; // Increased size so text fits on one line

const activityLabels: string[] = [
  "Dining",
  "Fitness",
  "Outdoors",
  "Movies",
  "Gaming",
  "Social",
  "Music",
  "Shopping",
  "Travel",
  "Art",
  "Relaxing",
  "Learning",
  "Cooking",
  "Nightlife",
];

// Arrange bubbles in a circle (ferris wheel layout) in the top third of the screen
const createBubbles = (): Bubble[] => {
  const bubbles: Bubble[] = [];
  const centerX = width / 2;
  const centerY = height / 3;
  const circleRadius = Math.min(width, height) / 3;
  activityLabels.forEach((label, index) => {
    const angle = (index / activityLabels.length) * 2 * Math.PI;
    const x = centerX + Math.cos(angle) * circleRadius;
    const y = centerY + Math.sin(angle) * circleRadius;
    bubbles.push({ id: label, label, x, y, size: defaultBubbleSize, rank: null });
  });
  return bubbles;
};

export default function PreferencesScreen() {
  const navigation = useNavigation();
  const auth = getAuth();
  const [bubbles, setBubbles] = useState<Bubble[]>(createBubbles());
  const [isDisclaimerVisible, setIsDisclaimerVisible] = useState<boolean>(true);

  // Toggle selection state: change color and update rank ordering
  const toggleSelection = (bubbleId: string) => {
    setBubbles((prevBubbles) => {
      const bubble = prevBubbles.find((b) => b.id === bubbleId);
      if (!bubble) return prevBubbles;
      const isSelected = bubble.rank !== null;
      if (isSelected) {
        // Deselect the bubble
        const updatedBubbles = prevBubbles.map((b) =>
          b.id === bubbleId ? { ...b, rank: null } : b
        );
        // Reassign ranks for the remaining selections
        const selected = updatedBubbles
          .filter((b) => b.rank !== null)
          .sort((a, b) => (a.rank as number) - (b.rank as number));
        return updatedBubbles.map((b) => {
          if (b.rank !== null) {
            const newRank = selected.findIndex((item) => item.id === b.id) + 1;
            return { ...b, rank: newRank };
          }
          return b;
        });
      } else {
        // If not selected, add it if fewer than 5 are already selected
        const selectedCount = prevBubbles.filter((b) => b.rank !== null).length;
        if (selectedCount >= 5) {
          return prevBubbles;
        }
        const newRank = selectedCount + 1;
        return prevBubbles.map((b) =>
          b.id === bubbleId ? { ...b, rank: newRank } : b
        );
      }
    });
  };

  const handleSubmitPreferences = async () => {
    const auth = getAuth();
    if (!auth.currentUser) return;
    try {
      // Gather selected bubble labels in order
      const finalRanks = bubbles
        .filter((b) => b.rank !== null)
        .sort((a, b) => (a.rank as number) - (b.rank as number))
        .map((b) => b.label);

      await savePreferences(finalRanks);
      await markPreferencesComplete();
      router.push("/home");
    } catch (error) {
      console.error("Error submitting preferences:", error);
    }
  };

  // Get selected bubbles sorted by rank for display
  const selectedBubbles = bubbles
    .filter((b) => b.rank !== null)
    .sort((a, b) => (a.rank as number) - (b.rank as number));

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

      <Text style={styles.header}>Select Your Top 5 Preferences</Text>

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
                top: bubble.y - bubble.size / 2,
                left: bubble.x - bubble.size / 2,
                backgroundColor: bubble.rank ? themeColors.primary : themeColors.secondary,
              },
            ]}
            onPress={() => toggleSelection(bubble.id)}
          >
            <Text style={styles.bubbleText}>
              {bubble.label} {bubble.rank ? `(${bubble.rank})` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.selectedContainer}>
        <Text style={styles.selectedHeader}>Your Selections:</Text>
        <View style={styles.selectionRows}>
          <View style={styles.selectionRow}>
            {selectedBubbles.slice(0, 3).map((bubble) => (
              <View key={bubble.id} style={styles.selectedBubble}>
                <Text style={styles.selectedText}>
                  {bubble.rank}. {bubble.label}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.selectionRow}>
            {selectedBubbles.slice(3, 5).map((bubble) => (
              <View key={bubble.id} style={styles.selectedBubble}>
                <Text style={styles.selectedText}>
                  {bubble.rank}. {bubble.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmitPreferences}>
        <Text style={styles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.bg,
    padding: 20,
    justifyContent: "space-between",
  },
  modalButton: {
    backgroundColor: themeColors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  modalButtonText: {
    color: themeColors.white,
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
    marginVertical: 10,
  },
  bubblesContainer: {
    flex: 1,
    position: "relative",
  },
  bubble: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  bubbleText: {
    color: themeColors.white,
    fontWeight: "bold",
    textAlign: "center",
  },
  selectedContainer: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: themeColors.secondary,
  },
  selectedHeader: {
    color: themeColors.white,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  selectionRows: {
    flexDirection: "column",
    alignItems: "center",
  },
  selectionRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 5,
  },
  selectedBubble: {
    backgroundColor: themeColors.primary,
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  selectedText: {
    color: themeColors.white,
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: themeColors.primary,
    padding: 15,
    borderRadius: 8,
    alignSelf: "center",
    marginVertical: 10,
  },
  submitButtonText: {
    color: themeColors.white,
    fontWeight: "bold",
  },
});
