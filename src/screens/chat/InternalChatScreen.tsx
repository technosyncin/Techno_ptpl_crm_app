import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { chatService, ChatUser, ChatMessage } from '../../api/chatService';
import { Colors } from '../../theme/colors';

interface InternalChatScreenProps {
  navigation: any;
  route?: any;
}

export const InternalChatScreen: React.FC<InternalChatScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const currentUserId: number = user?.id ? Number(user.id) : 1;

  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // 1. Fetch Users List
  const fetchUsers = useCallback(async () => {
    try {
      const data = await chatService.getChatUsers(currentUserId);
      setUsers(data);
    } catch (e) {
      console.warn('Error loading chat users:', e);
    }
  }, [currentUserId]);

  // 2. Fetch Conversation Messages
  const fetchMessages = useCallback(async (otherUserId: number) => {
    try {
      const data = await chatService.getMessages(otherUserId, currentUserId);
      setMessages(data);
      await chatService.markAsRead(otherUserId, currentUserId);
    } catch (e) {
      console.warn('Error loading messages:', e);
    }
  }, [currentUserId]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchUsers().finally(() => setLoading(false));
  }, [fetchUsers]);

  // Periodic polling for active conversation (every 4 seconds)
  useEffect(() => {
    if (!selectedUser) return;

    fetchMessages(selectedUser.id);
    const interval = setInterval(() => {
      fetchMessages(selectedUser.id);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedUser, fetchMessages]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedUser) {
      await fetchMessages(selectedUser.id);
    } else {
      await fetchUsers();
    }
    setRefreshing(false);
  };

  const handleSelectUser = (u: ChatUser) => {
    setSelectedUser(u);
    setMessages([]);
    fetchMessages(u.id);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedUser || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistic UI update
    const optimisticMsg: ChatMessage = {
      id: Date.now(),
      senderId: currentUserId,
      receiverId: selectedUser.id,
      message: textToSend,
      timestamp: new Date().toISOString(),
      status: 'sending',
      isRead: false,
      isDelivered: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await chatService.sendMessage(currentUserId, selectedUser.id, textToSend);
      await fetchMessages(selectedUser.id);
      fetchUsers();
    } catch (err) {
      console.error('Failed to send chat message:', err);
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.role && u.role.toLowerCase().includes(search.toLowerCase()))
  );

  const formatMessageTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // -------------------------------------------------------------
  // ACTIVE CHAT VIEW (CONVERSATION WITH SPECIFIC USER)
  // -------------------------------------------------------------
  if (selectedUser) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              setSelectedUser(null);
              fetchUsers();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.slate800} />
          </TouchableOpacity>

          <View style={styles.avatarCircleSmall}>
            <Text style={styles.avatarTextSmall}>{selectedUser.name.charAt(0).toUpperCase()}</Text>
          </View>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.chatHeaderName} numberOfLines={1}>{selectedUser.name}</Text>
            <Text style={styles.chatHeaderStatus}>{selectedUser.role || 'Colleague'} • Active</Text>
          </View>

          <TouchableOpacity style={styles.headerIconBtn} onPress={() => fetchMessages(selectedUser.id)}>
            <Ionicons name="refresh-outline" size={20} color={Colors.slate700} />
          </TouchableOpacity>
        </View>

        {/* Message Bubble Feed */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyMessagesBox}>
              <Ionicons name="chatbubbles-outline" size={44} color={Colors.slate300} />
              <Text style={styles.emptyMessagesText}>No messages yet</Text>
              <Text style={styles.emptyMessagesSub}>Say hello to start the internal conversation!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.senderId === currentUserId;
            return (
              <View style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
                <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                  <Text style={[styles.bubbleText, isMe ? styles.bubbleTextRight : styles.bubbleTextLeft]}>
                    {item.message}
                  </Text>
                  <View style={styles.bubbleFooter}>
                    <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeRight : styles.bubbleTimeLeft]}>
                      {formatMessageTime(item.timestamp)}
                    </Text>
                    {isMe && (
                      <Ionicons
                        name={item.isRead ? 'checkmark-done' : 'checkmark'}
                        size={14}
                        color={item.isRead ? '#93c5fd' : '#cbd5e1'}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />

        {/* Message Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.messageInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type internal message..."
            placeholderTextColor={Colors.slate400}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // -------------------------------------------------------------
  // USERS / CONVERSATIONS LIST VIEW
  // -------------------------------------------------------------
  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.slate800} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.topHeaderTitle}>Inbox</Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn} onPress={fetchUsers}>
          <Ionicons name="refresh-outline" size={22} color={Colors.slate700} />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={Colors.slate400} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search team members by name or role..."
          placeholderTextColor={Colors.slate400}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.slate400} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Team Members List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 10, color: Colors.slate500, fontSize: 13 }}>Loading colleagues...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={54} color={Colors.slate300} />
              <Text style={styles.emptyTitle}>No colleagues found</Text>
              <Text style={styles.emptySub}>No team members matching your search query.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.userCard}
              onPress={() => handleSelectUser(item)}
              activeOpacity={0.7}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                <View style={styles.onlineDot} />
              </View>

              <View style={styles.userCardBody}>
                <View style={styles.userCardRow}>
                  <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
                  {item.lastMessageTime && (
                    <Text style={styles.lastTimeText}>
                      {formatMessageTime(item.lastMessageTime)}
                    </Text>
                  )}
                </View>

                <View style={styles.userCardRow}>
                  <Text style={styles.lastMsgText} numberOfLines={1}>
                    {item.lastMessage || `${item.role || 'Team Member'}`}
                  </Text>
                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.slate900,
  },
  topHeaderSubtitle: {
    fontSize: 12,
    color: Colors.slate500,
    marginTop: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
  },
  headerIconBtn: {
    padding: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.slate800,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 1,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  userCardBody: {
    flex: 1,
    marginLeft: 12,
  },
  userCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.slate900,
    flex: 1,
  },
  lastTimeText: {
    fontSize: 11,
    color: Colors.slate400,
    marginLeft: 8,
  },
  lastMsgText: {
    fontSize: 13,
    color: Colors.slate500,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.slate700,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.slate400,
    marginTop: 4,
    textAlign: 'center',
  },

  // Active Chat Styles
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarCircleSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextSmall: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  chatHeaderName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.slate900,
  },
  chatHeaderStatus: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '500',
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  bubbleRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
  },
  bubbleLeft: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleRight: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextLeft: {
    color: Colors.slate900,
  },
  bubbleTextRight: {
    color: '#ffffff',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  bubbleTime: {
    fontSize: 10,
  },
  bubbleTimeLeft: {
    color: Colors.slate400,
  },
  bubbleTimeRight: {
    color: 'rgba(255,255,255,0.75)',
  },
  emptyMessagesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyMessagesText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.slate700,
    marginTop: 8,
  },
  emptyMessagesSub: {
    fontSize: 12,
    color: Colors.slate400,
    marginTop: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  messageInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: Colors.slate900,
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.slate300,
  },
});
