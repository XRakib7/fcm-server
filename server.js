const express = require('express');
const { google } = require('google-auth-library');
const axios = require('axios');

const app = express();
app.use(express.json());

// The service account JSON is provided via environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Get an OAuth2 access token using the service account
async function getAccessToken() {
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token;
}

// Endpoint to send a notification
app.post('/send-notification', async (req, res) => {
  try {
    const { token, title, body, data } = req.body;

    // Validate required fields
    if (!token || !title || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get a fresh access token
    const accessToken = await getAccessToken();

    // FCM v1 endpoint
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

    // Build the message payload
    const message = {
      message: {
        token: token,
        notification: {
          title: title,
          body: body,
        },
        data: data || {}, // any custom data you want to send
        android: {
          priority: 'high',
        },
      },
    };

    // Send to FCM
    const response = await axios.post(fcmUrl, message, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('FCM success:', response.data);
    res.status(200).json({ success: true, response: response.data });
  } catch (error) {
    console.error('FCM error:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));