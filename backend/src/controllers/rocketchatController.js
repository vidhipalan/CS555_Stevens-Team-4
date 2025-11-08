const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');

// Rocket.Chat server configuration (should be in .env)
const ROCKETCHAT_URL = process.env.ROCKETCHAT_URL || 'http://localhost:3000';
const ROCKETCHAT_ADMIN_USER = process.env.ROCKETCHAT_ADMIN_USER || 'admin';
const ROCKETCHAT_ADMIN_PASSWORD = process.env.ROCKETCHAT_ADMIN_PASSWORD || 'admin';
const ROCKETCHAT_SECRET = process.env.ROCKETCHAT_SECRET || '';

let adminAuthToken = null;
let adminUserId = null;

/**
 * Get or refresh Rocket.Chat admin authentication token
 */
const getAdminAuthToken = async () => {
  try {
    const response = await axios.post(`${ROCKETCHAT_URL}/api/v1/login`, {
      user: ROCKETCHAT_ADMIN_USER,
      password: ROCKETCHAT_ADMIN_PASSWORD,
    });

    if (response.data.status === 'success') {
      adminAuthToken = response.data.data.authToken;
      adminUserId = response.data.data.userId;
      return adminAuthToken;
    }
    throw new Error('Failed to authenticate with Rocket.Chat');
  } catch (error) {
    console.error('Rocket.Chat admin auth error:', error.message);
    throw error;
  }
};

/**
 * Ensure user exists in Rocket.Chat and return/create user
 */
const ensureRocketChatUser = async (userEmail, userName, role) => {
  try {
    if (!adminAuthToken) {
      await getAdminAuthToken();
    }

    // Try to find existing user by email first, then by username
    try {
      const findResponse = await axios.get(
        `${ROCKETCHAT_URL}/api/v1/users.info`,
        {
          params: { username: userEmail.split('@')[0] },
          headers: {
            'X-Auth-Token': adminAuthToken,
            'X-User-Id': adminUserId,
          },
        }
      );

      if (findResponse.data.success && findResponse.data.user) {
        return findResponse.data.user;
      }
    } catch (findError) {
      // Try finding by email
      try {
        const findEmailResponse = await axios.get(
          `${ROCKETCHAT_URL}/api/v1/users.list`,
          {
            params: { email: userEmail },
            headers: {
              'X-Auth-Token': adminAuthToken,
              'X-User-Id': adminUserId,
            },
          }
        );
        
        if (findEmailResponse.data.success && findEmailResponse.data.users && findEmailResponse.data.users.length > 0) {
          return findEmailResponse.data.users[0];
        }
      } catch (emailError) {
        // Continue to create user
      }
    }
  } catch (error) {
    // User doesn't exist, create it
    if (error.response?.status === 400 || error.response?.status === 404 || !error.response) {
      try {
        const createResponse = await axios.post(
          `${ROCKETCHAT_URL}/api/v1/users.create`,
          {
            email: userEmail,
            name: userName,
            username: userEmail.split('@')[0],
            password: Math.random().toString(36).slice(-12), // Random password
            roles: [role === 'clinician' ? 'user' : 'user'], // Adjust roles as needed
            verified: true,
          },
          {
            headers: {
              'X-Auth-Token': adminAuthToken,
              'X-User-Id': adminUserId,
            },
          }
        );

        if (createResponse.data.success) {
          return createResponse.data.user;
        }
      } catch (createError) {
        console.error('Error creating Rocket.Chat user:', createError.message);
        throw createError;
      }
    }
  }
  throw new Error('Failed to ensure Rocket.Chat user exists');
};

/**
 * Generate SSO token for user
 */
const generateSSOToken = async (userId, userEmail) => {
  try {
    if (!adminAuthToken) {
      await getAdminAuthToken();
    }

    // Create login token for user
    const tokenResponse = await axios.post(
      `${ROCKETCHAT_URL}/api/v1/users.createToken`,
      { userId },
      {
        headers: {
          'X-Auth-Token': adminAuthToken,
          'X-User-Id': adminUserId,
        },
      }
    );

    if (tokenResponse.data.success) {
      return tokenResponse.data.data.authToken;
    }
    throw new Error('Failed to generate SSO token');
  } catch (error) {
    console.error('Error generating SSO token:', error.message);
    throw error;
  }
};

/**
 * @route   POST /api/rocketchat/login
 * @desc    Get Rocket.Chat SSO token for authenticated user
 * @access  Private
 */
exports.getChatToken = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user from database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure user exists in Rocket.Chat and get/create user
    const rocketChatUser = await ensureRocketChatUser(
      user.email,
      user.email.split('@')[0],
      user.role
    );

    // Generate SSO token
    const authToken = await generateSSOToken(rocketChatUser._id, user.email);

    // Store Rocket.Chat user ID in our database
    if (!user.rocketChatUserId) {
      user.rocketChatUserId = rocketChatUser._id;
      await user.save();
    }

    res.json({
      authToken,
      userId: rocketChatUser._id,
      serverUrl: ROCKETCHAT_URL,
      username: rocketChatUser.username,
    });
  } catch (error) {
    console.error('Rocket.Chat token error:', error.message);
    res.status(500).json({ error: 'Failed to generate chat token' });
  }
};

/**
 * @route   GET /api/rocketchat/channels
 * @desc    Get user's channels/rooms (this endpoint returns user token so frontend can call Rocket.Chat directly)
 * @access  Private
 */
exports.getChannels = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.rocketChatUserId) {
      // If user doesn't have Rocket.Chat account, create one
      const rocketChatUser = await ensureRocketChatUser(
        user.email,
        user.email.split('@')[0],
        user.role
      );
      
      const authToken = await generateSSOToken(rocketChatUser._id, user.email);
      
      if (!user.rocketChatUserId) {
        user.rocketChatUserId = rocketChatUser._id;
        await user.save();
      }

      return res.json({
        authToken,
        userId: rocketChatUser._id,
        serverUrl: ROCKETCHAT_URL,
        username: rocketChatUser.username,
      });
    }

    // Generate fresh token for user
    const authToken = await generateSSOToken(user.rocketChatUserId, user.email);

    res.json({
      authToken,
      userId: user.rocketChatUserId,
      serverUrl: ROCKETCHAT_URL,
      username: user.email.split('@')[0],
    });
  } catch (error) {
    console.error('Error fetching channels:', error.message);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
};

