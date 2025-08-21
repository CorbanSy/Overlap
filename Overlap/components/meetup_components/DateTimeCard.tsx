// components/meetup_components/DateTimeCard.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  white: '#FFFFFF',
};

interface DateTimeCardProps {
  date: Date;
  setDate: (date: Date) => void;
  time: Date;
  setTime: (time: Date) => void;
}

const DateTimeCard: React.FC<DateTimeCardProps> = ({
  date,
  setDate,
  time,
  setTime,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onChangeTime = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const getDateDisplayText = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return formatDate(date);
  };

  return (
    <View style={styles.container}>
      {/* Date Card */}
      <View style={[styles.card, styles.halfCard]}>
        <Text style={styles.sectionTitle}>Date *</Text>
        <TouchableOpacity 
          style={styles.pickerButton} 
          onPress={() => setShowDatePicker(true)}
        >
          <View style={styles.pickerContent}>
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            <View style={styles.pickerTextContainer}>
              <Text style={styles.pickerMainText}>{getDateDisplayText(date)}</Text>
              {(isToday(date) || isTomorrow(date)) && (
                <Text style={styles.pickerSubText}>{formatDate(date)}</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
        
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={onChangeDate}
            minimumDate={new Date()}
          />
        )}
      </View>

      {/* Time Card */}
      <View style={[styles.card, styles.halfCard]}>
        <Text style={styles.sectionTitle}>Time *</Text>
        <TouchableOpacity 
          style={styles.pickerButton} 
          onPress={() => setShowTimePicker(true)}
        >
          <View style={styles.pickerContent}>
            <Ionicons name="time-outline" size={20} color={Colors.primary} />
            <View style={styles.pickerTextContainer}>
              <Text style={styles.pickerMainText}>{formatTime(time)}</Text>
              <Text style={styles.pickerSubText}>
                {time.getHours() < 12 ? 'Morning' : time.getHours() < 17 ? 'Afternoon' : 'Evening'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        
        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display="default"
            onChange={onChangeTime}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  halfCard: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  pickerButton: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 16,
    minHeight: 60,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  pickerMainText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  pickerSubText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});

export default DateTimeCard;