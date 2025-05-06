// app/profile/_layout.tsx
import { Stack, Slot } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack
      // this turns *off* the RN-Nav header for everything inside this Stack
      screenOptions={{ headerShown: false }}
    >
      {/* this is where your index.tsx, friends.tsx, etc get rendered */}
      <Slot />
    </Stack>
  );
}
