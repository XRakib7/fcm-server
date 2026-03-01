const express = require('express');
const { google } = require('google-auth-library');
const axios = require('axios');

const app = express();
app.use(express.json());

console.log('🚀 Server starting...');

// Check environment variable
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
console.log('📦 Environment variable FIREBASE_SERVICE_ACCOUNT exists:', !!serviceAccountJson);

if (!serviceAccountJson) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT environment variable is not set!');
  process.exit(1);
}

// Log first 50 characters to verify it's not empty
console.log('📝 JSON starts with:', serviceAccountJson.substring(0, 50) + '...');

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
  console.log('✅ Service account parsed successfully!');
  console.log('📋 Project ID:', serviceAccount.project_id);
  console.log('📋 Client Email:', serviceAccount.client_email);
  console.log('📋 Private Key exists:', !!serviceAccount.private_key);
  console.log('📋 Private Key length:', serviceAccount.private_key?.length);
} catch (e) {
  console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', e.message);
  console.error('❌ Error details:', e);
  process.exit(1);
}

async function getAccessToken() {
  try {
    console.log('🔑 Getting access token...');
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    console.log('✅ Access token obtained');
    return accessToken.token;
  } catch (error) {
    console.error('❌ Error getting access token:', error.message);
    throw error;
  }
}

app.post('/send-notification', async (req, res) => {
  console.log('📨 Received notification request');
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { token, title, body, data } = req.body;

    // Validate required fields
    if (!token) {
      console.log('❌ Missing token');
      return res.status(400).json({ error: 'Missing token' });
    }
    if (!title) {
      console.log('❌ Missing title');
      return res.status(400).json({ error: 'Missing title' });
    }
    if (!body) {
      console.log('❌ Missing body');
      return res.status(400).json({ error: 'Missing body' });
    }

    console.log('✅ Validation passed');
    console.log('🎯 Token:', token.substring(0, 20) + '...');
    console.log('📝 Title:', title);
    console.log('📝 Body:', body);

    // Get a fresh access token
    const accessToken = await getAccessToken();

    // FCM v1 endpoint
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
    console.log('🔗 FCM URL:', fcmUrl);

    // Build the message payload
    const message = {
      message: {
        token: token,
        notification: {
          title: title,
          body: body,
        },
        data: data || {},
        android: {
          priority: 'high',
        },
      },
    };

    console.log('📤 Sending to FCM...');

    // Send to FCM
    const response = await axios.post(fcmUrl, message, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ FCM success:', response.data);
    res.status(200).json({ success: true, response: response.data });
  } catch (error) {
    console.error('❌ FCM error:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📊 Data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.config) {
      console.error('📊 Request URL:', error.config.url);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('FCM Proxy Server is running!');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}`);
});
