// app/components/home_components/CollectionModal.tsx
import React, { useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  StyleSheet, 
  Pressable,
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Collection {
  id: string;
  title: string;
  description?: string;
  itemCount?: number;
  [key: string]: any;
}

interface CollectionModalProps {
  visible: boolean;
  collections: Record<string, Collection>;
  onClose: () => void;
  onSelectCollection: (collectionId: string) => void;
  onCreateNewCollection?: () => void;
  selectedCollectionIds?: string[]; // For showing which collections already contain this item
  isLoading?: boolean;
}

export default function CollectionModal({
  visible,
  collections,
  onClose,
  onSelectCollection,
  onCreateNewCollection,
  selectedCollectionIds = [],
  isLoading = false,
}: CollectionModalProps) {
  
  const collectionsArray = useMemo(() => 
    Object.values(collections).sort((a, b) => a.title.localeCompare(b.title)),
    [collections]
  );

  const handleBackdropPress = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleCollectionPress = useCallback((collectionId: string) => {
    if (!isLoading) {
      onSelectCollection(collectionId);
    }
  }, [onSelectCollection, isLoading]);

  const renderCollectionItem = useCallback((collection: Collection) => {
    const isAlreadyInCollection = selectedCollectionIds.includes(collection.id);
    
    return (
      <TouchableOpacity
        key={collection.id}
        style={[
          styles.collectionItem,
          isAlreadyInCollection && styles.collectionItemSelected,
          isLoading && styles.collectionItemDisabled
        ]}
        onPress={() => handleCollectionPress(collection.id)}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <View style={styles.collectionContent}>
          <View style={styles.collectionTextContainer}>
            <Text style={[
              styles.collectionName,
              isAlreadyInCollection && styles.collectionNameSelected
            ]}>
              {collection.title}
            </Text>
            
            {collection.description && (
              <Text style={styles.collectionDescription} numberOfLines={2}>
                {collection.description}
              </Text>
            )}
            
            {collection.itemCount !== undefined && (
              <Text style={styles.collectionCount}>
                {collection.itemCount} {collection.itemCount === 1 ? 'item' : 'items'}
              </Text>
            )}
          </View>
          
          <View style={styles.collectionIconContainer}>
            {isAlreadyInCollection ? (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            ) : (
              <Ionicons name="add-circle-outline" size={24} color="#666" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [selectedCollectionIds, isLoading, handleCollectionPress]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="folder-outline" size={48} color="#666" />
      <Text style={styles.emptyStateText}>No Collections Yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Create your first collection to start organizing places
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <SafeAreaView style={styles.modalContainer}>
        <Pressable style={styles.backdrop} onPress={handleBackdropPress}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.modalTitle}>Add to Collection</Text>
                <Text style={styles.modalSubtitle}>
                  Choose a collection or create a new one
                </Text>
              </View>
              
              <TouchableOpacity 
                onPress={onClose} 
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Create New Collection Button */}
            {onCreateNewCollection && (
              <TouchableOpacity
                style={styles.createNewButton}
                onPress={onCreateNewCollection}
                disabled={isLoading}
              >
                <Ionicons name="add" size={20} color="#F5A623" />
                <Text style={styles.createNewButtonText}>Create New Collection</Text>
              </TouchableOpacity>
            )}

            {/* Collections List */}
            <View style={styles.collectionsWrapper}>
              {collectionsArray.length === 0 ? (
                renderEmptyState()
              ) : (
                <ScrollView
                  style={styles.collectionsContainer}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.collectionsScrollContent}
                >
                  {collectionsArray.map(renderCollectionItem)}
                </ScrollView>
              )}
            </View>

            {/* Footer Actions */}
            <View style={styles.footer}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.cancelButton}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1B1F24',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  closeButton: {
    padding: 4,
    marginLeft: 16,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    borderWidth: 1,
    borderColor: '#F5A623',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginTop: 16,
  },
  createNewButtonText: {
    color: '#F5A623',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  collectionsWrapper: {
    flex: 1,
    marginTop: 16,
  },
  collectionsContainer: {
    flex: 1,
  },
  collectionsScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  collectionItem: {
    backgroundColor: '#2A2E35',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  collectionItemSelected: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  collectionItemDisabled: {
    opacity: 0.6,
  },
  collectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  collectionTextContainer: {
    flex: 1,
  },
  collectionName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  collectionNameSelected: {
    color: '#4CAF50',
  },
  collectionDescription: {
    color: '#999',
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 18,
  },
  collectionCount: {
    color: '#666',
    fontSize: 12,
  },
  collectionIconContainer: {
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  cancelButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
});