import {
    cancelMeeting,
    cancelMeetingRequest,
    getMeetings,
    getMyMeetingRequests,
    Meeting,
    MeetingRequest
} from '@/app/api/meetings';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Linking,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type MeetingItem = Meeting | (MeetingRequest & { type: 'request' });

export default function MeetingsScreen() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingRequests, setMeetingRequests] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'meetings' | 'requests'>('meetings');
  const router = useRouter();

  useEffect(() => {
    loadUserRole();
  }, []);

  useEffect(() => {
    if (userRole) {
      loadMeetings();
      if (userRole === 'patient') {
        loadMeetingRequests();
      }
    }
  }, [userRole]);

  const loadUserRole = async () => {
    const role = await SecureStore.getItemAsync('user_role');
    setUserRole(role);
  };

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const data = await getMeetings();
      setMeetings(data);
    } catch (error) {
      console.error('Error loading meetings:', error);
      Alert.alert('Error', 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const loadMeetingRequests = async () => {
    try {
      const data = await getMyMeetingRequests();
      setMeetingRequests(data);
    } catch (error) {
      console.error('Error loading meeting requests:', error);
      // Don't show alert for requests, just log
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMeetings();
    if (userRole === 'patient') {
      await loadMeetingRequests();
    }
    setRefreshing(false);
  }, [userRole]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#007AFF';
      case 'in-progress':
        return '#34C759';
      case 'completed':
        return '#8E8E93';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const handleJoinMeeting = async (meetingLink: string) => {
    const supported = await Linking.canOpenURL(meetingLink);
    if (supported) {
      await Linking.openURL(meetingLink);
    } else {
      Alert.alert('Error', 'Cannot open meeting link');
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this meeting request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelMeetingRequest(requestId);
              Alert.alert('Success', 'Meeting request cancelled');
              await loadMeetingRequests();
              await loadMeetings(); // Refresh meetings in case it was accepted
            } catch (error: any) {
              console.error('Error cancelling request:', error);
              Alert.alert('Error', error.message || 'Failed to cancel meeting request');
            }
          },
        },
      ]
    );
  };

  const handleCancelMeeting = async (meetingId: string) => {
    Alert.alert(
      'Cancel Meeting',
      'Are you sure you want to cancel this meeting?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelMeeting(meetingId);
              Alert.alert('Success', 'Meeting cancelled');
              await loadMeetings();
            } catch (error: any) {
              console.error('Error cancelling meeting:', error);
              Alert.alert('Error', error.message || 'Failed to cancel meeting');
            }
          },
        },
      ]
    );
  };

  const renderMeeting = ({ item }: { item: Meeting }) => {
    const isPatient = userRole === 'patient';
    const otherUser = isPatient ? item.clinicianId : item.patientId;

    return (
      <View style={styles.meetingCard}>
        <View style={styles.meetingHeader}>
          <View style={styles.meetingInfo}>
            <Text style={styles.meetingTitle}>
              Meeting with {otherUser.email}
            </Text>
            <Text style={styles.meetingDate}>{formatDate(item.scheduledTime)}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.meetingDetails}>
          <Text style={styles.meetingId}>Meeting ID: {item.meetingId}</Text>
          <Text style={styles.duration}>Duration: {item.duration} minutes</Text>
        </View>

        <View style={styles.meetingActions}>
          {item.status === 'scheduled' && (
            <>
              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => handleJoinMeeting(item.meetingLink)}
              >
                <Ionicons name="videocam" size={20} color="white" />
                <Text style={styles.joinButtonText}>Join Meeting</Text>
              </TouchableOpacity>
              {isPatient && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancelMeeting(item._id)}
                >
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {item.status === 'in-progress' && (
            <>
              <TouchableOpacity
                style={[styles.joinButton, { backgroundColor: '#34C759' }]}
                onPress={() => handleJoinMeeting(item.meetingLink)}
              >
                <Ionicons name="play-circle" size={20} color="white" />
                <Text style={styles.joinButtonText}>Join Now</Text>
              </TouchableOpacity>
              {isPatient && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancelMeeting(item._id)}
                >
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {(item.status === 'cancelled' || item.status === 'completed') && isPatient && (
            <View style={styles.statusMessage}>
              <Text style={styles.statusMessageText}>
                {item.status === 'cancelled' ? 'This meeting has been cancelled' : 'This meeting has been completed'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderMeetingRequest = ({ item }: { item: MeetingRequest }) => {
    const getRequestStatusColor = (status: string) => {
      switch (status) {
        case 'pending':
          return '#FF9500';
        case 'accepted':
          return '#34C759';
        case 'rejected':
          return '#FF3B30';
        case 'cancelled':
          return '#8E8E93';
        default:
          return '#8E8E93';
      }
    };

    return (
      <View style={styles.meetingCard}>
        <View style={styles.meetingHeader}>
          <View style={styles.meetingInfo}>
            <Text style={styles.meetingTitle}>
              Request to {item.clinicianId.email}
            </Text>
            <Text style={styles.meetingDate}>
              Requested: {formatDate(item.createdAt)}
            </Text>
            {item.preferredTime && (
              <Text style={styles.preferredTime}>Preferred: {item.preferredTime}</Text>
            )}
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getRequestStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        {item.message && (
          <View style={styles.meetingDetails}>
            <Text style={styles.messageText}>{item.message}</Text>
          </View>
        )}

        <View style={styles.meetingActions}>
          {item.status === 'pending' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelRequest(item._id)}
            >
              <Ionicons name="close-circle" size={20} color="#FF3B30" />
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          )}

          {item.status === 'accepted' && item.meetingId && (
            <View style={styles.statusMessage}>
              <Text style={styles.statusMessageText}>
                Request accepted! Check "Scheduled Meetings" tab for meeting details.
              </Text>
            </View>
          )}

          {item.status === 'rejected' && (
            <View style={styles.statusMessage}>
              <Text style={styles.statusMessageText}>
                This request was rejected by the clinician.
              </Text>
              {item.rejectionReason && (
                <Text style={styles.rejectionReasonText}>
                  Reason: {item.rejectionReason}
                </Text>
              )}
            </View>
          )}

          {item.status === 'cancelled' && (
            <View style={styles.statusMessage}>
              <Text style={styles.statusMessageText}>
                This request has been cancelled.
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading meetings...</Text>
      </View>
    );
  }

  const renderContent = () => {
    if (userRole === 'patient' && activeTab === 'requests') {
      return (
        <FlatList
          data={meetingRequests}
          renderItem={renderMeetingRequest}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.meetingsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-outline" size={64} color="#8E8E93" />
              <Text style={styles.emptyText}>No meeting requests</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => {
                  if (userRole === 'patient') {
                    router.push('/(tabs)/request-meeting' as any);
                  }
                }}
              >
                <Text style={styles.emptyButtonText}>Request a Meeting</Text>
              </TouchableOpacity>
            </View>
          }
        />
      );
    }

    return (
      <FlatList
        data={meetings}
        renderItem={renderMeeting}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.meetingsList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyText}>No meetings scheduled</Text>
            {userRole === 'patient' && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => {
                  if (userRole === 'patient') {
                    router.push('/(tabs)/request-meeting' as any);
                  }
                }}
              >
                <Text style={styles.emptyButtonText}>Request a Meeting</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meetings</Text>
        {userRole === 'patient' && (
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => {
              if (userRole === 'patient') {
                router.push('/(tabs)/request-meeting' as any);
              }
            }}
          >
            <Ionicons name="add-circle" size={24} color="#007AFF" />
            <Text style={styles.requestButtonText}>Request</Text>
          </TouchableOpacity>
        )}
      </View>

      {userRole === 'patient' && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'meetings' && styles.activeTab]}
            onPress={() => setActiveTab('meetings')}
          >
            <Text style={[styles.tabText, activeTab === 'meetings' && styles.activeTabText]}>
              Scheduled ({meetings.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              My Requests ({meetingRequests.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {renderContent()}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  requestButtonText: {
    marginLeft: 4,
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  meetingsList: {
    padding: 15,
  },
  meetingCard: {
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
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  meetingInfo: {
    flex: 1,
  },
  meetingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  meetingDate: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  meetingDetails: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  meetingId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  duration: {
    fontSize: 12,
    color: '#666',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  meetingActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusMessage: {
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginTop: 10,
  },
  statusMessageText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  preferredTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  rejectionReasonText: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

