import {
  createDirectMessage,
  getChatUsers,
  getRocketChatToken,
  getRooms,
  getStoredRocketChatToken,
  RocketChatRoom,
  RocketChatUser,
} from '@/app/utils/rocketchat';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ChatListScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [rooms, setRooms] = useState<RocketChatRoom[]>([]);
  const [availableUsers, setAvailableUsers] = useState<RocketChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);

  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Ensure we have a Rocket.Chat token
      let token = await getStoredRocketChatToken();
      if (!token) {
        token = await getRocketChatToken();
      }

      // Load rooms and available users in parallel
      const [roomList, users] = await Promise.all([
        getRooms(),
        getChatUsers(),
      ]);
      
      // Filter to show only direct messages
      const filteredRooms = roomList.filter((room) => room.t === 'd');
      
      setRooms(filteredRooms);
      setAvailableUsers(users);
    } catch (error: any) {
      console.error('Error loading data:', error);
      Alert.alert('Error', error.message || 'Failed to load chats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRoomPress = (room: RocketChatRoom) => {
    router.push({
      pathname: '/chat' as any,
      params: {
        roomId: room._id,
        roomName: room.name || room.fname || 'Chat',
      },
    });
  };

  const handleUserPress = async (user: RocketChatUser) => {
    try {
      setLoading(true);
      // Create or get direct message room
      const room = await createDirectMessage(user.username);
      setShowNewChat(false);
      router.push({
        pathname: '/chat' as any,
        params: {
          roomId: room._id,
          roomName: user.name || user.username,
        },
      });
    } catch (error: any) {
      console.error('Error creating chat:', error);
      Alert.alert('Error', error.message || 'Failed to start chat');
    } finally {
      setLoading(false);
    }
  };

  const renderRoom = ({ item }: { item: RocketChatRoom }) => {
    return (
      <TouchableOpacity
        style={[
          styles.roomItem,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.text + '20',
          },
        ]}
        onPress={() => handleRoomPress(item)}
      >
        <View style={styles.roomContent}>
          <Text style={[styles.roomName, { color: colors.text }]}>
            {item.name || item.fname || 'Unnamed Chat'}
          </Text>
          {item.lastMessage && (
            <Text
              style={[styles.lastMessage, { color: colors.text + '60' }]}
              numberOfLines={1}
            >
              {item.lastMessage.msg}
            </Text>
          )}
        </View>
        {item.unread && item.unread > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.tint }]}>
            <Text style={styles.unreadText}>{item.unread}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderUser = ({ item }: { item: RocketChatUser }) => {
    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.text + '20',
          },
        ]}
        onPress={() => handleUserPress(item)}
      >
        <View style={styles.userContent}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {item.name || item.username}
          </Text>
          <Text style={[styles.userEmail, { color: colors.text + '60' }]}>
            {item.email}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && rooms.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Chats',
            headerShown: true,
          }}
        />
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading chats...
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Chats',
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setShowNewChat(!showNewChat)}
              style={styles.newChatButton}
            >
              <Text style={[styles.newChatText, { color: colors.tint }]}>
                {showNewChat ? 'Cancel' : 'New Chat'}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {showNewChat ? (
          <View style={styles.newChatContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Start a new conversation
            </Text>
            {availableUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.text + '80' }]}>
                  No users available
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableUsers}
                renderItem={renderUser}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
        ) : (
          <>
            {rooms.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.text + '80' }]}>
                  No chats yet. Tap "New Chat" to start a conversation!
                </Text>
              </View>
            ) : (
              <FlatList
                data={rooms}
                renderItem={renderRoom}
                keyExtractor={(item) => item._id}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                contentContainerStyle={styles.listContent}
              />
            )}
          </>
        )}
      </View>
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
  listContent: {
    paddingVertical: 8,
  },
  roomItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  roomContent: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    marginTop: 4,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 12,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  newChatButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  newChatText: {
    fontSize: 16,
    fontWeight: '600',
  },
  newChatContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
    paddingBottom: 8,
  },
  userItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  userContent: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
});
