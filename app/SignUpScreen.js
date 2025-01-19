import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Image,
  StyleSheet,
  ImageBackground,
} from "react-native";
import { themeColors } from "../theme";
import { ArrowLeftIcon } from "react-native-heroicons/solid";
import { useNavigation } from "@react-navigation/native";
import { auth } from "../config/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import styles from "../styles/SignUpStyles";

export default function SignUpScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async () => {
    if (email && password) {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        navigation.navigate("Preferences"); // Navigate to Preferences after sign-up
      } catch (err) {
        console.log("got error: ", err.message);
      }
    }
  };
  

  return (
    <ImageBackground
      source={require("../assets/images/icons/emptywelcome.jpg")} // Background image path
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        {/* Back Button */}
        <View style={styles.backButtonContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ArrowLeftIcon size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Name"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(value) => setEmail(value)}
              placeholder="Enter Email"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(value) => setPassword(value)}
              placeholder="Enter Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Or Divider */}
          <Text style={styles.orText}>Or</Text>

          {/* Social Media Buttons */}
          <View style={styles.socialMediaContainer}>
            <TouchableOpacity style={styles.socialButton}>
              <Image
                source={require("../assets/images/icons/google.jpg")}
                style={styles.socialIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Image
                source={require("../assets/images/icons/apple.png")}
                style={styles.socialIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Image
                source={require("../assets/images/icons/facebook.jpg")}
                style={styles.socialIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Login Prompt */}
          <View style={styles.loginPromptContainer}>
            <Text style={styles.promptText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.loginLink}> Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
