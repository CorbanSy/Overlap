// preferences.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Modal,
  StyleSheet,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAuth } from "firebase/auth";
import { router } from 'expo-router';
import { markPreferencesComplete } from '../../_utils/storage/localStorage';
import { saveProfileData } from '../../_utils/storage/userProfile';
import { PLACE_CATEGORIES } from '../../_utils/placeCategories'; // single source

const { width } = Dimensions.get("window");

const themeColors = {
  bg: "#0D1117",
  primary: "#F5A623",
  white: "#FFFFFF",
  secondary: "#1B1F24",
};

export default function PreferencesScreen() {
  // Instead of an array, we now store only one selected category key.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isDisclaimerVisible, setIsDisclaimerVisible] = useState(true);

  const handleSelectCategory = (catKey: string) => {
    setSelectedKey(catKey);
  };

  const handleSubmitPreferences = async () => {
    const auth = getAuth();
    if (!auth.currentUser) return;
    if (!selectedKey) {
      console.warn("Please select a category.");
      return;
    }
    try {
      // Save the user’s selected category (as an array with one element)
      await saveProfileData({
        topCategories: [selectedKey]  // Only the topCategories field will be updated if the others are undefined.
      });
      await markPreferencesComplete();
      router.push("/home");
    } catch (error) {
      console.error("Error submitting preferences:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Disclaimer modal */}
      <Modal visible={isDisclaimerVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>
              Welcome! Choosing your top category helps us personalize your experience.
              You can update this later.
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

      <Text style={styles.header}>Select Your Top Category</Text>

      <FlatList
        data={PLACE_CATEGORIES}
        keyExtractor={(item) => item.key}
        numColumns={2}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => {
          const selected = selectedKey === item.key;
          return (
            <TouchableOpacity
              style={[styles.card, selected && styles.cardSelected]}
              onPress={() => handleSelectCategory(item.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.cardTitle}>{item.label}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={2}>
                {item.description}
              </Text>
              {selected && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.selectedIndicatorText}>Selected</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {selectedKey && (
        <View style={styles.selectedCategoriesContainer}>
          <Text style={styles.selectedHeader}>Your Selection:</Text>
          <View style={styles.selectedRow}>
            {(() => {
              const cat = PLACE_CATEGORIES.find((c) => c.key === selectedKey);
              return (
                <View key={selectedKey} style={styles.selectedBubble}>
                  <Text style={styles.selectedText}>{cat?.label}</Text>
                </View>
              );
            })()}
          </View>
        </View>
      )}

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
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
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
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: themeColors.white,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  grid: {
    paddingHorizontal: 10,
  },
  card: {
    flex: 1,
    backgroundColor: themeColors.secondary,
    margin: 8,
    borderRadius: 10,
    padding: 12,
    justifyContent: "center",
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: themeColors.primary,
  },
  cardTitle: {
    color: themeColors.white,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  cardSubtitle: {
    color: "#ccc",
    fontSize: 13,
  },
  selectedIndicator: {
    marginTop: 8,
    backgroundColor: themeColors.primary,
    borderRadius: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  selectedIndicatorText: {
    color: "#0D1117",
    fontSize: 12,
    fontWeight: "bold",
  },
  selectedCategoriesContainer: {
    borderTopWidth: 1,
    borderTopColor: themeColors.secondary,
    marginTop: 10,
    paddingVertical: 10,
  },
  selectedHeader: {
    color: themeColors.white,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  selectedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    padding: 10,
  },
  selectedBubble: {
    backgroundColor: themeColors.primary,
    padding: 8,
    borderRadius: 8,
    margin: 5,
  },
  selectedText: {
    color: themeColors.white,
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: themeColors.primary,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  submitButtonText: {
    color: themeColors.white,
    fontWeight: "bold",
    fontSize: 16,
  },
});
