import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { Tabs, Redirect } from "expo-router";

const auth = getAuth();
const firestore = getFirestore();

const TabsLayout = () => {
  const [loading, setLoading] = useState(true);
  const [needsPreferences, setNeedsPreferences] = useState(false);

  useEffect(() => {
    const checkPreferences = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(firestore, "preferences", user.uid);
        const docSnap = await getDoc(docRef);

        // If user has no preferences, setNeedsPreferences to true
        setNeedsPreferences(!docSnap.exists());
      }
      setLoading(false);
    };

    checkPreferences();
  }, []);

  if (loading) return null; // Prevent flickering during auth check

  // ✅ Correct Redirect to Preferences inside (tabs)
  if (needsPreferences) return <Redirect href="/(tabs)/preferences" />;

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
      {/* ✅ Add Preferences to Tabs Navigation */}
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
