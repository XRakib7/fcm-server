const express = require('express');
const { JWT } = require('google-auth-library');
const axios = require('axios');

const app = express();
app.use(express.json());

console.log('?? Server starting...');

// Check environment variable
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
console.log('?? Environment variable exists:', !!serviceAccountJson);

if (!serviceAccountJson) {
  console.error('? FIREBASE_SERVICE_ACCOUNT environment variable is not set!');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
  console.log('? Service account parsed successfully!');
  console.log('?? Project ID:', serviceAccount.project_id);
  console.log('?? Client Email:', serviceAccount.client_email);
} catch (e) {
  console.error('? Failed to parse JSON:', e.message);
  process.exit(1);
}

// Create a JWT client for Firebase
const client = new JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key,
  scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
});

async function getAccessToken() {
  try {
    console.log('?? Getting access token...');
    const tokens = await client.authorize();
    console.log('? Access token obtained');
    return tokens.access_token;
  } catch (error) {
    console.error('? Error getting access token:', error.message);
    throw error;
  }
}

app.post('/send-notification', async (req, res) => {
  console.log('?? Received notification request');
  
  try {
    const { token, title, body, data } = req.body;

    // Validate required fields
    if (!token || !title || !body) {
      console.log('? Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('? Validation passed');
    console.log('?? Token (first 20 chars):', token.substring(0, 20) + '...');

    // Get access token
    const accessToken = await getAccessToken();

    // FCM v1 endpoint
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

    // Build the message
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

    console.log('?? Sending to FCM...');

    // Send to FCM
    const response = await axios.post(fcmUrl, message, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('? FCM success!');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('? Error:', error.message);
    if (error.response) {
      console.error('?? FCM Error Response:', error.response.data);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('FCM Proxy Server is running!');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`? Server running on port ${PORT}`);
});