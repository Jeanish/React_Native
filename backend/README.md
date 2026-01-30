# Salon App Backend API

**Version:** 3.0.0 - Phase 3 Complete ✅  
**Last Updated:** January 19, 2026

---

## 🎉 Phase 3 Salon Management - COMPLETE!

✅ **Status:** Production-Ready  
✅ **Build:** Successful  
✅ **Cost:** $0/month (100% Free Tier)  
✅ **Security:** Enterprise-Grade  
✅ **Timeline:** On Track for April 1st Launch

### What's New in Phase 3
- ✅ Salon registration and management
- ✅ Geospatial search (nearby salons)
- ✅ Multi-image upload to Cloudinary
- ✅ Salon approval workflow
- ✅ Category and city management
- ✅ Advanced search with filters
- ✅ Admin dashboard
- ✅ 22 new API endpoints (33 total)

### Previous Phases
- ✅ Phase 2: Authentication (OTP + Email/Password)
- ✅ Phase 1: Project Setup

📚 **Documentation:**
- [Phase 3 Salon Management Guide](./docs/PHASE_3_SALON_MANAGEMENT.md)
- [Phase 2 Authentication Guide](./PHASE_2_AUTHENTICATION.md)
- [Project Status](./docs/PROJECT_STATUS.md)
- [Quick Start Guide](./QUICK_START.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Developer Checklist](./DEVELOPER_CHECKLIST.md)

---

## 📋 Overview

RESTful API backend for the Salon Appointment & Queue Management System. Built with Node.js, Express.js, TypeScript, and MongoDB.

---

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- npm v9+
- MongoDB Atlas account

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
nano .env

# Start development server
npm run dev
```

The server will start at `http://localhost:5000`

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts         # MongoDB connection
│   │   ├── firebase.ts         # FCM configuration
│   │   ├── cloudinary.ts       # Image upload config
│   │   └── environment.ts      # Environment variables
│   │
│   ├── models/
│   │   ├── User.ts             # User schema
│   │   ├── Salon.ts            # Salon schema
│   │   ├── Service.ts          # Service schema
│   │   ├── Appointment.ts      # Appointment schema
│   │   ├── Queue.ts            # Queue schema
│   │   ├── Category.ts         # Category schema
│   │   ├── City.ts             # City schema
│   │   ├── Notification.ts     # Notification schema
│   │   └── OTP.ts              # OTP schema
│   │
│   ├── controllers/
│   │   ├── authController.ts   # Authentication logic
│   │   ├── userController.ts   # User management
│   │   ├── salonController.ts  # Salon operations
│   │   ├── serviceController.ts
│   │   ├── appointmentController.ts
│   │   ├── queueController.ts
│   │   └── adminController.ts
│   │
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── userRoutes.ts
│   │   ├── salonRoutes.ts
│   │   ├── serviceRoutes.ts
│   │   ├── appointmentRoutes.ts
│   │   ├── queueRoutes.ts
│   │   └── adminRoutes.ts
│   │
│   ├── middleware/
│   │   ├── auth.ts             # JWT verification
│   │   ├── roleCheck.ts        # RBAC middleware
│   │   ├── validation.ts       # Input validation
│   │   ├── errorHandler.ts     # Error handling
│   │   ├── rateLimiter.ts      # Rate limiting
│   │   └── logger.ts           # Request logging
│   │
│   ├── services/
│   │   ├── fcmService.ts       # Push notifications
│   │   ├── emailService.ts     # Email sending
│   │   ├── otpService.ts       # OTP generation
│   │   ├── uploadService.ts    # Image upload
│   │   ├── searchService.ts    # Search functionality
│   │   └── analyticsService.ts # Analytics tracking
│   │
│   ├── utils/
│   │   ├── jwt.ts              # JWT helpers
│   │   ├── validators.ts       # Custom validators
│   │   ├── constants.ts        # App constants
│   │   ├── helpers.ts          # Utility functions
│   │   └── logger.ts           # Winston logger
│   │
│   ├── socket/
│   │   ├── index.ts            # Socket.io setup
│   │   ├── queueHandler.ts     # Queue events
│   │   └── notificationHandler.ts
│   │
│   ├── app.ts                  # Express app setup
│   └── server.ts               # Server entry point
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload

