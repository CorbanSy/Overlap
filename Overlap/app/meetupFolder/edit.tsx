// app/meetupFolder/edit.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';

import { getMeetupData, updateMeetup } from '../../_utils/storage/meetups';

// Reuse the same input cards as "create"
import EventDetailsCard from '../../components/meetup_components/EventDetailsCard';
import SizeAndBudgetCard from '../../components/meetup_components/SizeAndBudgetCard';
import DateTimeCard from '../../components/meetup_components/DateTimeCard';
import LocationCard from '../../components/meetup_components/LocationCard';
import InviteCodeCard from '../../components/meetup_components/InviteCodeCard';

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
  error: '#F44336',
  white: '#FFFFFF',
  overlay: 'rgba(13, 17, 23, 0.8)',
};

type Props = {
  meetupId: string;
  onBack: () => void;
  onSaved?: () => void; // optional callback so parent can refresh
};

// Robust parser (handles ISO strings or Firestore Timestamps)
const toDate = (v: any) => {
  if (!v) return new Date();
  if (typeof v?.toDate === 'function') return v.toDate();
  if (typeof v === 'string') return new Date(v);
  if (v instanceof Date) return v;
  return new Date(v);
};

const EditMeetupScreen: React.FC<Props> = ({ meetupId, onBack, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [original, setOriginal] = useState<any>(null);

  // Editable state (mirrors create.tsx)
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Dining');

  const [groupSize, setGroupSize] = useState(1);
  const [priceRange, setPriceRange] = useState(0);

  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());

  const [locationOption, setLocationOption] = useState<'own' | 'specific'>('own');
  const [specificLocation, setSpecificLocation] = useState('');

  const [meetupCode, setMeetupCode] = useState('');

  // Load meetup
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const m = await getMeetupData(meetupId);
        setOriginal(m);

        setEventName(m.eventName || '');
        setDescription(m.description || '');
        setSelectedCategory(m.category || 'Dining');

        setGroupSize(m.groupSize || 1);
        setPriceRange(m.priceRange || 0);

        setDate(toDate(m.date));
        setTime(toDate(m.time));

        const loc = m.location || '';
        if (loc && loc.toLowerCase() !== 'my location') {
          setLocationOption('specific');
          setSpecificLocation(loc);
        } else {
          setLocationOption('own');
          setSpecificLocation('');
        }

        setMeetupCode(m.code || '');
      } catch (e: any) {
        console.error(e);
        setError(e?.message || 'Failed to load meetup.');
      } finally {
        setLoading(false);
      }
    })();
  }, [meetupId]);

  const isHost = useMemo(() => {
    const uid = getAuth()?.currentUser?.uid;
    return !!uid && uid === original?.creatorId;
  }, [original]);

  const handleSave = useCallback(async () => {
    if (!isHost) {
      Alert.alert('Not allowed', 'Only the host can edit meetup details.');
      return;
    }
    if (!eventName.trim()) {
      Alert.alert('Missing Required Field', 'Please enter an Event Name.');
      return;
    }

    const updates: any = { id: meetupId };

    // Only send changed fields
    if ((original?.eventName || '') !== eventName) updates.eventName = eventName;
    if ((original?.description || '') !== description) updates.description = description;
    if ((original?.category || 'Dining') !== selectedCategory) updates.category = selectedCategory;
    if ((original?.groupSize || 1) !== groupSize) updates.groupSize = groupSize;
    if ((original?.priceRange || 0) !== priceRange) updates.priceRange = priceRange;

    const newDateISO = date?.toISOString?.() ?? new Date(date).toISOString();
    const newTimeISO = time?.toISOString?.() ?? new Date(time).toISOString();
    if ((typeof original?.date === 'string' ? original.date : toDate(original?.date)?.toISOString()) !== newDateISO) {
      updates.date = newDateISO;
    }
    if ((typeof original?.time === 'string' ? original.time : toDate(original?.time)?.toISOString()) !== newTimeISO) {
      updates.time = newTimeISO;
    }

    const newLocation = locationOption === 'own' ? 'my location' : specificLocation.trim();
    if ((original?.location || '') !== newLocation) updates.location = newLocation;

    if ((original?.code || '') !== meetupCode) updates.code = meetupCode;

    if (Object.keys(updates).length === 1) {
      Alert.alert('No changes', 'Nothing to save.');
      return;
    }

    try {
      setSaving(true);
      await updateMeetup(updates);
      Alert.alert('Saved', 'Your changes have been saved.');
      onSaved?.();
      onBack();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }, [
    meetupId, isHost, eventName, description, selectedCategory, groupSize, priceRange,
    date, time, locationOption, specificLocation, meetupCode, original, onBack, onSaved
  ]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>Loading meetup…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={{ color: Colors.error, marginBottom: 12 }}>{error}</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onBack}>
          <Text style={styles.secondaryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Meetup</Text>
        <View style={styles.placeholder} />
      </View>

      {!isHost && (
        <View style={styles.notice}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
          <Text style={styles.noticeText}>Only the host can edit meetup details.</Text>
        </View>
      )}

      {/* Event Details */}
      <EventDetailsCard
        eventName={eventName}
        setEventName={setEventName}
        description={description}
        setDescription={setDescription}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      {/* Size & Budget */}
      <SizeAndBudgetCard
        groupSize={groupSize}
        setGroupSize={setGroupSize}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
      />

      {/* Date & Time */}
      <DateTimeCard
        date={date}
        setDate={setDate}
        time={time}
        setTime={setTime}
      />

      {/* Location */}
      <LocationCard
        locationOption={locationOption}
        setLocationOption={setLocationOption}
        specificLocation={specificLocation}
        setSpecificLocation={setSpecificLocation}
      />

      {/* Code */}
      <InviteCodeCard
        meetupCode={meetupCode}
        onGenerateCode={() =>
          setMeetupCode(Math.floor(100000 + Math.random() * 900000).toString())
        }
      />

      {/* Save */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving || !isHost}
        >
          {saving ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color={Colors.background} />
              <Text style={styles.primaryBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.note}>Tip: You can still add/remove friends and collections from the card.</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 },

  headerContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 24, paddingTop: 8,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  placeholder: { width: 40 },

  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#2A1E1E', borderColor: Colors.error, borderWidth: 1,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 16,
  },
  noticeText: { color: Colors.text, opacity: 0.9 },

  actions: { marginTop: 8, marginBottom: 16 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, gap: 8,
  },
  primaryBtnText: { color: Colors.background, fontWeight: '700', fontSize: 16 },

  secondaryBtn: {
    backgroundColor: Colors.surface, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18,
    borderColor: Colors.border, borderWidth: 1,
  },
  secondaryBtnText: { color: Colors.text },

  note: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', fontStyle: 'italic' },

  loadingWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: 8,
  },
});

export default EditMeetupScreen;
