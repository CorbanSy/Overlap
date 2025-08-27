// context/FiltersContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Updated to match your existing structure but enhanced for the filter modals
export interface FilterState {
  distance: number; // keeping your existing field name
  categories: string[]; // keeping your existing field name  
  openNow: boolean;
  sort: 'distance' | 'rating' | 'recommended';
  ratings: boolean; // keeping your existing field name
  // New fields for enhanced filtering
  maxDistance?: number; // maps to distance for backwards compatibility
  minRating?: number; // maps to ratings for backwards compatibility
  selectedTypes?: string[]; // maps to categories for backwards compatibility
  priceRange?: string;
}

// Default state matching your original structure
const defaultFilterState: FilterState = {
  distance: 5000,
  categories: [],
  openNow: false,
  sort: 'distance',
  ratings: false,
  // New defaults
  maxDistance: undefined,
  minRating: undefined,
  selectedTypes: [],
  priceRange: undefined,
};

interface FiltersContextType {
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  updateFilters: (updates: Partial<FilterState>) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

interface FiltersProviderProps {
  children: ReactNode;
}

export function FiltersProvider({ children }: FiltersProviderProps) {
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState);

  // Enhanced update function that maintains backwards compatibility
  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    setFilterState(prev => {
      const newState = { ...prev, ...updates };
      
      // Sync related fields for backwards compatibility
      if (updates.maxDistance !== undefined) {
        newState.distance = updates.maxDistance || 5000;
      }
      if (updates.distance !== undefined) {
        newState.maxDistance = updates.distance;
      }
      if (updates.selectedTypes !== undefined) {
        newState.categories = updates.selectedTypes || [];
      }
      if (updates.categories !== undefined) {
        newState.selectedTypes = updates.categories;
      }
      if (updates.minRating !== undefined) {
        newState.ratings = updates.minRating > 0;
      }
      
      return newState;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilterState({
      distance: 5000,
      categories: [],
      openNow: false,
      sort: 'distance',
      ratings: false,
      maxDistance: undefined,
      minRating: undefined,
      selectedTypes: [],
      priceRange: undefined,
    });
  }, []);

  const hasActiveFilters = React.useMemo(() => {
    return !!(
      filterState.openNow ||
      (filterState.maxDistance && filterState.maxDistance !== 5000) ||
      (filterState.distance && filterState.distance !== 5000) ||
      filterState.minRating ||
      filterState.ratings ||
      filterState.selectedTypes?.length ||
      filterState.categories?.length ||
      filterState.priceRange ||
      (filterState.sort && filterState.sort !== 'distance')
    );
  }, [filterState]);

  const value = {
    filterState,
    setFilterState,
    updateFilters,
    clearAllFilters,
    hasActiveFilters,
  };

  return (
    <FiltersContext.Provider value={value}>
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return context;
}