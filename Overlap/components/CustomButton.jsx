// components/CustomButton.jsx
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * Accepts either Tailwind strings or RN style objects/arrays.
 * - containerStyles: string | object | array
 * - textStyles: string | object | array
 */
export default function CustomButton({
  title,
  handlePress,
  containerStyles,
  textStyles,
  isLoading = false,
  disabled = false,
}) {
  const isObj = v => v && typeof v !== 'string';

  // If you still use NativeWind elsewhere, keep className for strings:
  const containerClass = typeof containerStyles === 'string' ? containerStyles : '';
  const textClass = typeof textStyles === 'string' ? textStyles : '';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      disabled={disabled || isLoading}
      className={containerClass}                       // tailwind path
      style={[
        styles.baseBtn,                                // default "buttony" look
        isObj(containerStyles) ? containerStyles : null, // RN style path
        (disabled || isLoading) && styles.disabled,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text
          className={textClass}                        // tailwind path
          style={[styles.baseText, isObj(textStyles) ? textStyles : null]} // RN style path
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseBtn: {
    backgroundColor: '#4dabf7', // nice blue default
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 280,
    alignItems: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  baseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  disabled: { opacity: 0.6 },
});
