import {
    acceptMeetingRequest,
    getMeetingRequests,
    MeetingRequest,
    rejectMeetingRequest,
} from '@/app/api/meetings';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function MeetingRequestsScreen() {
  const [requests, setRequests] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MeetingRequest | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (userRole === 'clinician') {
      loadRequests();
    }
  }, [userRole]);

  const checkUserRole = async () => {
    const role = await SecureStore.getItemAsync('user_role');
    setUserRole(role);
    
    // Security: Only clinicians can access this screen
    if (role !== 'clinician') {
      Alert.alert('Access Denied', 'Only clinicians can view meeting requests.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
      return;
    }
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await getMeetingRequests();
      // Filter to show only pending requests
      setRequests(data.filter((r) => r.status === 'pending'));
    } catch (error) {
      console.error('Error loading meeting requests:', error);
      Alert.alert('Error', 'Failed to load meeting requests');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }, []);

  const handleAccept = async () => {
    if (!selectedRequest || !scheduledTime) {
      Alert.alert('Error', 'Please enter a scheduled time');
      return;
    }

    try {
      await acceptMeetingRequest(selectedRequest._id, scheduledTime);
      Alert.alert('Success', 'Meeting request accepted and meeting created!', [
        {
          text: 'OK',
          onPress: () => {
            setShowAcceptModal(false);
            setSelectedRequest(null);
            setScheduledTime('');
            loadRequests();
            router.push('/(tabs)/meetings' as any);
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error accepting meeting request:', error);
      Alert.alert('Error', error.message || 'Failed to accept meeting request');
    }
  };

  const handleReject = (request: MeetingRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedRequest) return;

    try {
      await rejectMeetingRequest(selectedRequest._id, rejectionReason);
      Alert.alert('Success', 'Meeting request rejected');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      loadRequests();
    } catch (error: any) {
      console.error('Error rejecting meeting request:', error);
      Alert.alert('Error', error.message || 'Failed to reject meeting request');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderRequest = ({ item }: { item: MeetingRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.requestInfo}>
          <Text style={styles.requestTitle}>Request from {item.patientId.email}</Text>
          <Text style={styles.requestDate}>Requested: {formatDate(item.requestedDate)}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      {item.preferredTime && (
        <View style={styles.requestDetail}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.requestDetailText}>{item.preferredTime}</Text>
        </View>
      )}

      {item.message && (
        <View style={styles.requestDetail}>
          <Ionicons name="chatbubble-outline" size={16} color="#666" />
          <Text style={styles.requestDetailText}>{item.message}</Text>
        </View>
      )}

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleReject(item)}
        >
          <Ionicons name="close-circle" size={20} color="#FF3B30" />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => {
            setSelectedRequest(item);
            setShowAcceptModal(true);
          }}
        >
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Security: Don't render if not a clinician
  if (userRole !== 'clinician') {
    return (
      <View style={styles.loadingContainer}>
        <Text>Access Denied</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading meeting requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meeting Requests</Text>
      </View>

      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.requestsList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyText}>No pending requests</Text>
          </View>
        }
      />

      {/* Accept Modal */}
      <Modal visible={showAcceptModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Schedule Meeting</Text>
            <Text style={styles.modalSubtitle}>
              Patient: {selectedRequest?.patientId.email}
            </Text>

            <Text style={styles.label}>Scheduled Time *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2024-01-15T14:00:00Z or Tomorrow at 2 PM"
              value={scheduledTime}
              onChangeText={setScheduledTime}
            />
            <Text style={styles.helpText}>
              Format: YYYY-MM-DDTHH:mm:ssZ or a descriptive time
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAcceptModal(false);
                  setSelectedRequest(null);
                  setScheduledTime('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAccept}
              >
                <Text style={styles.confirmButtonText}>Create Meeting</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal visible={showRejectModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Meeting Request</Text>
            <Text style={styles.modalSubtitle}>
              Patient: {selectedRequest?.patientId.email}
            </Text>

            <Text style={styles.label}>Rejection Reason (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Please provide a reason for rejecting this request..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.helpText}>
              Providing a reason helps the patient understand your decision
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                  setRejectionReason('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectConfirmButton]}
                onPress={confirmReject}
              >
                <Text style={styles.rejectConfirmButtonText}>Reject Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  requestsList: {
    padding: 15,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  requestDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  requestDetailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FFE5E5',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  rejectButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  rejectConfirmButton: {
    backgroundColor: '#FF3B30',
  },
  rejectConfirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

