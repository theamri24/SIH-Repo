# AI-Powered Timetable Generation System

A comprehensive backend system for AI-powered timetable generation aligned with NEP 2020 multidisciplinary education requirements.

## 🚀 Features

### Core Functionality
- **AI-Powered Timetable Generation** using genetic algorithms
- **Multidisciplinary Course Support** for NEP 2020 compliance
- **Real-time Conflict Resolution** and optimization
- **Teacher Workload Balancing** with intelligent distribution
- **Room/Lab Optimization** with capacity and equipment matching
- **Dynamic Updates** with real-time notifications

### User Management
- **Role-based Authentication** (Students, Teachers, Admins)
- **JWT-based Security** with refresh tokens
- **Profile Management** with preferences and availability
- **Secure API Endpoints** with rate limiting

### Analytics & Reporting
- **Room Utilization Analytics** with detailed insights
- **Teacher Workload Reports** with optimization suggestions
- **Student Free Hours Analysis** for better scheduling
- **Comprehensive Dashboard** with real-time metrics

### Real-time Features
- **Socket.IO Integration** for live updates
- **Push Notifications** for timetable changes
- **Live Conflict Resolution** notifications
- **Real-time Analytics** updates

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for performance optimization
- **Real-time**: Socket.IO for live updates
- **Authentication**: JWT with bcrypt
- **Documentation**: Swagger/OpenAPI 3.0
- **Testing**: Jest with comprehensive coverage

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- PostgreSQL 13+
- Redis 6+
- npm or yarn

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ai-timetable-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
cp env.example .env
```

Edit `.env` file with your configuration:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ai_timetable_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# Redis
REDIS_URL="redis://localhost:6379"

# Server
PORT=3000
NODE_ENV="development"
```

### 4. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed demo data
npm run db:seed
```

### 5. Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start at `http://localhost:3000`

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **Health Check**: `http://localhost:3000/health`

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm test -- --coverage
```

## 📁 Project Structure

```
src/
├── config/           # Configuration files
│   ├── database.js   # Database connection
│   ├── redis.js      # Redis connection
│   ├── socket.js     # Socket.IO setup
│   └── swagger.js    # API documentation
├── controllers/      # Request handlers
│   ├── authController.js
│   ├── userController.js
│   ├── timetableController.js
│   ├── analyticsController.js
│   └── notificationController.js
├── middleware/       # Custom middleware
│   ├── auth.js       # Authentication
│   ├── validation.js # Input validation
│   └── security.js   # Security measures
├── routes/          # API routes
│   ├── auth.js
│   ├── users.js
│   ├── timetables.js
│   ├── analytics.js
│   └── notifications.js
├── services/        # Business logic
│   ├── aiTimetableService.js
│   └── notificationService.js
├── scripts/         # Utility scripts
│   └── seed.js      # Database seeding
└── server.js        # Application entry point
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users` - Get all users (Admin)
- `GET /api/users/students` - Get all students
- `GET /api/users/teachers` - Get all teachers
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user (Admin)

### Timetables
- `POST /api/timetables/generate` - Generate AI timetable
- `GET /api/timetables/student/:id` - Get student timetable
- `GET /api/timetables/teacher/:id` - Get teacher timetable
- `GET /api/timetables` - Get all timetables (Admin)
- `POST /api/timetables` - Create timetable slot (Admin)
- `PUT /api/timetables/:id` - Update timetable slot (Admin)
- `DELETE /api/timetables/:id` - Delete timetable slot (Admin)

### Analytics
- `GET /api/analytics/room-utilization` - Room utilization report
- `GET /api/analytics/teacher-workload` - Teacher workload report
- `GET /api/analytics/student-free-hours` - Student free hours report
- `GET /api/analytics/dashboard` - Comprehensive dashboard

### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

## 🤖 AI Timetable Generation

The system uses a genetic algorithm approach for timetable optimization:

### Algorithm Features
- **Population-based optimization** with configurable parameters
- **Multi-objective fitness function** considering:
  - Teacher workload balance
  - Room capacity utilization
  - Student preferences
  - Conflict minimization
- **Adaptive mutation and crossover** for better convergence
- **Real-time conflict detection** and resolution

### Configuration
```env
AI_MAX_ITERATIONS=1000
AI_CONFLICT_THRESHOLD=0.8
AI_OPTIMIZATION_WEIGHT=0.5
```

## 🔒 Security Features

- **JWT Authentication** with secure token handling
- **Rate Limiting** to prevent abuse
- **Input Validation** and sanitization
- **CORS Protection** with configurable origins
- **Helmet.js** for security headers
- **Password Hashing** with bcrypt
- **SQL Injection Protection** via Prisma ORM

## 📊 Database Schema

### Key Entities
- **Users** - Base user information
- **Students** - Student-specific data and preferences
- **Teachers** - Teacher availability and workload
- **Courses** - Course information with multidisciplinary tags
- **Rooms** - Room capacity and equipment
- **Timetables** - Generated schedule slots
- **AILogs** - AI operation tracking
- **Notifications** - Real-time notifications

## 🚀 Deployment

### Docker Deployment
```bash
# Build image
docker build -t ai-timetable-backend .

# Run container
docker run -p 3000:3000 ai-timetable-backend
```

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
JWT_SECRET=your-production-secret
CORS_ORIGIN=https://your-frontend-domain.com
```

## 📈 Performance Optimization

- **Redis Caching** for frequently accessed data
- **Database Indexing** for optimal query performance
- **Connection Pooling** for database efficiency
- **Compression** for API responses
- **Rate Limiting** for API protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Email: info@aitimetable.com
- Documentation: `/api-docs`
- Issues: GitHub Issues

## 🔮 Future Enhancements

- **Machine Learning Integration** for better predictions
- **Mobile App Support** with push notifications
- **Advanced Analytics** with data visualization
- **Integration APIs** for external systems
- **Multi-language Support** for international use
- **Advanced Scheduling** with recurring events



