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
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#FFA001",
        tabBarInactiveTintColor: "#CDCDE0",
        tabBarStyle: {
          backgroundColor: "#161622",
          borderTopWidth: 0,
          borderTopColor: '#161622',
          height: 80,
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
    </Tabs>
  );
};

export default TabsLayout;
