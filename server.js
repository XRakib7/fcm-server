const express = require('express');
const admin = require('firebase-admin');
const helmet = require('helmet');
const pino = require('pino');
const pinoHttp = require('pino-http');
const { z } = require('zod');

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

const app = express();

// Security middleware
app.use(helmet());

// JSON parsing
app.use(express.json());

// HTTP request logging (Pino)
app.use(pinoHttp({ logger }));

// Load service account from environment variable
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  logger.fatal('FIREBASE_SERVICE_ACCOUNT environment variable is not set!');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
  logger.info({ projectId: serviceAccount.project_id }, 'Service account parsed');
} catch (err) {
  logger.fatal({ err }, 'Failed to parse service account JSON');
  process.exit(1);
}

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  logger.info('Firebase Admin SDK initialized');
} catch (err) {
  logger.fatal({ err }, 'Failed to initialize Firebase Admin');
  process.exit(1);
}

// Validation schema for incoming notification requests
const notificationSchema = z.object({
  token: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.string()).optional(),
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Send notification endpoint
app.post('/send-notification', async (req, res) => {
  const requestLogger = req.log.child({ body: req.body });

  try {
    // Validate request body
    const validated = notificationSchema.parse(req.body);
    requestLogger.info({ validated }, 'Request validated');

    const { token, title, body, data = {} } = validated;

    // Construct FCM message
    const message = {
      notification: { title, body },
      data,
      android: { priority: 'high' },
      token,
    };

    // Send via Firebase Admin SDK (handles auth & retries automatically)
    const response = await admin.messaging().send(message);
    requestLogger.info({ messageId: response }, 'Notification sent');

    res.status(200).json({
      success: true,
      messageId: response,
    });
  } catch (err) {
    requestLogger.error({ err }, 'Failed to send notification');

    // Handle validation errors
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: err.errors,
      });
    }

    // Handle FCM errors
    if (err.code === 'messaging/invalid-argument') {
      return res.status(400).json({
        success: false,
        error: 'Invalid FCM token or message',
      });
    }
    if (err.code === 'messaging/registration-token-not-registered') {
      return res.status(400).json({
        success: false,
        error: 'Token expired or unregistered',
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Graceful shutdown
const server = app.listen(process.env.PORT || 10000, () => {
  logger.info(`Server listening on port ${process.env.PORT || 10000}`);
});

const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);