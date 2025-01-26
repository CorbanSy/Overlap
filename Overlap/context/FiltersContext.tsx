import React, { createContext, useState, useContext, ReactNode } from 'react';

// 1) Define the shape of our filter state
type FilterState = {
  distance: number;
  categories: string[];
  openNow: boolean;
  sort: 'distance' | 'rating'; 
  ratings: boolean; // e.g. only show 4.0+
  // add any other fields you want
};

// 2) Define a default state (for initial values)
const defaultFilterState: FilterState = {
  distance: 5000,
  categories: [],
  openNow: false,
  sort: 'distance',
  ratings: false,
};

// 3) Create the context 
// We'll store BOTH the filterState object and a setter function.
type FiltersContextType = {
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
};

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

// 4) Create a provider component
type FiltersProviderProps = {
  children: ReactNode;
};

export function FiltersProvider({ children }: FiltersProviderProps) {
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState);

  return (
    <FiltersContext.Provider value={{ filterState, setFilterState }}>
      {children}
    </FiltersContext.Provider>
  );
}

// 5) Create a convenient custom hook for consumption
export function useFilters() {
  const contextValue = useContext(FiltersContext);
  if (!contextValue) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return contextValue; 
}
