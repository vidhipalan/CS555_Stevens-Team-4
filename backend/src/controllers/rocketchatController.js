const axios = require('axios');
const User = require('../models/User');

// Rocket.Chat server configuration
const ROCKETCHAT_URL = process.env.ROCKETCHAT_URL || 'http://localhost:3000';
const ROCKETCHAT_ADMIN_USER = process.env.ROCKETCHAT_ADMIN_USER || 'admin';
const ROCKETCHAT_ADMIN_PASSWORD = process.env.ROCKETCHAT_ADMIN_PASSWORD || 'admin';

let adminAuthToken = '';
let adminUserId = '';

// Login as admin to get auth token
const loginAsAdmin = async () => {
  try {
    const response = await axios.post(`${ROCKETCHAT_URL}/api/v1/login`, {
      user: ROCKETCHAT_ADMIN_USER,
      password: ROCKETCHAT_ADMIN_PASSWORD,
    });
    
    adminAuthToken = response.data.data.authToken;
    adminUserId = response.data.data.userId;
    return { token: adminAuthToken, userId: adminUserId };
  } catch (error) {
    console.error('Error logging in as Rocket.Chat admin:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Rocket.Chat server');
  }
};

// Build a deterministic RC username from our Mongo user id
const buildRcUsernameFromId = (appUserId) => {
  const raw = String(appUserId);
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `app_${cleaned}`;
};

// Get or create Rocket.Chat user (keyed by our Mongo user id, not by email)
const getOrCreateRocketChatUser = async (appUserId, email, role) => {
  // Ensure admin is logged in
  if (!adminAuthToken) {
    await loginAsAdmin();
  }

  const username = buildRcUsernameFromId(appUserId);
  let existingUser = null;

  // 1) Try to find user by our deterministic username
  try {
    const checkResponse = await axios.get(
      `${ROCKETCHAT_URL}/api/v1/users.info`,
      {
        params: { username },
        headers: {
          'X-Auth-Token': adminAuthToken,
          'X-User-Id': adminUserId,
        },
      }
    );

    if (checkResponse.data.success && checkResponse.data.user) {
      const foundUser = checkResponse.data.user;
      if (foundUser.username && foundUser.username !== 'rocket.cat') {
        existingUser = foundUser;
        console.log(`Found existing RC user by username: ${username} (${foundUser._id})`);
      }
    }
  } catch (error) {
    console.log(
      `RC user not found by username ${username}, will create`,
      error.response?.data || error.message
    );
  }

  // 2) If user exists, just return their info (we'll use admin token for API calls)
  if (existingUser) {
    return {
      username: existingUser.username,
      userId: existingUser._id,
      authToken: null,
    };
  }

  // 3) Create new Rocket.Chat user for this app user id
  console.log(`RC user ${username} not found, creating new user for app user ${appUserId}...`);
  try {
    const password = Math.random().toString(36).slice(-12) + 'A1!'; // strong random password
    const createResponse = await axios.post(
      `${ROCKETCHAT_URL}/api/v1/users.create`,
      {
        email,
        name: email,
        username,
        password,
        roles: ['user'],
        verified: true,
      },
      {
        headers: {
          'X-Auth-Token': adminAuthToken,
          'X-User-Id': adminUserId,
        },
      }
    );

    if (createResponse.data.success && createResponse.data.user) {
      const newUser = createResponse.data.user;
      console.log(`✅ Created RC user ${username} (${newUser._id}) for app user ${appUserId}`);
      return {
        username: newUser.username,
        userId: newUser._id,
        authToken: null,
      };
    }

    const errorMsg = createResponse.data?.error || 'Failed to create Rocket.Chat user';
    throw new Error(errorMsg);
  } catch (error) {
    console.error('Error creating Rocket.Chat user:', error.response?.data || error.message);
    throw new Error(`Failed to create Rocket.Chat user for app user ${appUserId}: ${error.response?.data?.error || error.message}`);
  }
};

