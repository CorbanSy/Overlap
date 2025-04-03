import { Stack } from 'expo-router';

export default function MeetupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal', // This makes the screen present modally
      }}
    >
      {/* All screens inside the meetup folder will present as modals */}
    </Stack>
  );
}
