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

type Props = {
  meetupId: string;
  onBack: () => void;
};

const StartMeetupScreen = ({ meetupId, onBack }: Props) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      {/* Main swiping screen */}
      <SwipingScreen meetupId={meetupId} />

      {/* "Change Direction" button */}
      <TouchableOpacity
        style={styles.changeDirectionButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.buttonText}>Change Direction</Text>
      </TouchableOpacity>

      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
      >
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>

      {/* Modal for ExploreMoreCard */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ExploreMoreCard
              onCategoryPress={(keyword) => {
                console.log('Category pressed:', keyword);
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
};

export default StartMeetupScreen;

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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
