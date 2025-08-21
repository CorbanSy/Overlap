// components/profile_components/sections/SearchSection.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import SearchBar from '../../SearchBar';

interface SearchSectionProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const SearchSection: React.FC<SearchSectionProps> = ({
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <View style={styles.searchSection}>
      <SearchBar 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  searchSection: {
    marginBottom: 16,
  },
});

export default SearchSection;