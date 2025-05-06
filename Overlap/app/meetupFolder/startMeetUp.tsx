// startMeetUp.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Modal,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';

import SwipingScreen from '../../components/swiping';
import ExploreMoreCard from '../../components/ExploreMoreCard';
import { PLACE_CATEGORIES } from '../_utils/placeCategories';

type Props = {
  meetupId: string;
  onBack: () => void;
};

export default function StartMeetupScreen({ meetupId, onBack }: Props) {
  const [modalVisible, setModalVisible] = useState(false);

  // ---- pick your “current” category key however you like ----
  // e.g. you might load it from the meetup itself
  const currentCategoryKey = PLACE_CATEGORIES[0].key;

  // find the subCategories array for your current category
  const currentCatObj =
    PLACE_CATEGORIES.find((c) => c.key === currentCategoryKey) || { subCategories: [] };

  // build “other” broad categories for the horizontal list
  const otherBroadCategories = PLACE_CATEGORIES.filter(
    (c) => c.key !== currentCategoryKey
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Main swipe deck */}
      <SwipingScreen meetupId={meetupId} />

      {/* Change Direction */}
      <TouchableOpacity
        style={styles.changeDirectionButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.buttonText}>Change Direction</Text>
      </TouchableOpacity>

      {/* Back */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>

      {/* Modal with ExploreMoreCard */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ExploreMoreCard
              currentSubCategories={currentCatObj.subCategories}
              otherBroadCategories={otherBroadCategories}
              onSubCategoryPress={(subKey) => {
                console.log('Sub‑category pressed:', subKey);
                // trigger a new fetch or reroute your swipe deck here…
                setModalVisible(false);
              }}
              onBroadCategoryPress={(catKey) => {
                console.log('Broad category pressed:', catKey);
                // maybe switch your swipe deck over to a wholly new category…
                setModalVisible(false);
              }}
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  changeDirectionButton: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: '#F5A623',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#1B1F24',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1B1F24',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  closeButton: {
    marginTop: 20,
    alignSelf: 'center',
    backgroundColor: '#F5A623',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#0D1117',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
