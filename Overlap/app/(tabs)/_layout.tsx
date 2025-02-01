// app/(tabs)/_layout.tsx
import { useEffect, useState } from "react";
import { Tabs, Redirect } from "expo-router";
import { checkPreferencesComplete } from "../utils/storage"; // Adjust the path as needed

const TabsLayout = () => {
  const [loading, setLoading] = useState(true);
  const [needsPreferences, setNeedsPreferences] = useState(false);

  useEffect(() => {
    const verifyPreferences = async () => {
      const completed = await checkPreferencesComplete();
      // If the flag is not set (i.e. not complete), the user needs to complete preferences.
      setNeedsPreferences(!completed);
      setLoading(false);
    };

    verifyPreferences();
  }, []);

  if (loading) return null; // Optionally, show a loading indicator here

  // Redirect to the auth preferences screen if preferences are not complete.
  if (needsPreferences) return <Redirect href="/(auth)/preferences" />;

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#FFA001",
        tabBarInactiveTintColor: "#CDCDE0",
        tabBarStyle: {
          backgroundColor: "#161622",
          borderTopWidth: 1,
          borderTopColor: "#232533",
          height: 84,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="meetup"
        options={{
          title: "Meetup",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
        }}
      />
      {/* Include Preferences as a screen in the tabs for navigation if needed */}
      <Tabs.Screen
        name="preferences"
        options={{
          title: "Preferences",
          headerShown: false,
          tabBarStyle: { display: "none" }, // Hide tab bar on Preferences screen
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
