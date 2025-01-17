import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons"; // For icons
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { themeColors } from "../theme";
import styles from "../styles/HomeStyles";

const { width } = Dimensions.get("window");

// Dummy data for carousel
const topPicks = [
  { id: 1, title: "Movie Night", image: require("../assets/images/activity1.jpg") },
  { id: 2, title: "Morning Hike", image: require("../assets/images/activity2.jpg") },
  { id: 3, title: "Gaming Session", image: require("../assets/images/activity3.jpg") },
];

const trendingNearYou = [
  { id: 1, title: "Jazz Festival at Central Park", image: require("../assets/images/trending1.jpg") },
  { id: 2, title: "Discount Bowling Night", image: require("../assets/images/trending2.jpg") },
  { id: 3, title: "Art Exhibition", image: require("../assets/images/trending3.jpg") },
];

export default function HomeScreen({ navigation }) {
  const [currentTopPick, setCurrentTopPick] = useState(0);
  const [currentTrending, setCurrentTrending] = useState(0);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User logged out");
      navigation.navigate("Welcome");
    } catch (err) {
      console.error("Logout failed: ", err.message);
    }
  };

  const confirmMeetupCreation = (eventTitle) => {
    Alert.alert(
      "Create Meetup",
      `Would you like to create a meetup for "${eventTitle}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: () => navigation.navigate("MeetUp", { eventTitle }),
        },
      ]
    );
  };

  const renderCarousel = (data, currentIndex, setCurrentIndex) => (
    <FlatList
      data={data}
      horizontal
      showsHorizontalScrollIndicator={false}
      pagingEnabled
      onScroll={(event) => {
        const scrollPosition = Math.round(event.nativeEvent.contentOffset.x / width);
        setCurrentIndex(scrollPosition);
      }}
      renderItem={({ item, index }) => (
        <TouchableOpacity
          style={[styles.carouselItem, index === currentIndex && styles.activeItem]}
          onPress={() => confirmMeetupCreation(item.title)}
        >
          <Image source={item.image} style={styles.carouselImage} />
          <Text style={styles.carouselText}>{item.title}</Text>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id.toString()}
    />
  );

  const renderIndicator = (data, currentIndex) => (
    <View style={styles.indicatorContainer}>
      {data.map((_, index) => (
        <View
          key={index}
          style={[
            styles.indicator,
            { backgroundColor: index === currentIndex ? themeColors.secondary : themeColors.white },
          ]}
        />
      ))}
    </View>
  );

  const renderList = (data) =>
    data.map((item, index) => (
      <Text key={item.id} style={styles.listText}>
        {item.title}
        {index < data.length - 1 && ", "}
      </Text>
    ));

  return (
    <SafeAreaView style={styles.container}>
      {/* Mail Icon */}
      <TouchableOpacity style={styles.mailIcon}>
        <Ionicons name="mail" size={24} color={themeColors.white} />
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutIcon} onPress={handleLogout}>
        <Ionicons name="log-out" size={24} color={themeColors.white} />
      </TouchableOpacity>

      <ScrollView>
        {/* Top Picks Section */}
        <Text style={styles.header}>Today's Top Picks</Text>
        <View style={styles.listContainer}>
          <Text style={styles.listRow}>{renderList(topPicks)}</Text>
        </View>
        {renderCarousel(topPicks, currentTopPick, setCurrentTopPick)}
        {renderIndicator(topPicks, currentTopPick)}

        {/* Trending Section */}
        <Text style={styles.header}>Trending Near You</Text>
        <View style={styles.listContainer}>
          <Text style={styles.listRow}>{renderList(trendingNearYou)}</Text>
        </View>
        {renderCarousel(trendingNearYou, currentTrending, setCurrentTrending)}
        {renderIndicator(trendingNearYou, currentTrending)}
      </ScrollView>

      {/* AI Bot */}
      <TouchableOpacity style={styles.aiBot}>
        <Text style={styles.aiBotText}>AI</Text>
      </TouchableOpacity>
      <Text style={styles.aiBotMessage}>Hi, I'm Erica. How can I help you?</Text>

      {/* Bottom Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="home" size={24} color={themeColors.white} />
          <Text style={styles.toolbarText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => navigation.navigate("MeetUp")}
        >
          <Ionicons name="calendar" size={24} color={themeColors.white} />
          <Text style={styles.toolbarText}>Meet Up</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => navigation.navigate("Friends")}
        >
          <Ionicons name="people" size={24} color={themeColors.white} />
          <Text style={styles.toolbarText}>Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => navigation.navigate("Profile")}
        >
          <Ionicons name="person" size={24} color={themeColors.white} />
          <Text style={styles.toolbarText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}