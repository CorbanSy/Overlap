import React, { useState } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import Swiper from "react-native-deck-swiper";
import { themeColors } from "../theme";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

// Example activity data
const activities = [
  { id: 1, name: "Bowling", description: "Enjoy a fun game of bowling!" },
  { id: 2, name: "Beach Day", description: "Relax and soak up the sun at the beach." },
  { id: 3, name: "Hiking", description: "Explore the great outdoors with a scenic hike." },
  { id: 4, name: "Movie Night", description: "Watch the latest blockbuster with friends." },
  { id: 5, name: "Board Games", description: "Challenge your friends to classic board games." },
];

export default function SwipeScreen({ navigation }) {
  const [cardIndex, setCardIndex] = useState(0);

  // Handle swipe actions
  const onSwipeRight = (card) => {
    console.log("Liked:", card.name);
    // Save the liked activity or perform an action
  };

  const onSwipeLeft = (card) => {
    console.log("Disliked:", card.name);
    // Save the disliked activity or perform an action
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Swipe to Choose an Activity</Text>

      <Swiper
        cards={activities}
        renderCard={(card) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{card.name}</Text>
            <Text style={styles.cardDescription}>{card.description}</Text>
          </View>
        )}
        onSwipedRight={(index) => onSwipeRight(activities[index])}
        onSwipedLeft={(index) => onSwipeLeft(activities[index])}
        cardIndex={cardIndex}
        backgroundColor={themeColors.bg}
        stackSize={3}
        infinite={true}
      />

      {/* Action Toolbar */}
      <View style={styles.actionToolbar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => console.log("Swiped Left")}
        >
          <Ionicons name="close" size={36} color={themeColors.secondary} />
          <Text style={styles.actionText}>Dislike</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => console.log("Swiped Right")}
        >
          <Ionicons name="heart" size={36} color={themeColors.primary} />
          <Text style={styles.actionText}>Like</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Toolbar */}
      <View style={styles.navigationToolbar}>
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="home" size={24} color={themeColors.white} />
          <Text style={styles.navigationText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={() => navigation.navigate("MeetUp")}
        >
          <Ionicons name="calendar" size={24} color={themeColors.white} />
          <Text style={styles.navigationText}>Meet Up</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={() => navigation.navigate("Friends")}
        >
          <Ionicons name="people" size={24} color={themeColors.white} />
          <Text style={styles.navigationText}>Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={() => navigation.navigate("Profile")}
        >
          <Ionicons name="person" size={24} color={themeColors.white} />
          <Text style={styles.navigationText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.bg,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: themeColors.white,
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: themeColors.primary,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    padding: 20,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: themeColors.white,
    marginBottom: 10,
  },
  cardDescription: {
    fontSize: 16,
    color: themeColors.white,
    textAlign: "center",
  },
  actionToolbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
    backgroundColor: themeColors.bg,
  },
  actionButton: {
    alignItems: "center",
  },
  actionText: {
    color: themeColors.white,
    fontSize: 14,
    marginTop: 5,
  },
  navigationToolbar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: themeColors.primary,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navigationButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  navigationText: {
    color: themeColors.white,
    fontSize: 12,
    marginTop: 5,
  },
});
