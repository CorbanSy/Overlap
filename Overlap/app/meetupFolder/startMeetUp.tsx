// screens/startMeetUp.tsx
import React, { useState, useRef, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import SwipingScreen from '../../components/swiping';
import ExploreMoreCard from '../../components/ExploreMoreCard';
import Leader from '../../components/leader';
import { PLACE_CATEGORIES } from '../_utils/placeCategories';

interface StartMeetupScreenProps {
  meetupId: string;
  onLeave: () => void;
}

const BUTTON_SIZE = 60;

export default function StartMeetupScreen({ meetupId, onLeave }: StartMeetupScreenProps) {
  const [showDirectionModal, setShowDirectionModal] = useState(false);

  // ref to control the sheet modal
  const sheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['75%'], []);

  const openLeaderboard = () => {
    console.log('🔔 Presenting BottomSheetModal…');
    sheetModalRef.current?.present();
  };

  // compute categories for your modal
  const currentCatKey = PLACE_CATEGORIES[0]?.key;
  const currentCat =
    PLACE_CATEGORIES.find(c => c.key === currentCatKey) || { subCategories: [] };
  const otherCats = PLACE_CATEGORIES.filter(c => c.key !== currentCat.key);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onLeave}>
            <Text style={styles.headerButton}>‹ Leave Meetup</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openLeaderboard}>
            <Text style={styles.headerButton}>Leaderboard</Text>
          </TouchableOpacity>
        </View>

        {/* SWIPE DECK */}
        <SwipingScreen meetupId={meetupId} />

        {/* CONTROLS */}
        <View style={styles.controlBar}>
          <TouchableOpacity style={styles.controlButton}>
            <Text style={[styles.controlEmoji, { color: '#DC3545' }]}>❌</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, styles.centerButton]}
            onPress={() => setShowDirectionModal(true)}
          >
            <Text style={styles.controlEmoji}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <Text style={[styles.controlEmoji, { color: '#28A745' }]}>✅</Text>
          </TouchableOpacity>
        </View>

        {/* CHANGE‑DIRECTION MODAL */}
        <Modal
          animationType="slide"
          transparent
          visible={showDirectionModal}
          onRequestClose={() => setShowDirectionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ExploreMoreCard
                currentSubCategories={currentCat.subCategories}
                otherBroadCategories={otherCats}
                onSubCategoryPress={subKey => {
                  setShowDirectionModal(false);
                }}
                onBroadCategoryPress={catKey => {
                  setShowDirectionModal(false);
                }}
              />
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDirectionModal(false)}
              >
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>

      {/* ——— BOTTOM SHEET MODAL ——— */}
      <BottomSheetModal
        ref={sheetModalRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={{ backgroundColor: '#888', width: 40 }}
      >
        <Leader meetupId={meetupId} />
      </BottomSheetModal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#232533',
  },
  headerButton: { color: '#F5A623', fontSize: 16, fontWeight: '600' },
  controlBar: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
  },
  controlButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: { backgroundColor: '#F5A623' },
  controlEmoji: { fontSize: 28 },
  sheetBackground: { backgroundColor: '#1B1F24' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1B1F24',
    borderRadius: 12,
    padding: 20,
  },
  closeButton: {
    marginTop: 16,
    alignSelf: 'center',
    backgroundColor: '#F5A623',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeText: { color: '#0D1117', fontWeight: 'bold' },
});