# Production
npm run build            # Build TypeScript to JavaScript
npm start                # Start production server

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run format           # Format code with Prettier

# Database
npm run db:seed          # Seed initial data
```

---

## 🌐 API Endpoints

### Base URL
- **Development:** `http://localhost:5000/api/v1`
- **Production:** `https://api.salonapp.com/v1`

### Authentication (7 endpoints)
```
POST   /auth/send-otp           # Send OTP via FCM
POST   /auth/verify-otp         # Verify OTP and login
POST   /auth/salon/register     # Register salon admin
POST   /auth/salon/login        # Salon admin login
POST   /auth/refresh-token      # Refresh access token
POST   /auth/logout             # Logout user
GET    /auth/me                 # Get current user
```

### Users (4 endpoints)
```
GET    /users/me                # Get current user profile
PUT    /users/me                # Update profile
PUT    /users/fcm-token         # Update FCM token
DELETE /users/me                # Delete account
```

### Salons (9 endpoints)
```
# Public
GET    /salons                  # Get all salons (with filters)
GET    /salons/nearby           # Get nearby salons
GET    /salons/popular          # Get popular salons
GET    /salons/:id              # Get salon by ID

# Salon Admin (authenticated)
POST   /salons                  # Create salon
GET    /salons/my-salon         # Get own salon
PUT    /salons/:id              # Update salon
POST   /salons/:id/images       # Upload salon images
DELETE /salons/:id/images/:imageId # Delete salon image
```

### Categories (2 endpoints)
```
GET    /categories              # Get all categories
GET    /categories/:slug        # Get category by slug
```

### Cities (2 endpoints)
```
GET    /cities                  # Get all cities
GET    /cities/:id              # Get city by ID
```

### Admin (11 endpoints)
```
# Dashboard
GET    /admin/dashboard         # Get dashboard stats

# Salon Management
GET    /admin/salons/pending    # Get pending salons
PATCH  /admin/salons/:id/approve   # Approve salon
PATCH  /admin/salons/:id/reject    # Reject salon
PATCH  /admin/salons/:id/suspend   # Suspend salon

# Category Management
GET    /admin/categories        # Get all categories
POST   /admin/categories        # Create category
PUT    /admin/categories/:id    # Update category
DELETE /admin/categories/:id    # Delete category

# City Management
GET    /admin/cities            # Get all cities
POST   /admin/cities            # Create city
PUT    /admin/cities/:id        # Update city
DELETE /admin/cities/:id        # Delete city
```

### Services (Coming in Phase 4)
```
GET    /salons/:salonId/services           # Get salon services
POST   /salons/:salonId/services           # Create service
PUT    /salons/:salonId/services/:id       # Update service
DELETE /salons/:salonId/services/:id       # Delete service
```

### Appointments (Coming in Phase 4)
```
GET    /salons/:salonId/available-slots    # Get available slots
POST   /appointments                        # Create appointment
GET    /appointments                        # Get user appointments
GET    /salons/:salonId/appointments       # Get salon appointments
PATCH  /appointments/:id/status            # Update status
```

### Queue (Coming in Phase 5)
```
GET    /salons/:salonId/queue              # Get live queue
POST   /salons/:salonId/queue              # Join queue
PATCH  /queue/:id/status                   # Update queue status
DELETE /queue/:id                          # Remove from queue
```

### Notifications (Coming in Phase 6)
```
GET    /notifications                      # Get notifications
PATCH  /notifications/:id/read             # Mark as read
PATCH  /notifications/read-all             # Mark all as read
```

**Total Endpoints Implemented:** 33  
**Phase 2:** 11 endpoints  
**Phase 3:** 22 endpoints

