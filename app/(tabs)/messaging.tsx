import { createDirectMessage, getContacts, getRocketChatLogin, type Contact } from '@/app/api/rocketchat';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

export default function MessagingScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      const role = await SecureStore.getItemAsync('user_role');
      const userEmail = await SecureStore.getItemAsync('user_email');
      setUserRole(role);
      setEmail(userEmail || '');
      await fetchContacts();
    };
    loadData();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const contactsList = await getContacts();
      setContacts(contactsList);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchContacts();
  };

  const handleContactPress = async (contact: Contact) => {
    try {
      // Show loading indicator
      Alert.alert('Opening chat...', 'Please wait while we set up your chat session.', [], { cancelable: false });

      // Get RocketChat login credentials
      const loginInfo = await getRocketChatLogin();

      // Create or get direct message room
      const dmRoom = await createDirectMessage(contact._id);

      // Replace localhost with the local IP address for mobile devices
      // Extract IP from API_URL (e.g., http://192.168.1.10:5050 -> 192.168.1.10)
      let serverUrl = loginInfo.serverUrl;
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5050';
      
      // If serverUrl contains localhost, replace it with the IP from API_URL
      if (serverUrl.includes('localhost') && !apiUrl.includes('localhost')) {
        try {
          // Extract IP address from API_URL
          const urlMatch = apiUrl.match(/http:\/\/([^:]+)/);
          if (urlMatch && urlMatch[1]) {
            const localIP = urlMatch[1];
            serverUrl = serverUrl.replace('localhost', localIP);
          }
        } catch (e) {
          console.error('Error replacing localhost:', e);
        }
      }

      // Construct RocketChat URL
      const chatUrl = `${serverUrl}/direct/${dmRoom.roomName}?resumeToken=${loginInfo.authToken || ''}`;

      // Open in browser
      await openBrowserAsync(chatUrl, {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open chat. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading contacts...</Text>
      </View>
    );
  }

  const title = userRole === 'clinician' ? 'Your Patients' : 'Your Clinicians';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
      </View>

      {contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>No contacts available</Text>
          <Text style={styles.emptySubtext}>
            {userRole === 'clinician'
              ? 'You don\'t have any patients assigned yet.'
              : 'You don\'t have a clinician assigned yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.contactItem}
              onPress={() => handleContactPress(item)}
              android_ripple={{ color: '#E0E0E0' }}>
              <View style={styles.contactAvatar}>
                <Ionicons name="person" size={24} color="#007AFF" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactEmail}>{item.email}</Text>
                <Text style={styles.contactSubtext}>Tap to start chatting</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
            </Pressable>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  listContent: {
    padding: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  contactSubtext: {
    fontSize: 14,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