// @route   GET /api/rocketchat/login
// @desc    Get Rocket.Chat login credentials for current user
// @access  Private
exports.getRocketChatLogin = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure admin is logged in
    if (!adminAuthToken) {
      await loginAsAdmin();
    }

    // Get or create Rocket.Chat user (keyed by our Mongo user id)
    const rcUser = await getOrCreateRocketChatUser(user._id || user.id, user.email, user.role);

    res.json({
      serverUrl: ROCKETCHAT_URL,
      username: rcUser.username,
      userId: rcUser.userId,
      authToken: rcUser.authToken,
    });
  } catch (error) {
    console.error('Error getting Rocket.Chat login:', error);
    res.status(500).json({ error: error.message || 'Failed to get Rocket.Chat credentials' });
  }
};

// @route   POST /api/rocketchat/create-dm
// @desc    Create or get direct message room between two users
// @access  Private
exports.createDirectMessage = async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const currentUser = await User.findById(req.user.id);

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure admin is logged in
    if (!adminAuthToken) {
      await loginAsAdmin();
    }

    // Get or create Rocket.Chat users, keyed by Mongo _id
    console.log(`Creating/getting RocketChat user for: ${currentUser.email}`);
    let currentRCUser;
    try {
      currentRCUser = await getOrCreateRocketChatUser(
        currentUser._id || currentUser.id,
        currentUser.email,
        currentUser.role
      );
      console.log(`✅ Current RC user: ${currentRCUser.username} (${currentRCUser.userId})`);
    } catch (error) {
      console.error('Error creating/getting current RC user:', error);
      return res.status(500).json({ 
        error: `Failed to setup RocketChat account for ${currentUser.email}: ${error.message}` 
      });
    }

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ error: 'Other user not found' });
    }

    console.log(`Creating/getting RocketChat user for: ${otherUser.email}`);
    let otherRCUser;
    try {
      otherRCUser = await getOrCreateRocketChatUser(
        otherUser._id || otherUser.id,
        otherUser.email,
        otherUser.role
      );
      console.log(`✅ Other RC user: ${otherRCUser.username} (${otherRCUser.userId})`);
    } catch (error) {
      console.error('Error creating/getting other RC user:', error);
      return res.status(500).json({ 
        error: `Failed to setup RocketChat account for ${otherUser.email}: ${error.message}` 
      });
    }

    // Create direct message room (logical DM between current user and other user)
    const currentUsername = currentRCUser.username;
    const otherUsername = otherRCUser.username;
    // Sort to ensure the pair is deterministic regardless of who initiates
    const dmUsernames = [currentUsername, otherUsername].sort();

    // Ensure admin is logged in
    if (!adminAuthToken) {
      await loginAsAdmin();
    }

    const currentHeaders = {
      'X-Auth-Token': adminAuthToken,
      'X-User-Id': adminUserId,
    };

    console.log(
      `Creating DM room between ${dmUsernames[0]} and ${dmUsernames[1]} (admin call)...`
    );

    let roomId = null;

    try {
      // Use Rocket.Chat im.create with both usernames so it's a DM between
      // the clinician and the patient (not between admin and one user)
      const dmResponse = await axios.post(
        `${ROCKETCHAT_URL}/api/v1/im.create`,
        { usernames: dmUsernames.join(',') },
        { headers: currentHeaders }
      );

      if (dmResponse.data.success) {
        const room = dmResponse.data.room;
        roomId = room.rid || room._id;
        console.log(`✅ DM created successfully for users ${dmUsernames.join(', ')}, roomId: ${roomId}`);
      } else {
        console.log('im.create did not return success:', dmResponse.data);
      }
    } catch (createError) {
      console.log('DM creation failed, will try to find existing room:', createError.response?.data || createError.message);
    }

    // If creation failed (likely because room already exists), search for existing DM for this user
    if (!roomId) {
      try {
        console.log(`Searching for existing DM between ${currentUsername} and ${otherUsername}...`);
        const imListResponse = await axios.get(
          `${ROCKETCHAT_URL}/api/v1/im.list`,
          { headers: currentHeaders }
        );

        if (imListResponse.data.success && imListResponse.data.ims) {
          const existingDM = imListResponse.data.ims.find((im) => {
            const usernames = im.usernames || [];
            return usernames.includes(currentUsername) && usernames.includes(otherUsername);
          });

          if (existingDM) {
            roomId = existingDM._id || existingDM.rid;
            console.log(`✅ Found existing DM, roomId: ${roomId}`);
          } else {
            console.log(`No existing DM found between ${currentUsername} and ${otherUsername}`);
          }
        }
      } catch (findError) {
        console.error('Error finding existing DM:', findError.response?.data || findError.message);
      }
    }

    if (roomId) {
      console.log(`✅ Returning roomId: ${roomId} for users ${currentUsername} and ${otherUsername}`);
      res.json({
        roomId: roomId,
        roomName: roomId, // Use room ID as name for DMs
        serverUrl: ROCKETCHAT_URL,
      });
    } else {
      console.error(`❌ Failed to create or find DM room between ${currentUsername} and ${otherUsername}`);
      return res.status(500).json({ 
        error: 'Failed to create or find direct message room. Please ensure both users exist in RocketChat and try again.' 
      });
    }
  } catch (error) {
    console.error('Error creating direct message:', error);
    res.status(500).json({ error: error.message || 'Failed to create direct message' });
  }
};

