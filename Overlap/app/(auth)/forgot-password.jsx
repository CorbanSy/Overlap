import React, { useState } from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '../../constants';
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { sendPasswordResetEmail } from 'firebase/auth';
import { FIREBASE_AUTH } from '../../FirebaseConfig';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(FIREBASE_AUTH, email);
      setSuccessMessage('Password reset email sent. Please check your inbox.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage('Failed to send reset email. Please check your email address.');
      setSuccessMessage('');
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View className='w-full justify-center h-full px-4 my-6'>
          <Text className='text-2xl text-white text-semibold mt-10 font-psemibold'>Forgot Password</Text>

          <FormField
            title="Email"
            value={email}
            handleChangeText={setEmail}
            otherStyles="mt-7"
            keyboardType="email-address"
          />

          {errorMessage ? (
            <Text className="text-red-500 text-sm mt-2">{errorMessage}</Text>
          ) : null}

          {successMessage ? (
            <Text className="text-green-500 text-sm mt-2">{successMessage}</Text>
          ) : null}

          <CustomButton
            title="Reset Password"
            handlePress={handleResetPassword}
            containerStyles="w-full mt-7"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default ForgotPassword;