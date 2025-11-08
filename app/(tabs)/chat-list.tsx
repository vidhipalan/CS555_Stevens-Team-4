import {
    getRocketChatToken,
    getRooms,
    getStoredRocketChatToken,
    RocketChatRoom,
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      
      // Ensure we have a Rocket.Chat token
      let token = await getStoredRocketChatToken();
      if (!token) {
        token = await getRocketChatToken();
      }

      const roomList = await getRooms();
      
      // Filter to show only direct messages and private groups
      // You can customize this based on your needs
      const filteredRooms = roomList.filter(
        (room) => room.t === 'd' || room.t === 'p' || room.t === 'c'
      );
      
      setRooms(filteredRooms);
    } catch (error: any) {
      console.error('Error loading rooms:', error);
      Alert.alert('Error', error.message || 'Failed to load chats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadRooms();
  };

  const handleRoomPress = (room: RocketChatRoom) => {
    // @ts-ignore - expo-router dynamic routes
    router.push(`/(tabs)/chat?roomId=${room._id}&roomName=${encodeURIComponent(room.name || 'Chat')}`);
  };

  const getRoomTypeLabel = (type: string) => {
    switch (type) {
      case 'd':
        return 'Direct Message';
      case 'p':
        return 'Private Group';
      case 'c':
        return 'Channel';
      default:
        return 'Chat';
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
            {item.name || 'Unnamed Chat'}
          </Text>
          <Text style={[styles.roomType, { color: colors.text + '80' }]}>
            {getRoomTypeLabel(item.t)}
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading chats...
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Chats',
          headerShown: true,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {rooms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.text + '80' }]}>
              No chats yet. Start a conversation!
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
  roomType: {
    fontSize: 12,
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
});

