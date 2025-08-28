// components/profile_components/ProfileListHeader.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import CollectionHeader from './headers/CollectionHeader';
import TabBar from '../TabBar'; // Direct import of TabBar
import SearchSection from './sections/SearchSection';
import AddCollectionSection from './sections/AddCollectionSection';
import { SharedCollection } from './profileTypes';

interface ProfileListHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedCollection: SharedCollection | null;
  onClearSelectedCollection: () => void;
  setIsModalVisible: (visible: boolean) => void;
  toggleSettingsMenu: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  resultCount: number;
}

const ProfileListHeader: React.FC<ProfileListHeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedCollection,
  onClearSelectedCollection,
  setIsModalVisible,
  toggleSettingsMenu,
  searchQuery,
  setSearchQuery,
  resultCount,
}) => {
  return (
    <View style={styles.headerContainer}>
      {/* Tab selector with animated TabBar component */}
      <View style={styles.tabBarContainer}>
        <TabBar 
          activeTab={activeTab} 
          onTabPress={setActiveTab} 
        />
      </View>
      
      {/* Search bar */}
      <SearchSection 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        resultCount={resultCount}
        activeTab={activeTab}
      />
      
      {/* Add Collection button - only show when on Collections tab and no collection selected */}
      {activeTab === 'Collections' && !selectedCollection && (
        <AddCollectionSection onPress={() => setIsModalVisible(true)} />
      )}
      
      {/* Collection header with back button - only show when a collection is selected */}
      {selectedCollection && (
        <CollectionHeader 
          selectedCollection={selectedCollection}
          onBackPress={onClearSelectedCollection}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingBottom: 16,
  },
  tabBarContainer: {
    marginBottom: 16,
  },
});

export default ProfileListHeader;