// @route   GET /api/rocketchat/contacts
// @desc    Get list of contacts (clinicians for patients, patients for clinicians)
// @access  Private
exports.getContacts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let contacts = [];
    if (user.role === 'patient') {
      // Get only the assigned clinician for this patient
      if (user.assignedClinicianId) {
        const clinician = await User.findById(user.assignedClinicianId).select('email _id');
        if (clinician) {
          contacts = [clinician];
        }
      }
    } else if (user.role === 'clinician') {
      // Get only patients assigned to this clinician
      contacts = await User.find({ 
        role: 'patient',
        assignedClinicianId: req.user.id 
      }).select('email _id');
    }

    res.json(contacts);
  } catch (error) {
    console.error('Error getting contacts:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
};

// @route   GET /api/rocketchat/messages/:roomId
// @desc    Get messages from a RocketChat room
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure admin is logged in
    if (!adminAuthToken) {
      await loginAsAdmin();
    }

    // Ensure admin is logged in
    if (!adminAuthToken) {
      await loginAsAdmin();
    }

    const authToken = adminAuthToken;
    const userId = adminUserId;

    console.log(`Fetching messages for room ${roomId} using admin Rocket.Chat credentials`);

    try {
      // For direct messages, use im.messages instead of chat.getMessages
      // Try im.messages first (for direct messages)
      let messagesResponse;
      let messages = [];
      
      try {
        messagesResponse = await axios.get(
          `${ROCKETCHAT_URL}/api/v1/im.messages`,
          {
            params: {
              roomId: roomId,
              count: 50, // Get last 50 messages
            },
            headers: {
              'X-Auth-Token': authToken,
              'X-User-Id': userId,
            },
          }
        );
        
        if (messagesResponse.data.success && messagesResponse.data.messages) {
          messages = messagesResponse.data.messages;
          console.log(`✅ Retrieved ${messages.length} messages using im.messages`);
        }
      } catch (imError) {
        console.log(`im.messages failed, trying chat.getMessages:`, imError.response?.data || imError.message);
        
        // Fallback to chat.getMessages
        try {
          messagesResponse = await axios.get(
            `${ROCKETCHAT_URL}/api/v1/chat.getMessages`,
            {
              params: {
                roomId: roomId,
                count: 50,
              },
              headers: {
                'X-Auth-Token': authToken,
                'X-User-Id': userId,
              },
            }
          );
          
          if (messagesResponse.data.success && messagesResponse.data.messages) {
            messages = messagesResponse.data.messages;
            console.log(`✅ Retrieved ${messages.length} messages using chat.getMessages`);
          }
        } catch (chatError) {
          console.error('Both im.messages and chat.getMessages failed:', {
            imError: imError.response?.data || imError.message,
            chatError: chatError.response?.data || chatError.message,
          });
          throw chatError; // Throw the last error
        }
      }

      if (messages.length > 0 || (messagesResponse && messagesResponse.data.success)) {
        // Format messages for frontend to match Message interface in lib/api/rocketchat.ts
        const formattedMessages = messages.map((msg) => {
          const tsValue = msg.ts ? new Date(msg.ts) : new Date();
          return {
            _id: msg._id,
            text: msg.msg || msg.text || '',
            userId: msg.u?._id || '',
            username: msg.u?.username || '',
            name: msg.u?.name || '',
            timestamp: tsValue.getTime(),
            createdAt: tsValue.toISOString(),
          };
        });

        res.json(formattedMessages.reverse()); // Reverse to show oldest first
      } else {
        // No messages yet, return empty array
        res.json([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', {
        roomId,
        error: error.response?.data || error.message,
        status: error.response?.status,
      });
      
      // If 404, the room might not exist or user doesn't have access
      if (error.response?.status === 404) {
        return res.status(404).json({ 
          error: `Room ${roomId} not found or you don't have access. Please try creating the chat again.` 
        });
      }
      
      return res.status(500).json({ 
        error: `Failed to get messages: ${error.response?.data?.error || error.message}` 
      });
    }
  } catch (error) {
    console.error('Error in getMessages:', error);
    res.status(500).json({ error: error.message || 'Failed to get messages' });
  }
};

