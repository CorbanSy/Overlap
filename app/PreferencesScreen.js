import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
} from "react-native";
import { themeColors } from "../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { auth } from "../config/firebase";
import { savePreferencesCompletion } from "../utils/firestoreHelpers";
import styles from "../styles/PreferencesStyles";

const { width, height } = Dimensions.get("window");

// Initial activity labels
const activityLabels = [
  "Dining", "Fitness", "Outdoors", "Movies", "Gaming", "Social", "Music",
  "Shopping", "Travel", "Art", "Relaxing", "Learning", "Cooking", "Nightlife",
];

// Create initial bubbles with a spiral layout
const createBubbles = () => {
  const bubbles = [];
  const centerX = width / 2;
  const centerY = height / 2.5;
  let currentDistance = 50; // Distance from center for the first bubble
  let currentAngle = 0;
  const angleStep = (2 * Math.PI) / 10; // Adjust for fewer overlapping bubbles

  activityLabels.forEach((label) => {
    const x = centerX + Math.cos(currentAngle) * currentDistance;
    const y = centerY + Math.sin(currentAngle) * currentDistance;
    const radius = 50;

    bubbles.push({ id: label, label, x, y, size: radius, rank: null });

    currentAngle += angleStep;
    if (currentAngle >= 2 * Math.PI) {
      currentAngle = 0;
      currentDistance += 70; // Increase distance for the next layer
    }
  });

  return bubbles;
};

export default function PreferencesScreen() {
  const navigation = useNavigation();
  const [bubbles, setBubbles] = useState(createBubbles());
  const [selectedRank, setSelectedRank] = useState(null);
  const [rankLabels, setRankLabels] = useState(Array(5).fill(null));
  const [isDisclaimerVisible, setIsDisclaimerVisible] = useState(true);

  useEffect(() => {
    const gravityInterval = setInterval(() => applyGravity(), 50);
    const stopGravityTimeout = setTimeout(
      () => clearInterval(gravityInterval),
      2000
    );

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

  const assignRank = (bubbleId) => {
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
        if (prevLabels[selectedRank - 1] === bubble.label) {
          updatedLabels[selectedRank - 1] = null;
        } else {
          updatedLabels[selectedRank - 1] = bubble.label;
        }
      }
      return updatedLabels;
    });
  };

  const selectRank = (rank) => {
    setSelectedRank((prevRank) => (prevRank === rank ? null : rank));
  };

  const handleSubmitPreferences = async () => {
    try {
      await savePreferencesCompletion(auth.currentUser.uid);
      navigation.navigate("Home");
    } catch (error) {
      console.error("Error submitting preferences:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        visible={isDisclaimerVisible}
        transparent={true}
        animationType="fade"
      >
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
                {
                  backgroundColor:
                    selectedRank === index + 1
                      ? themeColors.primary
                      : "#FFFFFF",
                },
              ]}
              onPress={() => selectRank(index + 1)}
            >
              <Text
                style={[
                  styles.rankBoxText,
                  {
                    color: selectedRank === index + 1 ? "#FFFFFF" : "#000000",
                  },
                ]}
              >
                {index + 1} Rank
              </Text>
            </TouchableOpacity>
            <Text style={styles.rankLabel}>
              {rankLabels[index] || "Unassigned"}
            </Text>
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
                transform: [
                  { translateX: bubble.x - width / 2 },
                  { translateY: bubble.y - height / 2.5 },
                ],
                backgroundColor: bubble.rank
                  ? themeColors.primary
                  : themeColors.secondary,
              },
            ]}
            onPress={() => assignRank(bubble.id)}
          >
            <Text style={styles.bubbleText}>
              {bubble.label}
              {bubble.rank ? ` (${bubble.rank})` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmitPreferences}
      >
        <Text style={styles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}