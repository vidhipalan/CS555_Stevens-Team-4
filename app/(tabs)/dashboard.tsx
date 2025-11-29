import { API_ENDPOINTS } from '@/constants/config';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Patient {
  _id: string;
  email: string;
  role: string;
  createdAt: string;
  assignedClinicianId?: string | null;
}

interface AllPatient {
  _id: string;
  email: string;
  role: string;
  createdAt: string;
  assignedClinicianId?: {
    _id: string;
    email: string;
  } | null;
}

export default function DashboardScreen() {
  const [email, setEmail] = useState<string>('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allPatients, setAllPatients] = useState<AllPatient[]>([]);
  const [loadingAllPatients, setLoadingAllPatients] = useState(false);

  const fetchPatients = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(API_ENDPOINTS.AUTH.PATIENTS, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }

      const data = await response.json();
      setPatients(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load patients');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      const e = await SecureStore.getItemAsync('user_email');
      if (e) setEmail(e);
      const role = await SecureStore.getItemAsync('user_role');
      setUserRole(role);
      
      // Get current user ID
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        try {
          const response = await fetch(API_ENDPOINTS.AUTH.ME, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            setCurrentUserId(data.user._id);
          }
        } catch (err) {
          console.error('Failed to fetch current user:', err);
        }
      }
      
      await fetchPatients();
    };
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPatients();
  };

  const fetchAllPatients = async () => {
    try {
      setLoadingAllPatients(true);
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(API_ENDPOINTS.AUTH.ALL_PATIENTS, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch all patients');
      }

      const data = await response.json();
      setAllPatients(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load patients');
    } finally {
      setLoadingAllPatients(false);
    }
  };

  const handleAssignPatient = async (patientId: string) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      const response = await fetch(API_ENDPOINTS.AUTH.ASSIGN_PATIENT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patientId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign patient');
      }

      Alert.alert('Success', 'Patient assigned successfully');
      await fetchAllPatients();
      await fetchPatients();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to assign patient');
    }
  };

  const handleUnassignPatient = async (patientId: string) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      const response = await fetch(API_ENDPOINTS.AUTH.UNASSIGN_PATIENT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patientId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unassign patient');
      }

      Alert.alert('Success', 'Patient unassigned successfully');
      await fetchAllPatients();
      await fetchPatients();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to unassign patient');
    }
  };

  const openAssignModal = () => {
    setShowAssignModal(true);
    fetchAllPatients();
  };

  const handlePatientPress = (patient: Patient) => {
    // Navigate to patient detail screen
    router.push({
      pathname: '/(tabs)/patient-detail' as any,
      params: { patientId: patient._id, patientEmail: patient.email }
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <Pressable style={styles.patientCard} onPress={() => handlePatientPress(item)}>
      <View style={styles.patientHeader}>
        <View style={styles.patientInfo}>
          <View style={styles.patientAvatar}>
            <Text style={styles.patientAvatarText}>{item.email.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.patientEmail}>{item.email}</Text>
            <Text style={styles.patientDate}>Joined {formatDate(item.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.patientBadge}>
          <Text style={styles.patientBadgeText}>Patient</Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Clinician Dashboard</Text>
          <Text style={styles.subtitle}>Welcome, {email || 'Doctor'}</Text>
        </View>
        <View style={styles.headerButtonsContainer}>
          <TouchableOpacity
            style={styles.assignButton}
            onPress={openAssignModal}
          >
            <Ionicons name="person-add" size={18} color="#fff" />
            <Text style={styles.assignButtonText}>Assign</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.meetingRequestsButton}
            onPress={() => {
              // Security: Only allow clinicians to access meeting requests
              if (userRole === 'clinician') {
                router.push('/(tabs)/meeting-requests' as any);
              } else {
                Alert.alert('Access Denied', 'Only clinicians can view meeting requests.');
              }
            }}
          >
            <Ionicons name="mail" size={18} color="#fff" />
            <Text style={styles.meetingRequestsButtonText}>Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.messagingButton}
            onPress={() => {
              if (userRole === 'clinician') {
                router.push('/(tabs)/messaging' as any);
              } else {
                Alert.alert('Access Denied', 'Only clinicians can access messaging.');
              }
            }}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
            <Text style={styles.messagingButtonText}>Messages</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{patients.length}</Text>
          <Text style={styles.statLabel}>Total Patients</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{patients.length}</Text>
          <Text style={styles.statLabel}>Active Patients</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient List</Text>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={fetchPatients}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : patients.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No patients yet</Text>
          </View>
        ) : (
          <FlatList
            data={patients}
            renderItem={renderPatientItem}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      <Modal
        visible={showAssignModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assign Patients</Text>
            <Pressable onPress={() => setShowAssignModal(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </Pressable>
          </View>

          {loadingAllPatients ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          ) : (
            <FlatList
              data={allPatients}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => {
                const isAssigned = !!item.assignedClinicianId;
                const assignedClinicianEmail = item.assignedClinicianId && typeof item.assignedClinicianId === 'object' 
                  ? item.assignedClinicianId.email 
                  : null;
                const isAssignedToMe = isAssigned && currentUserId && 
                  item.assignedClinicianId && typeof item.assignedClinicianId === 'object' &&
                  item.assignedClinicianId._id === currentUserId;

                return (
                  <View style={styles.modalPatientCard}>
                    <View style={styles.modalPatientInfo}>
                      <View style={styles.patientAvatar}>
                        <Text style={styles.patientAvatarText}>
                          {item.email.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.modalPatientDetails}>
                        <Text style={styles.patientEmail}>{item.email}</Text>
                        {isAssigned && assignedClinicianEmail && (
                          <Text style={styles.assignedText}>
                            Assigned to: {assignedClinicianEmail}
                          </Text>
                        )}
                        {!isAssigned && (
                          <Text style={styles.unassignedText}>Unassigned</Text>
                        )}
                      </View>
                    </View>
                    {isAssignedToMe ? (
                      <TouchableOpacity
                        style={styles.unassignButton}
                        onPress={() => handleUnassignPatient(item._id)}
                      >
                        <Text style={styles.unassignButtonText}>Unassign</Text>
                      </TouchableOpacity>
                    ) : !isAssigned ? (
                      <TouchableOpacity
                        style={styles.assignButtonModal}
                        onPress={() => handleAssignPatient(item._id)}
                      >
                        <Text style={styles.assignButtonTextModal}>Assign</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.assignedToOtherButton}>
                        <Text style={styles.assignedToOtherText}>Assigned</Text>
                      </View>
                    )}
                  </View>
                );
              }}
              contentContainerStyle={styles.modalListContainer}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    backgroundColor: '#6366F1',
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingRight: 16,
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  meetingRequestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  messagingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  meetingRequestsButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  messagingButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6366F1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  section: {
    flex: 1,
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  patientCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  patientEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  patientDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  patientBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  patientBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  modalListContainer: {
    padding: 16,
  },
  modalPatientCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  modalPatientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalPatientDetails: {
    flex: 1,
  },
  assignedText: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
  },
  unassignedText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  assignButtonModal: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  assignButtonTextModal: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  unassignButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unassignButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  assignedToOtherButton: {
    backgroundColor: '#9CA3AF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  assignedToOtherText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
