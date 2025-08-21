// components/profile_components/ProfileListHeader.tsx - UPDATED
import React from 'react';
import { View, StyleSheet } from 'react-native';
import CollectionHeader from './headers/CollectionHeader';
import TabSection from './sections/TabSection';
import SearchSection from './sections/SearchSection';
import AddCollectionSection from './sections/AddCollectionSection';

interface Collection {
  title: string;
  activities?: any[];
}

interface ProfileListHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedCollection: Collection | null;
  onClearSelectedCollection: () => void;
  setIsModalVisible: (visible: boolean) => void;
  toggleSettingsMenu: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
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
}) => {
  return (
    <View style={styles.headerContainer}>
      {/* ProfileHeader is now integrated directly in profile.tsx */}
      
      {/* Tab selector (Liked Activities / Collections) */}
      <TabSection 
        activeTab={activeTab} 
        onTabPress={setActiveTab} 
      />
      
      {/* Search bar */}
      <SearchSection 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
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
});

export default ProfileListHeader;