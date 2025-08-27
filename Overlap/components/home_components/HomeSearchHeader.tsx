// components/home_components/HomeSearchHeader.tsx (Enhanced)
import React, { useState, useCallback, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Keyboard, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HomeSearchHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  editable?: boolean;
}

export default function HomeSearchHeader({ 
  searchQuery, 
  onSearchChange,
  onClearSearch,
  placeholder = "Search places...",
  autoFocus = false,
  editable = true
}: HomeSearchHeaderProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleClear = useCallback(() => {
    onSearchChange('');
    onClearSearch?.();
    
    // Animate the clear button
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Keep focus on input after clearing
    if (inputRef.current && isFocused) {
      inputRef.current.focus();
    }
  }, [onSearchChange, onClearSearch, scaleAnim, isFocused]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleSubmit = useCallback(() => {
    // Dismiss keyboard when user presses search
    Keyboard.dismiss();
    inputRef.current?.blur();
  }, []);

  return (
    <View style={styles.header}>
      <View style={[
        styles.searchContainer,
        isFocused && styles.searchContainerFocused,
        !editable && styles.searchContainerDisabled
      ]}>
        <Ionicons 
          name="search" 
          size={20} 
          color={isFocused ? "#F5A623" : "#666"} 
          style={styles.searchIcon} 
        />
        
        <TextInput
          ref={inputRef}
          style={[
            styles.searchInput,
            isFocused && styles.searchInputFocused,
            !editable && styles.searchInputDisabled
          ]}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={onSearchChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          autoFocus={autoFocus}
          editable={editable}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never" // We handle this manually
          blurOnSubmit={true}
        />
        
        {searchQuery.length > 0 && (
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity 
              onPress={handleClear}
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.6}
            >
              <Ionicons 
                name="close-circle" 
                size={18} 
                color={isFocused ? "#F5A623" : "#666"} 
              />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0D1117',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 2,
    minHeight: 44,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchContainerFocused: {
    borderColor: '#F5A623',
    shadowColor: '#F5A623',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  searchContainerDisabled: {
    backgroundColor: '#F5F5F5',
    opacity: 0.7,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#0D1117',
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  searchInputFocused: {
    // Additional focused styles if needed
  },
  searchInputDisabled: {
    color: '#999',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 12,
  },
});