// app/(tabs)/_layout.tsx
import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Tabs, Redirect } from "expo-router";
import { PortalProvider } from "@gorhom/portal";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";            // ← add this
import { checkPreferencesComplete } from "../../_utils/storage/localStorage";
import VennLoader from "../../components/vennloader";

const ICONS = {
  home:        { focused: "home",          unfocused: "home-outline" },
  meetupHome:  { focused: "people",        unfocused: "people-outline" },
  profile:     { focused: "person-circle", unfocused: "person-outline" },
} as const;

const TabsLayout = () => {
  const [loading, setLoading] = useState(true);
  const [needsPreferences, setNeedsPreferences] = useState(false);

  useEffect(() => {
    (async () => {
      const completed = await checkPreferencesComplete();
      setNeedsPreferences(!completed);
      setLoading(false);
    })();
  }, []);

  if (!loading && needsPreferences) return <Redirect href="/(auth)/preferences" />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PortalProvider>
          <View style={{ flex: 1 }}>
            {loading ? (
              <View style={styles.overlay}>
                <VennLoader size={140} />
              </View>
            ) : (
              <Tabs
                screenOptions={({ route }) => {
                  const key = route.name as keyof typeof ICONS;
                  const icons = ICONS[key] ?? ICONS.home;
                  return {
                    tabBarShowLabel: true,
                    tabBarActiveTintColor: "#FFA001",
                    tabBarInactiveTintColor: "#CDCDE0",
                    tabBarStyle: {
                      backgroundColor: "#161622",
                      borderTopWidth: 0,
                      height: 80,
                    },
                    tabBarIcon: ({ focused, color, size }) => (
                      <Ionicons
                        name={(focused ? icons.focused : icons.unfocused) as any}
                        size={size ?? 24}
                        color={color}
                      />
                    ),
                  };
                }}
              >
                <Tabs.Screen name="home"       options={{ title: "Home",   headerShown: false }} />
                <Tabs.Screen name="meetupHome" options={{ title: "Meetup", headerShown: false }} />
                <Tabs.Screen name="profile"    options={{ title: "Profile",headerShown: false }} />
              </Tabs>
            )}
          </View>
        </PortalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0D1117",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
});

export default TabsLayout;
