// components/home_components/HomePlacesList.tsx
import React, { forwardRef, useCallback } from 'react';
import { FlatList, ActivityIndicator, RefreshControl, StyleSheet, View, Text } from 'react-native';
import PlaceCard from './PlaceCard';
import ExploreMoreCard from './ExploreMoreCard';
import { PLACE_CATEGORIES } from '../../_utils/placeCategories';

interface UserLocation {
  lat: number;
  lng: number;
}

interface Place {
  id: string;
  name: string;
  rating: number;
  userRatingsTotal: number;
  photos?: string[];
  types?: string[];
  location: UserLocation;
  liked?: boolean;
  saved?: boolean;
}

interface ExploreMoreItem {
  _type: 'exploreMoreCard';
  key: string;
}

// Create a proper discriminated union type
type ListItem = Place | ExploreMoreItem;

// Type guard functions to help TypeScript understand the union
const isExploreMoreCard = (item: ListItem): item is ExploreMoreItem => {
  return '_type' in item && item._type === 'exploreMoreCard';
};

const isPlace = (item: ListItem): item is Place => {
  return 'id' in item && !('_type' in item);
};

interface HomePlacesListProps {
  data: ListItem[];
  loading: boolean;
  refreshing: boolean;
  userLocation: UserLocation | null;
  currentCategory: string;
  onRefresh: () => void;
  onPlacePress: (placeId: string) => void;
  onLikePress: (place: Place) => void;
  onSavePress: (place: Place) => void;
  onCategoryPress: (category: string) => void;
  onSubCategoryPress?: (subcategory: string) => void;
  getDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
  // Performance optimization props
  removeClippedSubviews?: boolean;
  maxToRenderPerBatch?: number;
  windowSize?: number;
  initialNumToRender?: number;
}

const HomePlacesList = forwardRef<FlatList<ListItem>, HomePlacesListProps>(
  ({
    data,
    loading,
    refreshing,
    userLocation,
    currentCategory,
    onRefresh,
    onPlacePress,
    onLikePress,
    onSavePress,
    onCategoryPress,
    onSubCategoryPress,
    getDistance,
    // Performance defaults
    removeClippedSubviews = true,
    maxToRenderPerBatch = 10,
    windowSize = 10,
    initialNumToRender = 8,
  }, ref) => {
    
    // Memoize the key extractor for better performance
    const keyExtractor = useCallback((item: ListItem, index: number) => {
      if (isExploreMoreCard(item)) {
        return item.key;
      }
      return item.id;
    }, []);

    // Memoize the render function to prevent unnecessary re-renders
    const renderItem = useCallback(({ item }: { item: ListItem }) => {
      if (isExploreMoreCard(item)) {
        return (
          <ExploreMoreCard
            style={styles.exploreCard}
            onSubCategoryPress={onSubCategoryPress || (() => {})}
            onBroadCategoryPress={onCategoryPress}
            currentSubCategories={
              PLACE_CATEGORIES.find((c) => c.key === currentCategory)?.subCategories || []
            }
            otherBroadCategories={
              PLACE_CATEGORIES.filter((c) => c.key !== currentCategory)
            }
          />
        );
      }

      // TypeScript now knows this is a Place
      const place = item;

      return (
        <PlaceCard
          place={place}
          userLocation={userLocation}
          onPress={() => onPlacePress(place.id)}
          onLikePress={onLikePress}
          onSavePress={onSavePress}
          getDistance={getDistance}
        />
      );
    }, [
      currentCategory,
      userLocation,
      onPlacePress,
      onLikePress,
      onSavePress,
      onCategoryPress,
      onSubCategoryPress,
      getDistance
    ]);

    // Memoize the empty state component
    const renderEmptyComponent = useCallback(() => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No places found</Text>
        <Text style={styles.emptySubtext}>Try adjusting your filters or search terms</Text>
      </View>
    ), []);

    // Memoize the footer component
    const renderFooterComponent = useCallback(() => {
      if (loading) {
        return (
          <View style={styles.footerContainer}>
            <ActivityIndicator 
              color="#fff" 
              style={styles.loadingIndicator} 
            />
            <Text style={styles.loadingText}>Loading more places...</Text>
          </View>
        );
      }
      return null;
    }, [loading]);

    // Simplified getItemLayout without the complex offset calculation
    // This approach is more performant and avoids the type errors
    const getItemLayout = useCallback((
      data: ArrayLike<ListItem> | null | undefined, 
      index: number
    ) => {
      const PLACE_CARD_HEIGHT = 250;
      const EXPLORE_CARD_HEIGHT = 200;
      
      // For mixed height items, we can't calculate exact offsets without knowing all previous items
      // So we'll use an average height approach or remove this optimization
      const averageHeight = (PLACE_CARD_HEIGHT + EXPLORE_CARD_HEIGHT) / 2;
      
      return {
        length: averageHeight,
        offset: averageHeight * index,
        index,
      };
    }, []);

    return (
      <FlatList
        ref={ref}
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          data.length === 0 && styles.emptyListContent
        ]}
        ListEmptyComponent={!loading ? renderEmptyComponent : null}
        ListFooterComponent={renderFooterComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
            colors={['#F5A623']}
            progressBackgroundColor="#1B1F24"
          />
        }
        // Performance optimizations
        removeClippedSubviews={removeClippedSubviews}
        maxToRenderPerBatch={maxToRenderPerBatch}
        windowSize={windowSize}
        initialNumToRender={initialNumToRender}
        // Comment out getItemLayout if you have variable heights
        // getItemLayout={getItemLayout}
        // Improve scrolling performance
        scrollEventThrottle={16}
        // Prevent unnecessary re-renders when data changes
        extraData={userLocation}
        // Better handling of large lists
        disableVirtualization={false}
      />
    );
  }
);

HomePlacesList.displayName = 'HomePlacesList';

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 30,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingIndicator: {
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  exploreCard: {
    marginVertical: 20,
  },
});

export default HomePlacesList;