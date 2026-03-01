const express = require('express');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());

// Load and initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// Health check
app.get('/', (req, res) => res.json({ status: 'ok' }));

// Send notification endpoint
app.post('/send-notification', async (req, res) => {
  try {
    const { token, title, body, data = {} } = req.body;

    // Basic validation
    if (!token || !title || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Send via Firebase Admin SDK
    const messageId = await admin.messaging().send({
      notification: { title, body },
      data,
      android: { priority: 'high' },
      token,
    });

    res.json({ success: true, messageId });
  } catch (error) {
    console.error('Notification error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
