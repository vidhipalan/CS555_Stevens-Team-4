import { createDirectMessage, getContacts, getMessages, sendMessage, type Contact, type Message } from '@/lib/api/rocketchat';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

export default function MessagingScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const handleBack = async () => {
    try {
      const role = await SecureStore.getItemAsync('user_role');
      if (role === 'clinician') {
        router.replace('/(tabs)/dashboard' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    } catch (error: any) {
      console.error('Error in handleBack:', error);
      router.replace('/(tabs)' as any);
    }
  };

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const contactsList = await getContacts();
      setContacts(contactsList || []);
      
      // If there's only one contact, auto-select it
      if (contactsList && contactsList.length === 1) {
        await handleContactSelect(contactsList[0]);
      }
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      const errorMsg = error?.message || 'Failed to load contacts';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleContactSelect = async (contact: Contact) => {
    try {
      // When switching contacts, clear previous room + messages first
      setSelectedContact(contact);
      setError(null);
      setRoomId(null);
      setMessages([]);
      
      // Create or get DM room for this specific contact
      const dmRoom = await createDirectMessage(contact._id);
      setRoomId(dmRoom.roomId);
      
      // Load messages for this room
      await loadMessages(dmRoom.roomId);
    } catch (error: any) {
      console.error('Error selecting contact:', error);
      const errorMsg = error?.message || 'Failed to open chat';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    }
  };

  const loadMessages = async (roomIdToLoad: string) => {
    try {
      setLoading(true);
      const messagesList = await getMessages(roomIdToLoad);
      setMessages(messagesList || []);
      
      // Scroll to bottom after messages load
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      const errorMsg = error?.message || 'Failed to load messages';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !roomId || sending) {
      return;
    }

    const textToSend = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      const newMessage = await sendMessage(roomId, textToSend);
      setMessages((prev) => [...prev, newMessage]);
      
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessageText(textToSend); // Restore message on error
      Alert.alert('Error', error?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = async () => {
    if (roomId) {
      setRefreshing(true);
      await loadMessages(roomId);
    } else {
      await fetchContacts();
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        const role = await SecureStore.getItemAsync('user_role');
        const userEmail = await SecureStore.getItemAsync('user_email');
        
        if (!isMounted) return;
        
        setUserRole(role);
        setEmail(userEmail || '');
        await fetchContacts();
      } catch (error: any) {
        if (!isMounted) return;
        console.error('Error loading messaging data:', error);
        setError(error?.message || 'Failed to load messaging data');
        setLoading(false);
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [fetchContacts]);

  // Auto-refresh messages every 5 seconds when a room is open
  useEffect(() => {
    if (!roomId) return;

    const interval = setInterval(() => {
      loadMessages(roomId);
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [roomId]);

  const formatTime = (timestamp: number | string | undefined | null) => {
    if (!timestamp) return '';

    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
    if (isNaN(date.getTime())) {
      // If the timestamp is invalid, don't show anything instead of "Invalid Date"
      return '';
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    
    return date.toLocaleDateString();
  };

  const title = userRole === 'clinician' ? 'Your Patients' : 'Your Clinician';

  // Show contact list if no contact selected
  if (!selectedContact) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
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

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : contacts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#CCCCCC" />
            <Text style={styles.emptyText}>No contacts available</Text>
            <Text style={styles.emptySubtext}>
              {userRole === 'clinician'
                ? 'You don\'t have any patients assigned yet.'
                : 'You don\'t have a clinician assigned yet. Please contact your administrator.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.contactItem}
                onPress={() => handleContactSelect(item)}
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
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#007AFF"
              />
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    );
  }

  // Show chat interface when contact is selected
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <View style={styles.header}>
        <Pressable onPress={() => setSelectedContact(null)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{selectedContact.email}</Text>
          <Text style={styles.subtitle}>Active</Text>
        </View>
      </View>

      {loading && messages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const isCurrentUser = item.userId === email || item.username === email.replace(/[@.]/g, '_');
            return (
              <View style={[styles.messageContainer, isCurrentUser && styles.messageContainerRight]}>
                <View style={[styles.messageBubble, isCurrentUser && styles.messageBubbleRight]}>
                  <Text style={[styles.messageText, isCurrentUser && styles.messageTextRight]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.messageTime, isCurrentUser && styles.messageTimeRight]}>
                    {formatTime(item.timestamp || item.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.messagesContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
            />
          }
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || sending}>
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerInfo: {
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
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
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  messageContainerRight: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageBubbleRight: {
    backgroundColor: '#007AFF',
  },
  messageText: {
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  messageTextRight: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 12,
    color: '#666666',
  },
  messageTimeRight: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
});

