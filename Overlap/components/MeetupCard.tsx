// MeetupCard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  LayoutChangeEvent,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FriendCard from './FriendCard';
import CollectionCard from './CollectionCard';

interface MeetupCardProps {
  meetup: any;
  onEdit?: () => void;
  onRemove?: () => void;
  onStart?: (meetupId: string) => void;
  onStop?: (meetupId: string) => void;
}

const toDate = (v: any): Date => {
  if (!v) return new Date();
  if (typeof v?.toDate === 'function') return v.toDate(); // Firestore Timestamp
  return new Date(v);
};

const fmtDate = (v: any) => toDate(v).toLocaleDateString();
const fmtTime = (v: any) =>
  toDate(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const priceBadge = (priceRange?: number) => {
  if (!priceRange || priceRange <= 0) return 'Free';
  const buckets = Math.max(1, Math.min(4, Math.ceil(priceRange / 20))); // 0–20:$, 21–40:$$, etc.
  return '$'.repeat(buckets);
};

const FRIEND_PREVIEW = 8;
const COLLECTION_PREVIEW = 6;

const MeetupCard: React.FC<MeetupCardProps> = ({
  meetup,
  onEdit,
  onRemove,
  onStart,
  onStop,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [showAllCollections, setShowAllCollections] = useState(false);
  const [width, setWidth] = useState(0);
  const isWide = width >= 560;

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const truncatedDescription = useMemo(() => {
    const d = meetup?.description || '';
    return d.length > 140 ? d.slice(0, 140) + '…' : d;
  }, [meetup?.description]);

  const createdAtLabel = useMemo(
    () => (meetup?.createdAt ? toDate(meetup.createdAt).toLocaleString() : 'N/A'),
    [meetup?.createdAt]
  );

  const handleToggleMeetup = () => {
    if (!meetup?.id) return;
    if (meetup?.ongoing) onStop?.(meetup.id);
    else onStart?.(meetup.id);
  };

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(v => !v);
  };

  const MetaRow = ({ label, value }: { label: string; value?: string }) => (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value ?? 'N/A'}</Text>
    </View>
  );

  const friends: any[] = Array.isArray(meetup?.friends) ? meetup.friends : [];
  const collections: any[] = Array.isArray(meetup?.collections) ? meetup.collections : [];

  const friendsToShow = showAllFriends ? friends : friends.slice(0, FRIEND_PREVIEW);
  const collectionsToShow = showAllCollections
    ? collections
    : collections.slice(0, COLLECTION_PREVIEW);

  return (
    <View style={styles.cardContainer} onLayout={onLayout}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.meetupName} numberOfLines={2}>
            {meetup?.eventName || 'Untitled Meetup'}
          </Text>
        </View>

        {/* Collapse/expand */}
        <TouchableOpacity style={styles.chevBtn} onPress={toggleExpanded} activeOpacity={0.8}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#E6E6E6" />
        </TouchableOpacity>

        {/* Start/Stop */}
        <TouchableOpacity
          style={[styles.startButton, meetup?.ongoing ? styles.stopBg : styles.startBg]}
          onPress={handleToggleMeetup}
          activeOpacity={0.9}
        >
          <Ionicons
            name={meetup?.ongoing ? 'stop-circle-outline' : 'play-circle-outline'}
            size={20}
            color="#0D1117"
            style={styles.startIcon}
          />
          <Text style={styles.startButtonText}>{meetup?.ongoing ? 'Stop' : 'Start'}</Text>
        </TouchableOpacity>
      </View>

      {/* Subheader chips */}
      <View style={styles.chipsRow}>
        {!!meetup?.date && (
          <View style={styles.chip}>
            <Ionicons name="calendar-outline" size={14} color="#CFCFCF" />
            <Text style={styles.chipText}>{fmtDate(meetup.date)}</Text>
          </View>
        )}
        {!!meetup?.time && (
          <View style={styles.chip}>
            <Ionicons name="time-outline" size={14} color="#CFCFCF" />
            <Text style={styles.chipText}>{fmtTime(meetup.time)}</Text>
          </View>
        )}
        {!!meetup?.location && (
          <View style={styles.chip}>
            <Ionicons name="location-outline" size={14} color="#CFCFCF" />
            <Text style={styles.chipText} numberOfLines={1}>
              {meetup.location}
            </Text>
          </View>
        )}
        {!!meetup?.code && (
          <View style={styles.chip}>
            <Ionicons name="key-outline" size={14} color="#CFCFCF" />
            <Text style={styles.chipText}>Code: {meetup.code}</Text>
          </View>
        )}
      </View>

      {/* Collapsed summary */}
      {!expanded && !!truncatedDescription && (
        <Text style={[styles.description, { marginTop: 8 }]}>{truncatedDescription}</Text>
      )}

      {/* Expanded content */}
      {expanded && (
        <View style={[styles.contentRow, !isWide && { flexDirection: 'column' }]}>
          {/* Left column */}
          <View style={[styles.leftCol, !isWide && { paddingRight: 0 }]}>
            <Text style={styles.description}>{meetup?.description || 'No description.'}</Text>

            {/* Collections */}
            <View style={{ marginTop: 12 }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.subTitle}>Collections</Text>
                {!!collections?.length && (
                  <Text style={styles.countPill}>{collections.length}</Text>
                )}
              </View>

              {collectionsToShow.length > 0 ? (
                <FlatList
                  horizontal
                  data={collectionsToShow}
                  keyExtractor={(item, index) => item?.id?.toString?.() ?? String(index)}
                  renderItem={({ item }) => <CollectionCard collection={item} previewOnly />}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 6, gap: 10 }}
                />
              ) : (
                <Text style={styles.dimText}>No collections added.</Text>
              )}

              {collections.length > COLLECTION_PREVIEW && (
                <TouchableOpacity
                  style={styles.smallGhostBtn}
                  onPress={() => setShowAllCollections(v => !v)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.ghostText}>
                    {showAllCollections
                      ? 'Show fewer collections'
                      : `Show all ${collections.length}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Friends */}
            <View style={{ marginTop: 12 }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.subTitle}>Friends</Text>
                {!!friends?.length && <Text style={styles.countPill}>{friends.length}</Text>}
              </View>

              {friendsToShow.length > 0 ? (
                <View style={styles.invitedGrid}>
                  {friendsToShow.map((f, idx) => (
                    <View key={f?.uid ?? idx} style={styles.friendChip}>
                      <Image
                        source={
                          f?.avatarUrl
                            ? { uri: f.avatarUrl }
                            : require('../assets/images/profile.png')
                        }
                        style={styles.friendAvatar}
                      />
                      <Text numberOfLines={1} style={styles.friendLabel}>
                        {f?.name || f?.email || f?.uid || 'Friend'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.dimText}>No friends invited yet.</Text>
              )}

              {friends.length > FRIEND_PREVIEW && (
                <TouchableOpacity
                  style={[styles.smallGhostBtn, { marginTop: 8 }]}
                  onPress={() => setShowAllFriends(v => !v)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.ghostText}>
                    {showAllFriends ? 'Show fewer friends' : `Show all ${friends.length}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Right column (meta) */}
          <View style={[styles.rightCol, !isWide && { marginTop: 12 }]}>
            <Text style={styles.subTitle}>Details</Text>
            <MetaRow label="Category" value={meetup?.category} />
            <MetaRow label="Mood" value={meetup?.mood} />
            <MetaRow
              label="Price"
              value={`${priceBadge(meetup?.priceRange)} (${meetup?.priceRange ?? 0})`}
            />
            <MetaRow label="Group Size" value={String(meetup?.groupSize ?? 0)} />
            <MetaRow label="Participants" value={String(meetup?.participants?.length ?? 0)} />
            <MetaRow label="Meetup ID" value={meetup?.meetupId || meetup?.id} />
            <MetaRow label="Creator ID" value={meetup?.creatorId} />
            <MetaRow label="Created At" value={createdAtLabel} />

            {/* Edit / Remove */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.iconButton} onPress={onEdit || (() => {})}>
                <Ionicons name="pencil-outline" size={20} color="#4DA6FF" />
              </TouchableOpacity>
              {!!onRemove && (
                <TouchableOpacity style={styles.iconButton} onPress={onRemove}>
                  <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const CARD = '#1B1F24';
const SURFACE = '#232A33';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#FFFFFF';
const SUBTLE = '#9AA0A6';

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  meetupName: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '800',
  },
  chevBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  startBg: { backgroundColor: '#FFC107' },
  stopBg: { backgroundColor: '#FFD54F' },
  startIcon: { marginRight: 6 },
  startButtonText: {
    color: '#0D1117',
    fontWeight: '800',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chipText: { color: '#CFCFCF', fontSize: 12 },
  contentRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
  },
  leftCol: { flex: 1, paddingRight: 6 },
  rightCol: {
    minWidth: 220,
    maxWidth: 320,
    alignSelf: 'flex-start',
    backgroundColor: '#141821',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  description: { color: '#CCCCCC', fontSize: 14, lineHeight: 20 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  subTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '800',
  },
  countPill: {
    color: TEXT,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 12,
    overflow: 'hidden',
  },
  dimText: { color: SUBTLE, fontSize: 13 },

  /** Friends grid (inspired by create.tsx) */
  invitedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  friendChip: {
    width: 90,
    height: 110,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatar: { width: 46, height: 46, borderRadius: 23, marginBottom: 6 },
  friendLabel: { color: TEXT, fontSize: 10, textAlign: 'center' },

  /** Ghost button (matches create.tsx tone) */
  smallGhostBtn: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 6,
  },
  ghostText: { color: TEXT, fontWeight: '700', fontSize: 12 },

  /** Meta panel */
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  metaLabel: { color: '#9AA0A6', fontSize: 12 },
  metaValue: { color: '#EDEDED', fontSize: 13, flexShrink: 1, textAlign: 'right' },

  /** Actions */
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  iconButton: { padding: 6 },
});

export default MeetupCard;
