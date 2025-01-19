import { View, Text, TouchableOpacity, Image, StyleSheet, ImageBackground } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { themeColors } from "../theme";

export default function WelcomeScreen() {
  const navigation = useNavigation();

  return (
    <ImageBackground
      source={require("../assets/images/icons/emptywelcome.jpg")} // Path to your background image
      style={styles.backgroundImage}
      resizeMode="cover" // Adjust how the image is displayed (e.g., 'cover', 'contain', etc.)
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={() => navigation.navigate("SignUp")}
              style={styles.signUpButton}
            >
              <Text style={styles.signUpButtonText}>Sign Up</Text>
            </TouchableOpacity>

            <View style={styles.loginPromptContainer}>
              <Text style={styles.promptText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.loginLink}> Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1, // Makes the background image fill the screen
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "space-around",
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  headerText: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    color: "#FFFFFF",
    marginBottom: 20,
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  welcomeImage: {
    width: 300,
    height: 300,
  },
  buttonContainer: {
    marginTop: "auto",
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  signUpButton: {
    backgroundColor: "#34D399", 
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  signUpButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    color: "#FFFFFF", 
  },
  loginPromptContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  promptText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  loginLink: {
    fontSize: 14,
    color: "#10B981", 
    fontWeight: "bold",
  },
});
