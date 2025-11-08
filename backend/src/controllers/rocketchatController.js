const axios = require('axios');
const User = require('../models/User');

// Rocket.Chat server configuration (should be in .env)
const ROCKETCHAT_URL = process.env.ROCKETCHAT_URL || 'http://localhost:3000';
const ROCKETCHAT_ADMIN_USER = process.env.ROCKETCHAT_ADMIN_USER || 'admin';
const ROCKETCHAT_ADMIN_PASSWORD = process.env.ROCKETCHAT_ADMIN_PASSWORD || 'admin';

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
    console.error('Rocket.Chat admin auth error:', error.response?.data || error.message);
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

    // Try to find existing user by username
    try {
      const username = userEmail.split('@')[0];
      const findResponse = await axios.get(
        `${ROCKETCHAT_URL}/api/v1/users.info`,
        {
          params: { username },
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
      // User not found by username, try by email
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

    // User doesn't exist, create it
    const username = userEmail.split('@')[0];
    const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    
    const createResponse = await axios.post(
      `${ROCKETCHAT_URL}/api/v1/users.create`,
      {
        email: userEmail,
        name: userName || username,
        username: username,
        password: randomPassword,
        roles: ['user'],
        verified: true,
        requirePasswordChange: false,
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
    throw new Error('Failed to create Rocket.Chat user');
  } catch (error) {
    console.error('Error ensuring Rocket.Chat user:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Generate SSO token for user
 */
const generateSSOToken = async (userId) => {
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
    console.error('Error generating SSO token:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * @route   GET /api/rocketchat/login
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
    const authToken = await generateSSOToken(rocketChatUser._id);

    // Store Rocket.Chat user ID in our database
    if (!user.rocketChatUserId || user.rocketChatUserId !== rocketChatUser._id) {
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
    res.status(500).json({ error: 'Failed to generate chat token: ' + error.message });
  }
};

/**
 * @route   GET /api/rocketchat/users
 * @desc    Get list of users for creating DMs (clinicians can see patients, patients can see their clinician)
 * @access  Private
 */
exports.getChatUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!adminAuthToken) {
      await getAdminAuthToken();
    }

    let usersToReturn = [];

    if (user.role === 'clinician') {
      // Clinicians can see all patients
      const patients = await User.find({ role: 'patient' });
      const patientEmails = patients.map(p => p.email);
      
      // Get Rocket.Chat users for these patients
      for (const email of patientEmails) {
        try {
          const rcUser = await ensureRocketChatUser(email, email.split('@')[0], 'patient');
          usersToReturn.push({
            _id: rcUser._id,
            username: rcUser.username,
            name: rcUser.name || rcUser.username,
            email: rcUser.emails?.[0]?.address || email,
          });
        } catch (err) {
          console.error(`Error getting Rocket.Chat user for ${email}:`, err.message);
        }
      }
    } else {
      // Patients can see their clinician (you may want to implement a relationship model)
      // For now, return all clinicians
      const clinicians = await User.find({ role: 'clinician' });
      const clinicianEmails = clinicians.map(c => c.email);
      
      for (const email of clinicianEmails) {
        try {
          const rcUser = await ensureRocketChatUser(email, email.split('@')[0], 'clinician');
          usersToReturn.push({
            _id: rcUser._id,
            username: rcUser.username,
            name: rcUser.name || rcUser.username,
            email: rcUser.emails?.[0]?.address || email,
          });
        } catch (err) {
          console.error(`Error getting Rocket.Chat user for ${email}:`, err.message);
        }
      }
    }

    res.json({ users: usersToReturn });
  } catch (error) {
    console.error('Error getting chat users:', error.message);
    res.status(500).json({ error: 'Failed to get chat users: ' + error.message });
  }
};
