const axios = require('axios');
const User = require('../models/User');

// Rocket.Chat server configuration
// These should be set in your .env file
const ROCKETCHAT_URL = process.env.ROCKETCHAT_URL || 'http://localhost:3000';
const ROCKETCHAT_ADMIN_USER = process.env.ROCKETCHAT_ADMIN_USER || 'admin';
const ROCKETCHAT_ADMIN_PASSWORD = process.env.ROCKETCHAT_ADMIN_PASSWORD || 'admin';
const ROCKETCHAT_ADMIN_TOKEN = process.env.ROCKETCHAT_ADMIN_TOKEN || '';

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

// Sanitize email to create a valid username (RocketChat usernames can't have @ or special chars)
const sanitizeUsername = (email) => {
  return email.replace(/[@.]/g, '_').toLowerCase();
};

// Get or create Rocket.Chat user
const getOrCreateRocketChatUser = async (email, name, role) => {
  // Ensure admin is logged in
  if (!adminAuthToken) {
    await loginAsAdmin();
  }

  const username = sanitizeUsername(email);
  let existingUser = null;

  // Try to find user by username first
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
      // Filter out system users like rocket.cat
      if (foundUser.username && foundUser.username !== 'rocket.cat' && foundUser._id !== 'rocket.cat') {
        existingUser = foundUser;
        console.log(`Found existing user by username:`, {
          _id: existingUser._id,
          username: existingUser.username,
          name: existingUser.name,
          emails: existingUser.emails,
        });
      }
    }
  } catch (error) {
    // User not found by username, try by email
    if (error.response?.status === 400 || error.response?.status === 404) {
      try {
        // Try searching by email address in the emails array
        const emailResponse = await axios.get(
          `${ROCKETCHAT_URL}/api/v1/users.list`,
          {
            params: { 
              query: JSON.stringify({ 
                'emails.address': email 
              }) 
            },
            headers: {
              'X-Auth-Token': adminAuthToken,
              'X-User-Id': adminUserId,
            },
          }
        );

        if (emailResponse.data.success && emailResponse.data.users && emailResponse.data.users.length > 0) {
          // Filter out system users and find the actual user
          const realUsers = emailResponse.data.users.filter(
            (user) => user.username !== 'rocket.cat' && user._id !== 'rocket.cat'
          );
          
          if (realUsers.length > 0) {
            // Find user with matching email
            const matchingUser = realUsers.find((user) => 
              user.emails && user.emails.some((e) => e.address === email)
            ) || realUsers[0];
            
            existingUser = matchingUser;
            console.log(`Found existing user by email:`, {
              _id: existingUser._id,
              username: existingUser.username,
              name: existingUser.name,
              emails: existingUser.emails,
            });
          } else {
            console.log(`Email search returned only system users, user ${email} not found`);
          }
        }
      } catch (emailError) {
        // User doesn't exist, will create below
        console.log(`User ${email} not found, will create new user`);
      }
    }
  }

  // If user exists, we need to handle authentication
  // Try to reset password and log in to get auth token
  if (existingUser) {
    // Extract the correct username - use username field, or fallback to sanitized email
    const existingUsername = existingUser.username || existingUser.name || username;
    
    console.log(`User ${email} exists in RocketChat with username: ${existingUsername}, userId: ${existingUser._id}`);
    
    // For existing users, we cannot automatically authenticate them because:
    // 1. Password update requires TOTP (2FA) which we don't have
    // 2. Admin cannot create tokens for other users
    // 3. We cannot reset passwords without the old password
    
    // The best approach is to return user info without token
    // The frontend will open RocketChat homepage and user can log in manually
    // Admin will still be able to create DMs for them
    console.log(`User ${email} exists in RocketChat - manual login required`);
    console.log(`Username: ${existingUsername}, UserId: ${existingUser._id}`);
    
    return {
      userId: existingUser._id,
      username: existingUsername,
      authToken: null, // User will need to log in manually
    };
  }

  // User doesn't exist, create it
  try {
    const password = `rc_${Date.now()}_${Math.random().toString(36).substring(7)}`; // Generate a secure password
    const createResponse = await axios.post(
      `${ROCKETCHAT_URL}/api/v1/users.create`,
      {
        email,
        name: name || email,
        username: username,
        password,
        roles: ['user'],
        verified: true,
        active: true,
      },
      {
        headers: {
          'X-Auth-Token': adminAuthToken,
          'X-User-Id': adminUserId,
        },
      }
    );

    if (!createResponse.data.success) {
      console.error('RocketChat user creation failed:', createResponse.data);
      throw new Error(createResponse.data.error || 'Failed to create Rocket.Chat user');
    }

    const createdUser = createResponse.data.user;

    // Login as the new user to get their auth token
    try {
      const loginResponse = await axios.post(`${ROCKETCHAT_URL}/api/v1/login`, {
        user: username,
        password,
      });

      if (loginResponse.data.success && loginResponse.data.data) {
        return {
          userId: loginResponse.data.data.userId,
          username: createdUser.username || username,
          authToken: loginResponse.data.data.authToken,
        };
      }
    } catch (loginError) {
      console.error('Error logging in new user:', loginError.response?.data || loginError.message);
      // Return user info even if login fails
      return {
        userId: createdUser._id,
        username: createdUser.username || username,
        authToken: null,
      };
    }

    return {
      userId: createdUser._id,
      username: createdUser.username || username,
      authToken: null,
    };
  } catch (createError) {
    console.error('Error creating Rocket.Chat user:', {
      status: createError.response?.status,
      data: createError.response?.data,
      message: createError.message,
    });
    
    // Provide more detailed error message
    const errorMsg = createError.response?.data?.error || createError.message || 'Failed to create Rocket.Chat user';
    throw new Error(`Failed to create Rocket.Chat user: ${errorMsg}`);
  }
};

