require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');

// Import configurations
const db = require('./config/database');
const redis = require('./config/redis');
const swaggerSpecs = require('./config/swagger');
const SocketManager = require('./config/socket');

// Import middleware
const { 
  generalLimiter, 
  helmetConfig, 
  corsOptions, 
  sanitizeInput, 
  requestLogger, 
  errorHandler, 
  notFoundHandler,
  trustProxy 
} = require('./middleware/security');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const timetableRoutes = require('./routes/timetables');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');

// Import controllers
const notificationController = require('./controllers/notificationController');

// Import Swagger UI
const swaggerUi = require('swagger-ui-express');

class AppServer {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
  this.io = new SocketIOServer(this.server, {
      cors: corsOptions,
      transports: ['websocket', 'polling']
    });
    this.socketManager = new SocketManager(this.io);
    this.port = process.env.PORT || 3000;
  }

  async initialize() {
    try {
      // Connect to databases
      await db.connect();
      await redis.connect();

      // Initialize notification controller with Socket.IO
      notificationController.initialize(this.io);

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      // Setup Socket.IO
      this.setupSocketIO();

      console.log('✅ Server initialized successfully');
    } catch (error) {
      console.error('❌ Server initialization failed:', error);
      throw error;
    }
  }

  setupMiddleware() {
    // Trust proxy for accurate IP addresses
    this.app.use(trustProxy);

    // Security middleware
    this.app.use(helmetConfig);
    this.app.use(cors(corsOptions));

    // Compression middleware
    this.app.use(compression());

    // Request logging
    this.app.use(morgan('combined'));

    // Rate limiting
    this.app.use(generalLimiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Input sanitization
    this.app.use(sanitizeInput);

    // Request logging
    this.app.use(requestLogger);
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const [dbHealth, redisHealth] = await Promise.all([
          db.healthCheck(),
          redis.healthCheck()
        ]);

        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: dbHealth,
            redis: redisHealth
          },
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.env.npm_package_version || '1.0.0'
        };

        const isHealthy = dbHealth.status === 'healthy' && redisHealth.status === 'healthy';
        res.status(isHealthy ? 200 : 503).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    // API documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'AI Timetable API Documentation'
    }));

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/timetables', timetableRoutes);
    this.app.use('/api/analytics', analyticsRoutes);
    this.app.use('/api/notifications', notificationRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: 'AI-Powered Timetable Generation System API',
        version: '1.0.0',
        documentation: '/api-docs',
        health: '/health',
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler
    this.app.use(notFoundHandler);
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use(errorHandler);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.gracefulShutdown();
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown();
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      console.log('SIGTERM received');
      this.gracefulShutdown();
    });

    // Handle SIGINT
    process.on('SIGINT', () => {
      console.log('SIGINT received');
      this.gracefulShutdown();
    });
  }

  setupSocketIO() {
    // Socket.IO connection handling is done in SocketManager
    console.log('🔌 Socket.IO configured');
  }

  async start() {
    try {
      await this.initialize();

      this.server.listen(this.port, () => {
        console.log(`
🚀 AI Timetable Server is running!
📍 Server: http://localhost:${this.port}
📚 API Docs: http://localhost:${this.port}/api-docs
🏥 Health Check: http://localhost:${this.port}/health
🔌 Socket.IO: Enabled
🌍 Environment: ${process.env.NODE_ENV || 'development'}
        `);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  async gracefulShutdown() {
    console.log('🛑 Gracefully shutting down server...');

    // Stop accepting new connections
    this.server.close(async () => {
      console.log('📴 HTTP server closed');

      try {
        // Close Socket.IO
        this.io.close(() => {
          console.log('📴 Socket.IO server closed');
        });

        // Disconnect from databases
        await db.disconnect();
        await redis.disconnect();

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
      }
    });

    // Force close after 30 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  }
}

// Create and start server
const appServer = new AppServer();
appServer.start();

module.exports = appServer;




