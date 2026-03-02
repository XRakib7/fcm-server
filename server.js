const express = require('express');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());

// Load and initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// In-memory store for recent notifications (in production, use Redis)
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

    // Check if user is online/in chat (sent from client)
    const isUserInChat = data.isInChat === 'true';
    const senderId = data.senderId;
    const recipientId = data.recipientId;
    const chatId = data.chatId;

    // DON'T send notification if user is in the same chat
    if (isUserInChat && chatId === data.currentChatId) {
      console.log(`User ${recipientId} is in chat ${chatId}, skipping notification`);
      return res.json({ 
        success: true, 
        skipped: true, 
        reason: 'user_in_chat' 
      });
    }

    // Generate a notification key for bundling
    const notificationKey = `${recipientId}_${chatId}`;
    const now = Date.now();
    const lastNotificationTime = recentNotifications.get(notificationKey);

    // If we sent a notification for this chat in the last 30 seconds, update it instead
    if (lastNotificationTime && (now - lastNotificationTime) < 30000) {
      console.log(`Bundling notification for chat ${chatId}`);
      
      try {
        // Send a data-only message to update existing notification
        const messageId = await admin.messaging().send({
          data: {
            ...data,
            type: 'notification_update',
            title,
            body,
            timestamp: now.toString(),
            messageCount: (parseInt(data.messageCount) || 1).toString()
          },
          android: { 
            priority: 'high',
            collapseKey: chatId // This groups notifications by chat
          },
          token,
        });

        recentNotifications.set(notificationKey, now);
        return res.json({ 
          success: true, 
          bundled: true, 
          messageId 
        });
      } catch (error) {
        console.error('Error sending bundled notification:', error.message);
      }
    }

    // Send new notification
    const messageId = await admin.messaging().send({
      notification: { 
        title: title,
        body: body
      },
      data: {
        ...data,
        timestamp: now.toString(),
        type: 'new_message'
      },
      android: { 
        priority: 'high',
        collapseKey: chatId, // Collapse by chat ID
        notification: {
          tag: chatId, // This replaces existing notification for this chat
          color: '#2196F3',
          sound: 'default',
          channelId: 'freechat_messages'
        }
      },
      token,
    });

    // Store notification time for bundling future messages
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
