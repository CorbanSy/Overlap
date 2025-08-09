// app/(tabs)/_layout.tsx
import { useEffect, useState } from "react";
import { Tabs, Redirect } from "expo-router";
import { PortalProvider } from '@gorhom/portal';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { checkPreferencesComplete } from "../../_utils/storage";

const TabsLayout = () => {
  const [loading, setLoading] = useState(true);
  const [needsPreferences, setNeedsPreferences] = useState(false);

  useEffect(() => {
    const verifyPreferences = async () => {
      const completed = await checkPreferencesComplete();
      setNeedsPreferences(!completed);
      setLoading(false);
    };
    verifyPreferences();
  }, []);

  if (loading) return null;
  if (needsPreferences) return <Redirect href="/(auth)/preferences" />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PortalProvider>
          <Tabs
            screenOptions={{
              tabBarShowLabel: true,
              tabBarActiveTintColor: "#FFA001",
              tabBarInactiveTintColor: "#CDCDE0",
              tabBarStyle: {
                backgroundColor: "#161622",
                borderTopWidth: 0,
                height: 80,
              },
            }}
          >
            <Tabs.Screen name="home" options={{ title: "Home", headerShown: false }} />
            <Tabs.Screen name="meetupHome" options={{ title: "Meetup", headerShown: false }} />
            <Tabs.Screen name="profile" options={{ title: "Profile", headerShown: false }} />
          </Tabs>
        </PortalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default TabsLayout;
