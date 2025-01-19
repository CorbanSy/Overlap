import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import WelcomeScreen from "./WelcomeScreen";
import HomeScreen from "./HomeScreen";
import LoginScreen from "./LoginScreen";
import SignUpScreen from "./SignUpScreen";
import PreferencesScreen from "./PreferencesScreen";
import MeetUpScreen from "./MeetUpScreen";
import SwipeScreen from "./SwipeScreen";
import useAuth from "../hooks/useAuth";

const Stack = createNativeStackNavigator();

export default function Layout() {
  const { user, preferencesCompleted, loading } = useAuth();

  // Show a loading screen while the authentication state is being checked
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={user ? (preferencesCompleted ? "Home" : "Preferences") : "Welcome"}
      screenOptions={({ route }) => ({
        animationTypeForReplace: "pop",
        animation: route.name === "Home" ? "slide_from_right" : "slide_from_left",
        headerShown: false,
      })}
    >
      {user ? (
        <>
          {!preferencesCompleted && (
            <Stack.Screen
              name="Preferences"
              component={PreferencesScreen}
              options={{ headerShown: false }}
            />
          )}
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              animation: "slide_from_left",
            }}
          />
          <Stack.Screen
            name="MeetUp"
            component={MeetUpScreen}
            options={{
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="SwipeScreen"
            component={SwipeScreen}
            options={{
              animation: "slide_from_right",
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
