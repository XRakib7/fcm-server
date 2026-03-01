const express = require('express');
const admin = require('firebase-admin');
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
  
  try {
    const { token, title, body, data } = req.body;

    // Validate required fields
    if (!token) {
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
    }

    console.log('? Validation passed');
    console.log('?? Token (first 20 chars):', token.substring(0, 20) + '...');
    console.log('?? Title:', title);
    console.log('?? Body:', body);

    // Construct the message
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: data || {},
      android: {
        priority: 'high',
      },
      token: token,
    };

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
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('FCM Proxy Server is running with Firebase Admin!');
});

app.get('/test', (req, res) => {
  res.json({ success: true, message: 'Server is working' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`? Server running on port ${PORT}`);
});