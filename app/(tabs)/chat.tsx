import {
  getRocketChatToken,
  getRoomMessages,
  getStoredRocketChatToken,
  RocketChatMessage,
  sendMessage,
} from '@/app/utils/rocketchat';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Message {
  _id: string;
  text: string;
  timestamp: Date;
  userId: string;
  username: string;
  isOwn: boolean;
}

export default function ChatScreen() {
  const { roomId, roomName } = useLocalSearchParams<{ roomId: string; roomName: string }>();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const colors = Colors[colorScheme ?? 'light'];

  // Initialize Rocket.Chat connection and load messages
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setLoading(true);
        
        // Try to get stored token first
        let token = await getStoredRocketChatToken();
        
        // If no stored token, get new one
        if (!token) {
          token = await getRocketChatToken();
        }
        
        // Load initial messages
        if (roomId) {
          await loadMessages();
        }
      } catch (error: any) {
        console.error('Chat initialization error:', error);
        Alert.alert('Error', error.message || 'Failed to initialize chat');
      } finally {
        setLoading(false);
      }
    };

    initializeChat();

    // Set up polling for new messages (every 2 seconds)
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (roomId) {
      intervalId = setInterval(() => {
        loadMessages().catch(console.error);
      }, 2000);
    }

    // Cleanup polling on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [roomId]);

  const loadMessages = async () => {
    if (!roomId) return;

    try {
      const rocketMessages = await getRoomMessages(roomId, 50);
      
      const token = await getStoredRocketChatToken();
      const formattedMessages: Message[] = rocketMessages.map((msg: RocketChatMessage) => ({
        _id: msg._id,
        text: msg.msg,
        timestamp: new Date(msg.ts),
        userId: msg.u._id,
        username: msg.u.username,
        isOwn: msg.u._id === token?.userId,
      }));

      // Sort by timestamp (oldest first)
      formattedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      setMessages(formattedMessages);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      // Don't show alert for polling errors to avoid spam
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !roomId || sending) return;

    try {
      setSending(true);
      await sendMessage(roomId, inputText.trim());
      setInputText('');
      
      // Reload messages to show the new one
      await loadMessages();
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.isOwn;
    
    return (
      <View
        style={[
          styles.messageContainer,
          isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {!isOwn && (
          <Text style={[styles.username, { color: colors.text }]}>
            {item.username}
          </Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isOwn
              ? { backgroundColor: colors.tint }
              : { backgroundColor: colors.text + '15', borderWidth: 1, borderColor: colors.text + '20' },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwn ? styles.ownMessageText : { color: colors.text },
            ]}
          >
            {item.text}
          </Text>
        </View>
        <Text style={[styles.timestamp, { color: colors.text + '80' }]}>
          {formatTime(item.timestamp)}
        </Text>
      </View>
    );
  };

  if (loading && messages.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            title: roomName || 'Chat',
            headerShown: true,
          }}
        />
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading chat...
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: roomName || 'Chat',
          headerShown: true,
        }}
      />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.messagesList,
            { paddingBottom: insets.bottom },
          ]}
          inverted={false}
        />

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 10),
              borderTopColor: colors.text + '20',
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.text + '10',
                color: colors.text,
                borderColor: colors.text + '20',
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={colors.text + '60'}
            multiline
            maxLength={1000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: colors.tint,
                opacity: inputText.trim() && !sending ? 1 : 0.5,
              },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  username: {
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 12,
    fontWeight: '600',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    marginHorizontal: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
