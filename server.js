const express = require('express');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());

// Load and initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// In-memory store for recent notifications
const recentNotifications = new Map();

// Clean up old notifications every hour
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  for (const [key, timestamp] of recentNotifications.entries()) {
    if (timestamp < oneHourAgo) {
      recentNotifications.delete(key);
    }
  }
}, 3600000);

app.get('/', (req, res) => res.json({ status: 'ok' }));

app.post('/send-notification', async (req, res) => {
  try {
    const { token, title, body, data = {} } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const chatId = data.chatId;
    const recipientId = data.recipientId;
    const now = Date.now();

    // Generate notification key for bundling
    const notificationKey = `${recipientId}_${chatId}`;
    const lastNotificationTime = recentNotifications.get(notificationKey);

    // If we sent a notification for this chat in the last 30 seconds, update it
    if (lastNotificationTime && (now - lastNotificationTime) < 30000) {
      console.log(`Bundling notification for chat ${chatId}`);
      
      try {
        const messageId = await admin.messaging().send({
          data: {
            ...data,
            type: 'notification_update',
            title,
            body,
            timestamp: now.toString(),
          },
          android: { 
            priority: 'high',
            collapseKey: chatId,
            notification: {
              tag: chatId,
              color: '#2196F3',
            }
          },
          token,
        });

        recentNotifications.set(notificationKey, now);
        return res.json({ success: true, bundled: true, messageId });
      } catch (error) {
        console.error('Error sending bundled notification:', error.message);
      }
    }

    // Send new notification
    const messageId = await admin.messaging().send({
      notification: { title, body },
      data: {
        ...data,
        timestamp: now.toString(),
        type: 'new_message'
      },
      android: { 
        priority: 'high',
        collapseKey: chatId,
        notification: {
          tag: chatId,
          color: '#2196F3',
          sound: 'default',
          channelId: 'freechat_messages'
        }
      },
      token,
    });

    recentNotifications.set(notificationKey, now);
    console.log(`Notification sent to ${recipientId} for chat ${chatId}`);
    res.json({ success: true, messageId });
  } catch (error) {
    console.error('Notification error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
