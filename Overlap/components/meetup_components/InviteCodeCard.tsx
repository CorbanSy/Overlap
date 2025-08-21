// components/meetup_components/InviteCodeCard.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Clipboard,
  Alert,
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

interface InviteCodeCardProps {
  meetupCode: string;
  onGenerateCode: () => void;
}

const InviteCodeCard: React.FC<InviteCodeCardProps> = ({
  meetupCode,
  onGenerateCode,
}) => {
  const handleCopyCode = async () => {
    if (meetupCode) {
      await Clipboard.setString(meetupCode);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.sectionTitle}>Invite Code</Text>
          <Text style={styles.subtitle}>
            {meetupCode ? 'Generated' : 'Optional'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.generateButton} 
          onPress={onGenerateCode}
        >
          <Ionicons 
            name={meetupCode ? "refresh" : "add"} 
            size={20} 
            color={Colors.primary} 
          />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.hint}>
        Others can join using this code
      </Text>

      {/* Code Display */}
      {meetupCode ? (
        <View style={styles.codeSection}>
          <View style={styles.codeContainer}>
            <View style={styles.codeDisplay}>
              <Text style={styles.codeText}>{meetupCode}</Text>
            </View>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={handleCopyCode}
            >
              <Ionicons name="copy-outline" size={18} color={Colors.primary} />
              <Text style={styles.copyText}>Copy</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.codeInfo}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.infoText}>
              Share this 6-digit code with friends so they can join your meetup
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="key-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.emptyStateText}>No invite code generated</Text>
          <Text style={styles.emptyStateSubtext}>
            Generate a code to let others join by code
          </Text>
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
  generateButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  
  // Code Section
  codeSection: {
    marginTop: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  copyText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  codeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
    flex: 1,
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
  },
});

export default InviteCodeCard;