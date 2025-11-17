import { Clinician, createMeetingRequest, getClinicians } from '@/app/api/meetings';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function RequestMeetingScreen() {
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [selectedClinician, setSelectedClinician] = useState<string | null>(null);
  const [preferredTime, setPreferredTime] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (userRole === 'patient') {
      loadClinicians();
    }
  }, [userRole]);

  const checkUserRole = async () => {
    const role = await SecureStore.getItemAsync('user_role');
    setUserRole(role);
    
    // Security: Only patients can request meetings
    if (role !== 'patient') {
      Alert.alert('Access Denied', 'Only patients can request meetings.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
      return;
    }
  };

  const loadClinicians = async () => {
    try {
      setLoading(true);
      const data = await getClinicians();
      setClinicians(data);
    } catch (error) {
      console.error('Error loading clinicians:', error);
      Alert.alert('Error', 'Failed to load clinicians');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Security: Double-check user is a patient
    if (userRole !== 'patient') {
      Alert.alert('Access Denied', 'Only patients can request meetings.');
      router.back();
      return;
    }

    if (!selectedClinician) {
      Alert.alert('Error', 'Please select a clinician');
      return;
    }

    try {
      setSubmitting(true);
      await createMeetingRequest(selectedClinician, preferredTime || undefined, message || undefined);
      Alert.alert('Success', 'Meeting request sent successfully. The clinician will be notified.', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to meetings tab (patient view)
            router.replace('/(tabs)/meetings' as any);
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error creating meeting request:', error);
      Alert.alert('Error', error.message || 'Failed to send meeting request');
    } finally {
      setSubmitting(false);
    }
  };

  // Security: Don't render if not a patient
  if (userRole !== 'patient') {
    return (
      <View style={styles.loadingContainer}>
        <Text>Access Denied</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading clinicians...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Meeting</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Select Clinician *</Text>
        <View style={styles.clinicianList}>
          {clinicians.map((clinician) => (
            <TouchableOpacity
              key={clinician._id}
              style={[
                styles.clinicianCard,
                selectedClinician === clinician._id && styles.clinicianCardSelected,
              ]}
              onPress={() => setSelectedClinician(clinician._id)}
            >
              <Ionicons
                name={selectedClinician === clinician._id ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={selectedClinician === clinician._id ? '#007AFF' : '#8E8E93'}
              />
              <Text style={styles.clinicianEmail}>{clinician.email}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Preferred Time (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Tomorrow at 2 PM"
          value={preferredTime}
          onChangeText={setPreferredTime}
        />

        <Text style={styles.label}>Message (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Add any additional information..."
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="white" />
              <Text style={styles.submitButtonText}>Send Request</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  clinicianList: {
    marginBottom: 10,
  },
  clinicianCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  clinicianCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  clinicianEmail: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 100,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

