import { createDirectMessage, getContacts, getRocketChatLogin, type Contact } from '@/app/api/rocketchat';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

// Helper function to safely show alerts
const showAlert = (title: string, message: string) => {
  try {
    // Use a small delay to ensure React has finished any pending updates
    setTimeout(() => {
      try {
        Alert.alert(title, message, [{ text: 'OK' }]);
      } catch (e) {
        console.error('Error showing alert:', e);
      }
    }, 200);
  } catch (e) {
    console.error('Error scheduling alert:', e);
  }
};

export default function MessagingScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingChat, setOpeningChat] = useState<string | null>(null); // Track which contact is being opened
  const [userRole, setUserRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      const contactsList = await getContacts();
      setContacts(contactsList || []);
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      const errorMsg = error?.message || 'Failed to load contacts';
      setError(errorMsg);
      showAlert('Error', errorMsg);
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
    // Prevent multiple simultaneous clicks
    if (openingChat) {
      console.log('Already opening a chat, ignoring click');
      return;
    }
    
    if (!contact || !contact._id) {
      console.error('Invalid contact:', contact);
      showAlert('Error', 'Invalid contact information');
      return;
    }
    
    // Clear any previous errors
    setError(null);
    
    try {
      setOpeningChat(contact._id);
      console.log('Starting chat setup for contact:', contact.email);
      
      // Get RocketChat login credentials with error handling
      let loginInfo;
      try {
        loginInfo = await getRocketChatLogin();
        console.log('Got RocketChat login info:', { 
          serverUrl: loginInfo?.serverUrl, 
          hasToken: !!loginInfo?.authToken 
        });
      } catch (loginError: any) {
        console.error('Error getting RocketChat login:', loginError);
        const errorMsg = `Failed to connect to RocketChat: ${loginError?.message || 'Unknown error'}`;
        setError(errorMsg);
        showAlert('Error', errorMsg);
        return;
      }
      
      if (!loginInfo || !loginInfo.serverUrl) {
        const errorMsg = 'Failed to get RocketChat server information';
        setError(errorMsg);
        showAlert('Error', errorMsg);
        return;
      }

      // Create or get direct message room with error handling
      let dmRoom;
      try {
        dmRoom = await createDirectMessage(contact._id);
        console.log('Created DM room:', { roomId: dmRoom?.roomId, roomName: dmRoom?.roomName });
      } catch (dmError: any) {
        console.error('Error creating DM:', dmError);
        const errorMsg = `Failed to create chat room: ${dmError?.message || 'Unknown error'}`;
        setError(errorMsg);
        showAlert('Error', errorMsg);
        return;
      }
      
      if (!dmRoom || (!dmRoom.roomName && !dmRoom.roomId)) {
        const errorMsg = 'Failed to create or find chat room - no room information returned';
        setError(errorMsg);
        showAlert('Error', errorMsg);
        return;
      }

      // Replace localhost with the local IP address for mobile devices
      // Extract IP from API_URL (e.g., http://192.168.1.10:5050 -> 192.168.1.10)
      let serverUrl = loginInfo.serverUrl || 'http://localhost:3000';
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5050';
      
      // Ensure serverUrl has protocol
      if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
        serverUrl = `http://${serverUrl}`;
      }
      
      // If serverUrl contains localhost, replace it with the IP from API_URL
      if (serverUrl.includes('localhost') && !apiUrl.includes('localhost')) {
        try {
          // Extract IP address and port from API_URL
          const urlMatch = apiUrl.match(/http:\/\/([^:]+)(?::(\d+))?/);
          if (urlMatch && urlMatch[1]) {
            const localIP = urlMatch[1];
            // Replace localhost with IP, preserving port if present
            serverUrl = serverUrl.replace(/localhost(?::(\d+))?/, (match, port) => {
              return port ? `${localIP}:${port}` : `${localIP}:3000`;
            });
          }
        } catch (e) {
          console.error('Error replacing localhost:', e);
        }
      }

      // Construct RocketChat URL - ensure it's a valid URL
      // RocketChat URL format: http://server/direct/username or http://server/group/roomName
      let chatUrl;
      
      // Remove @ prefix if present (RocketChat usernames might have @)
      const cleanRoomName = dmRoom.roomName?.replace(/^@/, '') || '';
      
      if (cleanRoomName) {
        // Check if it's a direct message (starts with username) or group (starts with dm_)
        if (cleanRoomName.startsWith('dm_')) {
          // It's a group/private room created by admin
          chatUrl = `${serverUrl}/group/${cleanRoomName}`;
        } else {
          // It's a direct message - use the username directly
          chatUrl = `${serverUrl}/direct/${cleanRoomName}`;
        }
        
        // Add auth token if available (for auto-login)
        if (loginInfo.authToken) {
          chatUrl += `?resumeToken=${loginInfo.authToken}`;
        } else {
          // If no auth token, add login hint to URL
          // User will need to log in manually, but we can pre-fill the room
          console.warn('No auth token available - user will need to log in manually');
        }
      } else if (dmRoom.roomId) {
        // Fallback: use roomId to construct URL
        // Try to determine if it's a DM or group based on roomId format
        chatUrl = `${serverUrl}/direct/${dmRoom.roomId}`;
        if (loginInfo.authToken) {
          chatUrl += `?resumeToken=${loginInfo.authToken}`;
        } else {
          console.warn('No auth token available - user will need to log in manually');
        }
      } else {
        const errorMsg = 'No room information available';
        setError(errorMsg);
        showAlert('Error', errorMsg);
        return;
      }
      
      console.log('Opening RocketChat URL:', chatUrl);

      // Validate URL before opening
      try {
        new URL(chatUrl); // This will throw if URL is invalid
      } catch (urlError) {
        console.error('Invalid URL constructed:', chatUrl);
        const errorMsg = `Invalid chat URL: ${chatUrl}`;
        setError(errorMsg);
        showAlert('Error', errorMsg);
        return;
      }

      // Open in browser with additional safety checks
      try {
        console.log('Attempting to open URL:', chatUrl);
        console.log('Auth token available:', !!loginInfo.authToken);
        
        // Double-check URL is valid
        if (!chatUrl || typeof chatUrl !== 'string') {
          throw new Error('Invalid URL to open');
        }
        
        if (!chatUrl.startsWith('http://') && !chatUrl.startsWith('https://')) {
          throw new Error(`URL must start with http:// or https://, got: ${chatUrl}`);
        }
        
        // If no auth token, we'll open RocketChat homepage and let user navigate
        if (!loginInfo.authToken) {
          console.warn('Opening RocketChat without auto-login - user will need to log in manually');
          // Instead of opening the specific room, open the RocketChat homepage
          // User can log in and then navigate to the room
          chatUrl = serverUrl; // Just open the RocketChat homepage
          
          // Show a helpful message after opening (don't block the browser)
          setTimeout(() => {
            showAlert(
              'Manual Login Required',
              `Please log in to RocketChat with:\n\nUsername: ${loginInfo.username}\n\nAfter logging in, you can find your chat room in the direct messages.`
            );
          }, 1000);
        }
        
        // Open browser with timeout protection
        const browserPromise = openBrowserAsync(chatUrl, {
          presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
        });
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Browser open timeout')), 10000);
        });
        
        const result = await Promise.race([browserPromise, timeoutPromise]);
        console.log('Browser opened successfully:', result);
      } catch (browserError: any) {
        console.error('Error opening browser:', browserError);
        const errorMsg = browserError?.message || browserError?.toString() || 'Unknown error';
        
        // Show error safely
        showAlert(
          'Cannot Open Chat',
          `Unable to open RocketChat.\n\nPlease ensure:\n1. RocketChat is running\n2. Your phone and computer are on the same Wi-Fi\n3. RocketChat is accessible\n\nError: ${errorMsg}`
        );
      }
    } catch (error: any) {
      console.error('Error in handleContactPress:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to open chat. Please try again.';
      setError(errorMessage);
      
      // Show error safely - don't throw, just show alert
      showAlert('Error', errorMessage);
    } finally {
      // Always reset opening state after a delay to ensure state updates complete
      setTimeout(() => {
        setOpeningChat(null);
      }, 500);
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

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)} style={styles.dismissButton}>
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </Pressable>
        </View>
      )}

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
          renderItem={({ item }) => {
            const isOpening = openingChat === item._id;
            return (
              <Pressable
                style={[styles.contactItem, isOpening && styles.contactItemDisabled]}
                onPress={() => handleContactPress(item)}
                disabled={isOpening || !!openingChat}
                android_ripple={{ color: '#E0E0E0' }}>
                <View style={styles.contactAvatar}>
                  <Ionicons name="person" size={24} color="#007AFF" />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactEmail}>{item.email}</Text>
                  <Text style={styles.contactSubtext}>
                    {isOpening ? 'Opening chat...' : 'Tap to start chatting'}
                  </Text>
                </View>
                {isOpening ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
                )}
              </Pressable>
            );
          }}
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
  contactItemDisabled: {
    opacity: 0.6,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    margin: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#C62828',
    marginLeft: 8,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
  dismissButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
});

