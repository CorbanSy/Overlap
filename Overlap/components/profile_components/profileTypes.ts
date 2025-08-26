export interface SharedActivity {
  id: string;
  name: string;
  title?: string;
  description?: string;
  rating?: number;
  photos?: { 
    photoUri: string;
  }[];
  photoUrls?: string[];
  [key: string]: any;
}

export interface SharedCollection {
  id: string;
  title: string;
  description?: string;
  activities: SharedActivity[];
  createdAt?: Date;
}

export interface ProfileListHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedCollection: SharedCollection | null;
  onClearSelectedCollection: () => void;
  setIsModalVisible: (visible: boolean) => void;
  toggleSettingsMenu: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  resultCount: number; // Add this missing prop
}