import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { icons } from '../constants';

export default function FormField({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles,                 // string | object | array
  inputTextColor = '#fff',
  placeholderTextColor = '#9aa0a6',
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'none',
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = title?.toLowerCase() === 'password' || secureTextEntry;

  const tailwind = typeof otherStyles === 'string' ? { /* ignored by RN */ } : undefined;
  const extraStyle = typeof otherStyles !== 'string' ? otherStyles : undefined;

  return (
    <View style={extraStyle}>
      {title ? <Text style={styles.label}>{title}</Text> : null}

      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { color: inputTextColor }]}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={isPassword && !showPassword}
          multiline={false}
          numberOfLines={1}
          textAlignVertical="center"
        />

        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(s => !s)} activeOpacity={0.8} style={styles.eyeBtn}>
            <Image source={!showPassword ? icons.eye : icons.eyehide} style={styles.eyeIcon} resizeMode="contain" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: '#fff',
    fontSize: 16,        // bigger label
    fontWeight: '600',
    marginBottom: 8,
  },
  inputRow: {
    height: 56,
    backgroundColor: '#1f1f24',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  eyeBtn: { paddingHorizontal: 4, height: '100%', justifyContent: 'center' },
  eyeIcon: { width: 22, height: 22 },
});