// @desc    Get Rocket.Chat login credentials for current user
// @route   GET /api/rocketchat/login
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

    // Get or create Rocket.Chat user
    const rcUser = await getOrCreateRocketChatUser(user.email, user.email, user.role);

    // If user exists but we don't have their token, we can't authenticate them
    // For now, we'll return the user info and the frontend will need to handle login
    if (!rcUser.authToken) {
      console.warn(`User ${user.email} exists in RocketChat but no auth token available`);
      // We'll still return the user info - the frontend can try to open RocketChat
      // and the user will need to login there
    }

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

// @desc    Create a direct message channel between patient and clinician
// @route   POST /api/rocketchat/create-dm
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

    // Get or create Rocket.Chat users
    const currentRCUser = await getOrCreateRocketChatUser(
      currentUser.email,
      currentUser.email,
      currentUser.role
    );

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ error: 'Other user not found' });
    }

    const otherRCUser = await getOrCreateRocketChatUser(
      otherUser.email,
      otherUser.email,
      otherUser.role
    );

    // Create direct message room
    // If current user doesn't have auth token, we'll use admin to create the room
    let dmResponse;
    
    // Ensure we have valid usernames (not rocket.cat or empty)
    const currentUsername = currentRCUser.username && currentRCUser.username !== 'rocket.cat' 
      ? currentRCUser.username 
      : sanitizeUsername(currentUser.email);
    const otherUsername = otherRCUser.username && otherRCUser.username !== 'rocket.cat'
      ? otherRCUser.username
      : sanitizeUsername(otherUser.email);
    
    if (!currentRCUser.authToken) {
      // Use admin to create a direct message room
      // First, try to create DM using admin credentials with user IDs
      try {
        // Try creating DM using the other user's username
        dmResponse = await axios.post(
          `${ROCKETCHAT_URL}/api/v1/im.create`,
          {
            username: otherUsername,
          },
          {
            headers: {
              'X-Auth-Token': adminAuthToken,
              'X-User-Id': adminUserId,
            },
          }
        );
        
        // If that fails, try creating a private group
        if (!dmResponse.data.success) {
          // Generate a unique room name
          const roomName = `dm_${currentUsername}_${otherUsername}`.substring(0, 50); // RocketChat has name length limits
          
          dmResponse = await axios.post(
            `${ROCKETCHAT_URL}/api/v1/groups.create`,
            {
              name: roomName,
              members: [currentUsername, otherUsername],
              readOnly: false,
              type: 'p', // private group
            },
            {
              headers: {
                'X-Auth-Token': adminAuthToken,
                'X-User-Id': adminUserId,
              },
            }
          );
          
          // If group creation fails due to duplicate, try to find existing room
          if (!dmResponse.data.success && dmResponse.data.errorType === 'error-duplicate-channel-name') {
            // Try to find the existing room by name
            const findResponse = await axios.get(
              `${ROCKETCHAT_URL}/api/v1/groups.info`,
              {
                params: { roomName: roomName },
                headers: {
                  'X-Auth-Token': adminAuthToken,
                  'X-User-Id': adminUserId,
                },
              }
            );
            
            if (findResponse.data.success && findResponse.data.group) {
              dmResponse = { data: { success: true, group: findResponse.data.group } };
            }
          }
        }
      } catch (adminError) {
        console.error('Error creating DM as admin:', adminError.response?.data || adminError.message);
        // Return a helpful error message
        throw new Error(`Failed to create chat room: ${adminError.response?.data?.error || adminError.message}. Please ensure both users exist in RocketChat.`);
      }
    } else {
      // User has auth token, create DM normally
      dmResponse = await axios.post(
        `${ROCKETCHAT_URL}/api/v1/im.create`,
        {
          username: otherUsername,
        },
        {
          headers: {
            'X-Auth-Token': currentRCUser.authToken,
            'X-User-Id': currentRCUser.userId,
          },
        }
      );
    }

    if (dmResponse.data.success) {
      // Handle both DM and group responses
      const room = dmResponse.data.room || dmResponse.data.group;
      res.json({
        roomId: room._id,
        roomName: room.name || room.fname || room.t,
        serverUrl: ROCKETCHAT_URL,
      });
    } else {
      throw new Error(dmResponse.data.error || 'Failed to create direct message room');
    }
  } catch (error) {
    console.error('Error creating direct message:', error.response?.data || error.message);
    res.status(500).json({ error: error.message || 'Failed to create direct message' });
  }
};

// @desc    Get list of clinicians (for patients) or patients (for clinicians)
// @route   GET /api/rocketchat/contacts
// @access  Private
exports.getContacts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let contacts = [];
    if (user.role === 'patient') {
      // Get all clinicians
      contacts = await User.find({ role: 'clinician' }).select('email _id');
    } else if (user.role === 'clinician') {
      // Get all patients
      contacts = await User.find({ role: 'patient' }).select('email _id');
    }

    res.json(contacts);
  } catch (error) {
    console.error('Error getting contacts:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
};

