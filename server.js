const express = require('express');
const admin = require('firebase-admin');
const axios = require('axios');

const app = express();
app.use(express.json());

<<<<<<< HEAD
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

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('? Firebase Admin initialized successfully!');
} catch (error) {
  console.error('? Failed to initialize Firebase Admin:', error.message);
  process.exit(1);
}

app.post('/send-notification', async (req, res) => {
  console.log('?? Received notification request');
=======
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
>>>>>>> 1520d99b926c41d8b4e1c6c69138c9cd477b00ab
  
  try {
    const { token, title, body, data } = req.body;

    // Validate required fields
    if (!token) {
<<<<<<< HEAD
      console.log('? Missing token');
      return res.status(400).json({ error: 'Missing token' });
    }
    if (!title) {
      console.log('? Missing title');
      return res.status(400).json({ error: 'Missing title' });
    }
    if (!body) {
      console.log('? Missing body');
      return res.status(400).json({ error: 'Missing body' });
=======
      console.log('❌ Missing token');
      return res.status(400).json({ error: 'Missing token' });
>>>>>>> 1520d99b926c41d8b4e1c6c69138c9cd477b00ab
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

    console.log('? Validation passed');
    console.log('?? Token (first 20 chars):', token.substring(0, 20) + '...');
    console.log('?? Title:', title);
    console.log('?? Body:', body);

<<<<<<< HEAD
    // Construct the message
    const message = {
      notification: {
        title: title,
        body: body,
=======
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
>>>>>>> 1520d99b926c41d8b4e1c6c69138c9cd477b00ab
      },
      data: data || {},
      android: {
        priority: 'high',
      },
      token: token,
    };

<<<<<<< HEAD
    console.log('?? Sending to FCM using Firebase Admin...');

    // Send using Firebase Admin SDK
    const response = await admin.messaging().send(message);
    
    console.log('? FCM success! Message ID:', response);
    res.status(200).json({ success: true, messageId: response });
    
  } catch (error) {
    console.error('? Error sending notification:', error.message);
    if (error.code) {
      console.error('?? Error code:', error.code);
    }
    if (error.details) {
      console.error('?? Error details:', error.details);
=======
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
>>>>>>> 1520d99b926c41d8b4e1c6c69138c9cd477b00ab
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => {
<<<<<<< HEAD
  res.send('FCM Proxy Server is running with Firebase Admin!');
});

app.get('/test', (req, res) => {
  res.json({ success: true, message: 'Server is working' });
=======
  res.send('FCM Proxy Server is running!');
>>>>>>> 1520d99b926c41d8b4e1c6c69138c9cd477b00ab
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
<<<<<<< HEAD
  console.log(`? Server running on port ${PORT}`);
});
=======
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}`);
});
>>>>>>> 1520d99b926c41d8b4e1c6c69138c9cd477b00ab
