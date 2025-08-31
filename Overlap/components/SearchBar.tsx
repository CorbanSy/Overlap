// components/SearchBar.tsx - Enhanced version of your original
import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  placeholder?: string;
  showResultCount?: boolean;
  resultCount?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  searchQuery, 
  setSearchQuery,
  placeholder = "Search...",
  showResultCount = false,
  resultCount = 0
}) => {
  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearSearch}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={18} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Result counter */}
      {showResultCount && searchQuery.length > 0 && (
        <View style={styles.resultCounter}>
          <Text style={styles.resultCountText}>
            {resultCount === 0 
              ? 'No results found' 
              : `${resultCount} result${resultCount !== 1 ? 's' : ''}`
            }
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container for the entire search component
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22272E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginHorizontal: 0,
    marginVertical: 6,
  },
  searchIcon: { 
    marginRight: 8 
  },
  searchInput: { 
    flex: 1, 
    fontSize: 16, 
    color: '#FFFFFF' 
  },
  clearButton: {
    marginLeft: 8,
    padding: 2,
  },
  resultCounter: {
    paddingHorizontal: 26,
    paddingBottom: 5,
  },
  resultCountText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
});

export default SearchBar;