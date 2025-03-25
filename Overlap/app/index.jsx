import { View, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import images from '../constants/images';
import CustomButton from '../components/CustomButton';

export default function App() {
  return (
    <SafeAreaView className="bg-primary h-full">
      <View style={{ flex: 1 }}>
        {/* Display the PNG as a background image */}
        <Image
          source={images.overlap}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
          }}
          resizeMode="cover"
        />

        {/* Footer with button */}
        <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 20 }}>
          <CustomButton
            title="Start"
            handlePress={() => router.push('/sign-in')}
            containerStyles="w-[279px] mt-7"
          />
        </View>
      </View>
      <StatusBar backgroundColor="#161622" style="light" />
    </SafeAreaView>
  );
}
