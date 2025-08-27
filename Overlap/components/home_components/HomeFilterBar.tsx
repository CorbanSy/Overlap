// app/components/home_components/HomeFilterBar.tsx
import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FilterState {
  sort?: string;
  openNow?: boolean;
  maxDistance?: number;
  minRating?: number;
  selectedTypes?: string[];
  priceRange?: string;
}

interface FilterOption {
  id: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
  showBadge?: boolean;
  badgeCount?: number;
  icon?: string;
}

interface HomeFilterBarProps {
  filterState: FilterState;
  onSortPress: () => void;
  onOpenNowPress: () => void;
  onDistancePress: () => void;
  onRatingPress: () => void;
  onTypesPress: () => void;
  onPricePress: () => void;
  onClearAllFilters?: () => void;
  showClearAll?: boolean;
}

export default function HomeFilterBar({
  filterState,
  onSortPress,
  onOpenNowPress,
  onDistancePress,
  onRatingPress,
  onTypesPress,
  onPricePress,
  onClearAllFilters,
  showClearAll = true,
}: HomeFilterBarProps) {

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(
      filterState.openNow ||
      filterState.maxDistance ||
      filterState.minRating ||
      filterState.selectedTypes?.length ||
      filterState.priceRange ||
      (filterState.sort && filterState.sort !== 'recommended')
    );
  }, [filterState]);

  // Generate filter options
  const filterOptions = useMemo((): FilterOption[] => [
    {
      id: 'sort',
      label: filterState.sort ? `Sort: ${filterState.sort}` : 'Sort',
      isActive: !!(filterState.sort && filterState.sort !== 'recommended'),
      onPress: onSortPress,
      icon: 'swap-vertical',
    },
    {
      id: 'openNow',
      label: 'Open Now',
      isActive: !!filterState.openNow,
      onPress: onOpenNowPress,
      icon: 'time',
    },
    {
      id: 'distance',
      label: filterState.maxDistance ? `${filterState.maxDistance}km` : 'Distance',
      isActive: !!filterState.maxDistance,
      onPress: onDistancePress,
      icon: 'location',
    },
    {
      id: 'rating',
      label: filterState.minRating ? `${filterState.minRating}+ ⭐` : 'Rating',
      isActive: !!filterState.minRating,
      onPress: onRatingPress,
      icon: 'star',
    },
    {
      id: 'types',
      label: filterState.selectedTypes?.length 
        ? `${filterState.selectedTypes.length} Types` 
        : 'Categories',
      isActive: !!(filterState.selectedTypes?.length),
      onPress: onTypesPress,
      showBadge: !!(filterState.selectedTypes?.length),
      badgeCount: filterState.selectedTypes?.length || 0,
      icon: 'grid',
    },
    {
      id: 'price',
      label: filterState.priceRange || 'Price',
      isActive: !!filterState.priceRange,
      onPress: onPricePress,
      icon: 'card',
    },
  ], [filterState, onSortPress, onOpenNowPress, onDistancePress, onRatingPress, onTypesPress, onPricePress]);

  const renderFilterButton = useCallback((option: FilterOption) => (
    <TouchableOpacity
      key={option.id}
      style={[
        styles.filterButton,
        option.isActive && styles.activeFilterButton
      ]}
      onPress={option.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.filterButtonContent}>
        {option.icon && (
          <Ionicons
            name={option.icon as any}
            size={16}
            color={option.isActive ? '#FFFFFF' : '#0D1117'}
            style={styles.filterIcon}
          />
        )}
        
        <Text style={[
          styles.filterButtonText,
          option.isActive && styles.activeFilterButtonText
        ]}>
          {option.label}
        </Text>

        {option.showBadge && option.badgeCount && option.badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {option.badgeCount > 99 ? '99+' : option.badgeCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  ), []);

  const handleClearAll = useCallback(() => {
    onClearAllFilters?.();
  }, [onClearAllFilters]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
        style={styles.filterScrollView}
      >
        {filterOptions.map(renderFilterButton)}

        {/* Clear All Button */}
        {showClearAll && hasActiveFilters && onClearAllFilters && (
          <TouchableOpacity
            style={styles.clearAllButton}
            onPress={handleClearAll}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={16} color="#FF6B6B" />
            <Text style={styles.clearAllText}>Clear</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Active Filters Indicator */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersIndicator}>
          <View style={styles.indicatorDot} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0D1117',
    position: 'relative',
  },
  filterScrollView: {
    backgroundColor: '#0D1117',
  },
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeFilterButton: {
    backgroundColor: '#F5A623',
    borderColor: '#F5A623',
    shadowColor: '#F5A623',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  filterIcon: {
    marginRight: 6,
  },
  filterButtonText: {
    color: '#0D1117',
    fontSize: 14,
    fontWeight: '600',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  clearAllButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 4,
  },
  clearAllText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  activeFiltersIndicator: {
    position: 'absolute',
    right: 16,
    top: 8,
    zIndex: 1,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F5A623',
  },
});