// @route   POST /api/rocketchat/send-message
// @desc    Send a message to a RocketChat room
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { roomId, message } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!roomId || !message) {
      return res.status(400).json({ error: 'roomId and message are required' });
    }

    // Ensure admin is logged in
    if (!adminAuthToken) {
      await loginAsAdmin();
    }

    const authToken = adminAuthToken;
    const userId = adminUserId;

    try {
      // Send message to the room
      // Note: Rocket.Chat's chat.sendMessage expects a "message" object with "rid" and "msg"
      const sendResponse = await axios.post(
        `${ROCKETCHAT_URL}/api/v1/chat.sendMessage`,
        {
          message: {
            rid: roomId,
            msg: message,
          },
        },
        {
          headers: {
            'X-Auth-Token': authToken,
            'X-User-Id': userId,
            'Content-Type': 'application/json',
          },
        }
      );

      if (sendResponse.data.success) {
        const msg = sendResponse.data.message;
        const tsValue = msg.ts ? new Date(msg.ts) : new Date();
        res.json({
          _id: msg._id,
          text: msg.msg,
          userId: msg.u._id,
          username: msg.u.username,
          name: msg.u.name,
          timestamp: tsValue.getTime(),
          createdAt: tsValue.toISOString(),
        });
      } else {
        return res.status(500).json({ 
          error: sendResponse.data.error || 'Failed to send message' 
        });
      }
    } catch (error) {
      console.error('Error sending message:', error.response?.data || error.message);
      return res.status(500).json({ 
        error: `Failed to send message: ${error.response?.data?.error || error.message}` 
      });
    }
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
};

// @route   GET /api/rocketchat/unread-count
// @desc    Get unread message count for current user
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure admin is logged in
    if (!adminAuthToken) {
      await loginAsAdmin();
    }

    const authToken = adminAuthToken;
    const userId = adminUserId;

    try {
      // Get subscriptions (rooms user is part of) to check unread counts
      const subscriptionsResponse = await axios.get(
        `${ROCKETCHAT_URL}/api/v1/subscriptions.get`,
        {
          headers: {
            'X-Auth-Token': authToken,
            'X-User-Id': userId,
          },
        }
      );

      if (subscriptionsResponse.data.success) {
        // Calculate total unread count
        let totalUnread = 0;
        subscriptionsResponse.data.update.forEach((sub) => {
          if (sub.unread > 0) {
            totalUnread += sub.unread;
          }
        });

        res.json({ unreadCount: totalUnread });
      } else {
        res.json({ unreadCount: 0 });
      }
    } catch (error) {
      console.error('Error getting unread count:', error.response?.data || error.message);
      res.json({ unreadCount: 0 }); // Return 0 on error to not break UI
    }
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    res.json({ unreadCount: 0 });
  }
};

