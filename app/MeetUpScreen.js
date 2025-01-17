import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { themeColors } from "../theme";
import styles from "../styles/MeetUpStyles";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

// Dropdown options for categories and moods
const categories = [
  { label: "Dining", value: "Dining" },
  { label: "Fitness", value: "Fitness" },
  { label: "Outdoors", value: "Outdoors" },
  { label: "Movies", value: "Movies" },
  { label: "Gaming", value: "Gaming" },
  { label: "Social", value: "Social" },
  { label: "Music", value: "Music" },
  { label: "Shopping", value: "Shopping" },
  { label: "Travel", value: "Travel" },
  { label: "Art", value: "Art" },
  { label: "Relaxing", value: "Relaxing" },
  { label: "Learning", value: "Learning" },
  { label: "Cooking", value: "Cooking" },
  { label: "Nightlife", value: "Nightlife" },
];

const moods = [
  { label: "Excited", value: "Excited" },
  { label: "Chill", value: "Chill" },
  { label: "Adventurous", value: "Adventurous" },
  { label: "Energetic", value: "Energetic" },
  { label: "Happy", value: "Happy" },
  { label: "Romantic", value: "Romantic" },
  { label: "Creative", value: "Creative" },
  { label: "Focused", value: "Focused" },
  { label: "Playful", value: "Playful" },
  { label: "Social", value: "Social" },
  { label: "Curious", value: "Curious" },
  { label: "Relaxed", value: "Relaxed" },
];

export default function MeetUpScreen({ navigation }) {
  const [eventTitle, setEventTitle] = useState(""); // New state for event title
  const [eventName, setEventName] = useState("");
  const [description, setDescription] = useState("");

  // Dropdown state management
  const [category, setCategory] = useState(null);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const [mood, setMood] = useState(null);
  const [moodOpen, setMoodOpen] = useState(false);

  const handleCreateMeetup = () => {
    console.log("Meetup Created:", { eventTitle, eventName, description, mood, category });
    navigation.navigate("SwipeScreen");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Meet Up</Text>

      {/* Create a Meetup Section */}
      <View style={styles.createMeetupSection}>
        <Text style={styles.sectionHeader}>Create a Meetup</Text>
        <TextInput
          style={styles.input}
          placeholder="Event Title"
          placeholderTextColor="#9CA3AF"
          value={eventTitle}
          onChangeText={setEventTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Event Name"
          placeholderTextColor="#9CA3AF"
          value={eventName}
          onChangeText={setEventName}
        />
        <TextInput
          style={styles.input}
          placeholder="Description"
          placeholderTextColor="#9CA3AF"
          value={description}
          onChangeText={setDescription}
        />

        {/* Mood Dropdown */}
        <Text style={styles.dropdownLabel}>Mood</Text>
        <DropDownPicker
          open={moodOpen}
          value={mood}
          items={moods}
          setOpen={setMoodOpen}
          setValue={setMood}
          placeholder="Select a Mood"
          containerStyle={styles.dropdownContainer}
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownBox}
        />

        {/* Category Dropdown */}
        <Text style={styles.dropdownLabel}>Category</Text>
        <DropDownPicker
          open={categoryOpen}
          value={category}
          items={categories}
          setOpen={setCategoryOpen}
          setValue={setCategory}
          placeholder="Select a Category"
          containerStyle={styles.dropdownContainer}
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownBox}
        />

        <TouchableOpacity style={styles.createButton} onPress={handleCreateMeetup}>
          <Text style={styles.createButtonText}>Create Meetup</Text>
        </TouchableOpacity>
      </View>

      {/* Join a Meetup Section */}
      <View style={styles.joinMeetupSection}>
        <Text style={styles.sectionHeader}>Join a Meetup</Text>
        <TextInput
          style={styles.input}
          placeholder="Search Meetups"
          placeholderTextColor="#9CA3AF"
        />
        <View style={styles.meetupList}>
          <Text style={styles.meetupItem}>Meetup 1 - Short Description</Text>
          <Text style={styles.meetupItem}>Meetup 2 - Short Description</Text>
          <Text style={styles.meetupItem}>Meetup 3 - Short Description</Text>
        </View>
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
