// components/meetup_components/CollectionsCard.tsx - Updated for collaborative collections
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Professional color palette matching home.tsx
const Colors = {
  primary: '#F5A623',
  background: '#0D1117',
  surface: '#1B1F24',
  surfaceLight: '#333333',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#888888',
  border: '#333333',
  success: '#10B981',
  white: '#FFFFFF',
};

// Updated CollectionType to match collaborative collections
type CollectionType = { 
  id: string; 
  title: string;
  description?: string;
  activities?: any[];
  userRole: string;
  privacy: string;
  allowMembersToAdd: boolean;
  totalActivities: number;
  members?: { [key: string]: any };
  owner?: string;
};

interface CollectionsCardProps {
  collectionsList: CollectionType[];
  selectedCollections: CollectionType[];
  onToggleCollection: (collection: CollectionType) => void;
  onRemoveCollection: (collectionId: string) => void;
}

// Simplified Collection Display Component for Meetup View
const MeetupCollectionCard: React.FC<{ collection: CollectionType }> = ({ collection }) => {
  const activityCount = collection.totalActivities || collection.activities?.length || 0;
  const previewActivities = collection.activities?.slice(0, 3) || [];
  
  // Get privacy icon
  const getPrivacyIcon = () => {
    switch (collection.privacy) {
      case 'public':
        return 'globe-outline';
      case 'friends':
        return 'people-outline';
      case 'private':
      default:
        return 'lock-closed-outline';
    }
  };

  // Get role color
  const getRoleColor = () => {
    switch (collection.userRole) {
      case 'owner':
        return Colors.primary;
      case 'collaborator':
        return Colors.success;
      case 'viewer':
      default:
        return Colors.textMuted;
    }
  };
  
  return (
    <View style={styles.meetupCollectionCard}>
      {/* Collection Preview Images */}
      <View style={styles.cardPreviewSection}>
        {previewActivities.length > 0 ? (
          <View style={styles.cardPreviewImages}>
            {previewActivities.map((activity, index) => (
              <View 
                key={index} 
                style={[
                  styles.cardPreviewImageWrapper,
                  { 
                    zIndex: previewActivities.length - index,
                    left: index * 8 // Stagger the images
                  }
                ]}
              >
                {activity.photoUrls?.[0] || activity.image ? (
                  <Image 
                    source={{ uri: activity.photoUrls?.[0] || activity.image }} 
                    style={styles.cardPreviewImage}
                  />
                ) : (
                  <View style={styles.cardPlaceholderImage}>
                    <Ionicons name="image-outline" size={10} color={Colors.textMuted} />
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.cardDefaultPreview}>
            <Ionicons name="folder-outline" size={24} color={Colors.primary} />
          </View>
        )}
      </View>
      
      {/* Collection Info */}
      <View style={styles.collectionHeader}>
        <Ionicons name={getPrivacyIcon()} size={12} color={Colors.textMuted} />
        <Text style={styles.collectionTitle} numberOfLines={1}>
          {collection.title || 'Untitled Collection'}
        </Text>
      </View>
      
      <Text style={styles.activityCount}>
        {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
      </Text>
      
      {/* User Role Badge */}
      <View style={styles.roleBadge}>
        <Text style={[styles.roleText, { color: getRoleColor() }]}>
          {collection.userRole}
        </Text>
      </View>
    </View>
  );
};

const CollectionsCard: React.FC<CollectionsCardProps> = ({
  collectionsList,
  selectedCollections,
  onToggleCollection,
  onRemoveCollection,
}) => {
  const [showCollectionsRow, setShowCollectionsRow] = useState(false);

  // Filter collections where user can add activities (for meetups)
  const availableCollections = collectionsList.filter(collection => 
    collection.userRole === 'owner' || 
    collection.userRole === 'collaborator' || 
    (collection.userRole === 'viewer' && collection.allowMembersToAdd)
  );

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.sectionTitle}>Activity Collections</Text>
          <Text style={styles.subtitle}>
            {selectedCollections.length > 0 
              ? `${selectedCollections.length} selected`
              : 'Optional'
            }
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.toggleButton} 
          onPress={() => setShowCollectionsRow(!showCollectionsRow)}
        >
          <Ionicons 
            name={showCollectionsRow ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={Colors.primary} 
          />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.hint}>
        Collections can be added later as well
      </Text>

      {/* Collections Selection */}
      {showCollectionsRow && (
        <View style={styles.selectionContainer}>
          {availableCollections.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyStateText}>No collections available</Text>
              <Text style={styles.emptyStateSubtext}>
                {collectionsList.length === 0 
                  ? 'Create collections in your profile to add them here'
                  : 'You need owner or collaborator access to use collections in meetups'
                }
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.collectionsRow}
            >
              {availableCollections.map((collection) => {
                const isSelected = selectedCollections.some((c) => c.id === collection.id);
                
                return (
                  <TouchableOpacity 
                    key={collection.id} 
                    onPress={() => onToggleCollection(collection)} 
                    style={styles.collectionWrapper}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.collectionContainer, isSelected && styles.selectedContainer]}>
                      <MeetupCollectionCard collection={collection} />
                      
                      {/* Selection Indicator */}
                      <View style={[styles.selectionIndicator, isSelected && styles.selectedIndicator]}>
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                        ) : (
                          <View style={styles.unselectedCircle} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Selected Collections Display */}
      {selectedCollections.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={styles.selectedTitle}>
            Selected Collections ({selectedCollections.length})
          </Text>
          <View style={styles.selectedGrid}>
            {selectedCollections.map((collection) => {
              const activityCount = collection.totalActivities || collection.activities?.length || 0;
              const previewActivities = collection.activities?.slice(0, 3) || [];
              
              return (
                <View key={collection.id} style={styles.selectedItem}>
                  {/* Collection Preview */}
                  <View style={styles.selectedItemPreview}>
                    {previewActivities.length > 0 ? (
                      <View style={styles.previewImages}>
                        {previewActivities.map((activity, index) => (
                          <View 
                            key={index} 
                            style={[
                              styles.previewImageWrapper,
                              { zIndex: previewActivities.length - index }
                            ]}
                          >
                            {activity.photoUrls?.[0] || activity.image ? (
                              <Image 
                                source={{ uri: activity.photoUrls?.[0] || activity.image }} 
                                style={styles.previewImage}
                              />
                            ) : (
                              <View style={styles.placeholderImage}>
                                <Ionicons name="image-outline" size={12} color={Colors.textMuted} />
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={styles.defaultPreview}>
                        <Ionicons name="folder" size={20} color={Colors.primary} />
                      </View>
                    )}
                  </View>
                  
                  {/* Collection Info */}
                  <View style={styles.selectedItemContent}>
                    <Text style={styles.selectedItemText} numberOfLines={1}>
                      {collection.title}
                    </Text>
                    <Text style={styles.selectedItemSubtext}>
                      {activityCount} {activityCount === 1 ? 'activity' : 'activities'} • {collection.userRole}
                    </Text>
                  </View>
                  
                  {/* Remove Button */}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => onRemoveCollection(collection.id)}
                  >
                    <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  
  // Selection Container
  selectionContainer: {
    marginTop: 8,
  },
  collectionsRow: {
    paddingVertical: 12,
    gap: 12,
  },
  collectionWrapper: {
    width: 130, // Slightly wider for role badge
  },
  collectionContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedContainer: {
    borderWidth: 2,
    borderColor: Colors.success,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 2,
  },
  selectedIndicator: {
    backgroundColor: 'transparent',
  },
  unselectedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  
  // Meetup Collection Card Styles
  meetupCollectionCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 110, // Slightly taller for role badge
    justifyContent: 'space-between',
  },
  cardPreviewSection: {
    alignItems: 'center',
    marginBottom: 8,
    height: 40,
    justifyContent: 'center',
  },
  cardPreviewImages: {
    width: 50,
    height: 32,
    position: 'relative',
  },
  cardPreviewImageWrapper: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  cardPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
  },
  cardPlaceholderImage: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDefaultPreview: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  collectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 6,
    flex: 1,
  },
  activityCount: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  
  // Selected Section
  selectedSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  selectedGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
  },
  selectedItemPreview: {
    marginRight: 12,
  },
  previewImages: {
    flexDirection: 'row',
    width: 40,
    height: 40,
  },
  previewImageWrapper: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedItemContent: {
    flex: 1,
  },
  selectedItemText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectedItemSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  removeButton: {
    padding: 4,
  },
});

export default CollectionsCard;