import { View, Text, ScrollView, Image } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link, router } from 'expo-router'

import { images } from '../../constants'
import FormField from '../../components/FormField'
import CustomButton from '../../components/CustomButton'
import { signUp } from './auth'

const SignUp = () => {
  const [form, setform] = useState({
    username:'',
    email: '',
    password: ''
  })

  const handleSignUp = async () => {
    try {
      await signUp(form.email, form.password);
      // Navigate to the home screen or any other screen after successful sign-up
      router.push('/home');
    } catch (error) {
      console.error(error);
      // Handle error (e.g., show an error message to the user)
    }
  };
  const [isSubmitting, setIsSubmitting] = useState(false)


  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View className='w-full justify-center min-h-[83vh] px-4 my-6'>
            <Text className='text-4xl text-white text-semibold mt-10 font-psemibold'>Sign up to Overlap</Text>

            <FormField 
              title="Username"
              value={form.username}
              handleChangeText={(e) => setform({...form, username: e})}
              otherStyles="mt-10"
            />

            <FormField 
              title="Email"
              value={form.email}
              handleChangeText={(e) => setform({...form, email: e})}
              otherStyles="mt-7"
              keyboardType="email-address"
            />

            <FormField 
              title="Password"
              value={form.password}
              handleChangeText={(e) => setform({...form, password: e})}
              otherStyles="mt-7"
            />

            <CustomButton 
              title={'Sign Up'}
              handlePress={handleSignUp}
              containerStyles="mt-7"
              isLoading={isSubmitting}
            />

            <View className="justify-center pt-5 flex-row gap-2" >
              <Text className="text-lg text-gray-100 font-pregular">
                Have an account already?
              </Text>
              <Link href="/sign-in" className='text-lg font-psemibold text-secondary'>Sign In</Link>
            </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default SignUp