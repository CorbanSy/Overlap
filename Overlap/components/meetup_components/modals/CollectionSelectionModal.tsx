import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Colors = {
  primary: '#F5A623',
  background: '#0D1117',
  surface: '#1B1F24',
  surfaceLight: '#333333',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#888888',
  border: '#333333',
  overlay: 'rgba(13, 17, 23, 0.8)',
};

type Collection = {
  id: string;
  title?: string;
  name?: string;
  activities?: any[];
};

interface Props {
  visible: boolean;
  collectionsList: Collection[];
  selectedCollections: Collection[];
  onToggleCollection: (c: Collection) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const CollectionSelectionModal: React.FC<Props> = ({
  visible,
  collectionsList,
  selectedCollections,
  onToggleCollection,
  onConfirm,
  onClose,
}) => {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 110, friction: 10, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.96, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const isSelected = (id: string) => selectedCollections.some(c => c.id === id);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.sheet, { opacity: fade, transform: [{ scale }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Collections</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Grid */}
          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {collectionsList.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="folder-open-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No collections found</Text>
                <Text style={styles.emptySub}>Create collections in your profile first.</Text>
              </View>
            ) : (
              collectionsList.map((col) => {
                const preview = (col.activities?.[0]?.image) ||
                                (col.activities?.[0]?.photoUrls?.[0]) ||
                                null;
                const count = col.activities?.length || 0;
                const label = col.title || col.name || 'Untitled Collection';

                return (
                  <TouchableOpacity
                    key={col.id}
                    style={styles.cardWrap}
                    activeOpacity={0.9}
                    onPress={() => onToggleCollection(col)}
                  >
                    <View style={[styles.card, isSelected(col.id) && styles.cardSelected]}>
                      <View style={styles.preview}>
                        {preview ? (
                          <Image source={{ uri: preview }} style={styles.previewImg} />
                        ) : (
                          <View style={styles.previewFallback}>
                            <Ionicons name="folder" size={20} color={Colors.primary} />
                          </View>
                        )}
                      </View>

                      <Text style={styles.name} numberOfLines={1}>{label}</Text>
                      <Text style={styles.count}>
                        {count} {count === 1 ? 'activity' : 'activities'}
                      </Text>

                      <View style={[styles.check, isSelected(col.id) ? styles.checkOn : styles.checkOff]}>
                        {isSelected(col.id) && <Ionicons name="checkmark" size={14} color={Colors.background} />}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.secondary} onPress={onClose}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primary} onPress={onConfirm}>
              <Ionicons name="checkmark" size={18} color={Colors.background} style={{ marginRight: 8 }} />
              <Text style={styles.primaryText}>Done{selectedCollections.length ? ` (${selectedCollections.length})` : ''}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: Colors.surface, width: '100%', maxWidth: 420, maxHeight: '80%', borderRadius: 16, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16, justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 40, width: '100%' },
  emptyTitle: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600', marginTop: 10 },
  emptySub: { color: Colors.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' },
  cardWrap: { width: 140 },
  card: { backgroundColor: Colors.surfaceLight, borderWidth: 2, borderColor: Colors.border, borderRadius: 12, padding: 12, position: 'relative' },
  cardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '20' },
  preview: { height: 60, borderRadius: 8, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  previewImg: { width: '100%', height: '100%' },
  previewFallback: { width: '100%', height: '100%', backgroundColor: '#20262d', justifyContent: 'center', alignItems: 'center' },
  name: { color: Colors.text, fontSize: 13, fontWeight: '600' },
  count: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  check: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: Colors.primary },
  checkOff: { borderWidth: 2, borderColor: Colors.border, backgroundColor: 'transparent' },
  footer: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  primary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 10 },
  primaryText: { color: Colors.background, fontSize: 16, fontWeight: '600' },
  secondary: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceLight, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  secondaryText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '500' },
});

export default CollectionSelectionModal;