For detailed API documentation, see [Phase 3 Documentation](./docs/PHASE_3_SALON_MANAGEMENT.md)

---

For detailed API documentation, see [API_DOCUMENTATION.md](../docs/api-specs/API_DOCUMENTATION.md)

---

## 🔐 Authentication

### JWT Tokens

The API uses JWT tokens for authentication:

- **Access Token:** Short-lived (1 hour), used for API requests
- **Refresh Token:** Long-lived (30 days), used to get new access tokens

### Headers

Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### OTP-Based Authentication

For customers, authentication is done via OTP sent through FCM:

1. User enters phone number
2. Backend generates 6-digit OTP
3. OTP sent via FCM push notification
4. User enters OTP to verify
5. JWT tokens issued upon successful verification

---

## 🗄️ Database

### MongoDB Collections

- **users** - All user accounts
- **salons** - Salon profiles
- **services** - Service catalog
- **categories** - Service categories
- **cities** - City master data
- **appointments** - Booking records
- **queue** - Live queue entries
- **notifications** - Notification history
- **otps** - OTP records
- **analytics** - Usage metrics

### Indexes

Key indexes for performance:

```javascript
// Users
users.createIndex({ email: 1 }, { unique: true });
users.createIndex({ phone: 1 }, { unique: true });
users.createIndex({ role: 1 });

// Salons
salons.createIndex({ location: '2dsphere' });
salons.createIndex({ city: 1, status: 1 });

// Appointments
appointments.createIndex({ salonId: 1, date: 1, status: 1 });
appointments.createIndex({ customerId: 1, status: 1 });

// Queue
queue.createIndex({ salonId: 1, status: 1, joinedAt: 1 });
```

---

## 🔌 WebSocket (Socket.io)

### Connection

```javascript
const socket = io('wss://api.salonapp.com', {
  auth: {
    token: 'Bearer <access_token>'
  }
});
```

### Events

```javascript
// Join salon room
socket.emit('join_salon', { salonId: '...' });

// Listen for queue updates
socket.on('queue_updated', (data) => {
  console.log('Queue updated:', data);
});

// Listen for new appointments
socket.on('appointment_created', (data) => {
  console.log('New appointment:', data);
});
```

---

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Test Coverage

```bash
npm test -- --coverage
```

---

## 🚀 Deployment

### Environment Variables

Ensure all required environment variables are set:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_production_jwt_secret
# ... other variables
```

### Build and Deploy

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

---

## 📊 Monitoring

### Logs

Logs are stored in the `logs/` directory:

- `error.log` - Error logs only
- `all.log` - All logs

### Health Check

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "success": true,
  "message": "Server is running",
  "data": {
    "uptime": 12345,
    "timestamp": "2026-01-18T10:00:00.000Z",
    "environment": "production"
  }
}
```

---

## 🔒 Security

- HTTPS only in production
- Helmet.js for security headers
- CORS configuration
- Rate limiting on sensitive endpoints
- Input validation and sanitization
- MongoDB injection prevention
- XSS protection
- JWT token expiration
- Secure password hashing (bcrypt)

---

## 🐛 Troubleshooting

### MongoDB Connection Issues

```bash
# Check MongoDB URI
echo $MONGODB_URI

# Test connection
npm run db:test
```

### Port Already in Use

```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

### TypeScript Compilation Errors

```bash
# Clean build
rm -rf dist
npm run build
```

---

## 📚 Additional Resources

- [Project Overview](../docs/PROJECT_OVERVIEW.md)
- [System Architecture](../docs/architecture/SYSTEM_ARCHITECTURE.md)
- [Database Schema](../docs/database/SCHEMA_DESIGN.md)
- [API Documentation](../docs/api-specs/API_DOCUMENTATION.md)

---

## 📞 Support

For issues or questions:
- Email: dev@salonapp.com
- Documentation: [docs/](../docs/)

---

**Last Updated:** January 18, 2026  
**Version:** 1.0.0
