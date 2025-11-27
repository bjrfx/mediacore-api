# MediaCore API

A secure, role-based backend API built with Node.js (Express) for managing media content. Features Firebase Authentication for admins, a flexible API key permission system, and comprehensive analytics tracking.

## 🚀 Features

- **Admin Authentication**: Firebase ID Token verification for secure admin access
- **Role-Based API Keys**: Generate API keys with customizable permissions
- **Media Upload**: Upload and manage video (.mp4) and audio (.mp3) files
- **Firestore Integration**: Store metadata, API keys, and settings in Firebase Firestore
- **Local File Storage**: Store media files on server disk (cPanel compatible)
- **CORS Support**: Configurable cross-origin requests
- **📊 Analytics Dashboard**: Track all API requests, response times, and usage patterns

## 📁 Project Structure

```
mediacore-api/
├── config/
│   └── firebase.js              # Firebase Admin SDK initialization
├── middleware/
│   ├── index.js                 # Middleware exports
│   ├── checkAdminAuth.js        # Firebase auth middleware
│   ├── checkApiKeyPermissions.js # API key validation middleware
│   └── analyticsTracker.js      # Request analytics tracking
├── public/
│   └── uploads/
│       ├── video/               # Video file storage
│       └── audio/               # Audio file storage
├── .env.example                 # Environment variables template
├── .gitignore
├── package.json
├── server.js                    # Main application entry point
└── README.md
```

## 🔧 Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mediacore-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase credentials
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

### cPanel Deployment

1. **Upload files** to your cPanel hosting via File Manager or FTP

2. **Create Node.js Application**
   - Go to cPanel → "Setup Node.js App"
   - Click "Create Application"
   - Select Node.js version (18+)
   - Set Application root to your project folder
   - Set Application URL
   - Set Application startup file: `server.js`
   - Click "Create"

3. **Set Environment Variables**
   - In the Node.js App settings, add your environment variables
   - Most important: `FIREBASE_SERVICE_ACCOUNT_KEY`
   - Set `NODE_ENV=production`

4. **Install Dependencies**
   - Click "Run NPM Install" in cPanel's Node.js app interface
   - Or SSH into your server and run `npm install`

5. **Start/Restart the Application**
   - Click "Run" or "Restart" in cPanel

## ⚙️ Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment mode | No |
| `CORS_ORIGIN` | Allowed CORS origins | No |
| `UPLOAD_DIR` | Upload directory path | No |
| `MAX_FILE_SIZE` | Max upload size in bytes | No |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Full Firebase service account JSON | Yes* |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes* |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | Yes* |
| `FIREBASE_PRIVATE_KEY` | Firebase private key | Yes* |

*Either `FIREBASE_SERVICE_ACCOUNT_KEY` OR the individual Firebase variables are required.

## 📚 API Reference

### Public Endpoints (Require API Key)

#### Get Media Feed
```http
GET /api/feed
x-api-key: your_api_key
```

Query Parameters:
- `type` (optional): Filter by 'video' or 'audio'
- `limit` (optional): Number of results (default: 50)
- `orderBy` (optional): Field to order by (default: 'createdAt')
- `order` (optional): 'asc' or 'desc' (default: 'desc')

#### Get Single Media Item
```http
GET /api/media/:id
x-api-key: your_api_key
```

#### Get App Settings
```http
GET /api/settings
x-api-key: your_api_key
```

### Admin Endpoints (Require Firebase Auth)

#### Generate API Key
```http
POST /admin/generate-key
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "name": "My App Key",
  "accessType": "read_only",  // "read_only" | "full_access" | "custom"
  "customPermissions": [],     // Required if accessType is "custom"
  "expiresInDays": 365,       // Optional, null for never
  "description": "API key for my mobile app"
}
```

**Access Types:**
- `read_only`: `["read:media", "read:settings"]`
- `full_access`: `["read:media", "write:media", "update:media", "delete:media", "read:settings", "update:settings"]`
- `custom`: Provide your own array of permissions

#### List API Keys
```http
GET /admin/api-keys
Authorization: Bearer <firebase_id_token>
```

#### Revoke API Key
```http
DELETE /admin/api-keys/:id
Authorization: Bearer <firebase_id_token>
```

#### Upload Media
```http
POST /admin/media
Authorization: Bearer <firebase_id_token>
Content-Type: multipart/form-data

file: <binary>
title: "My Video Title"
subtitle: "Optional subtitle"
type: "video"  // "video" or "audio"
```

#### Update Media
```http
PUT /admin/media/:id
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "title": "Updated Title",
  "subtitle": "Updated subtitle"
}
```

#### Delete Media
```http
DELETE /admin/media/:id
Authorization: Bearer <firebase_id_token>
```

#### Update Settings
```http
PUT /admin/settings
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "appName": "My Media App",
  "theme": "dark"
}
```

#### Get Available Permissions
```http
GET /admin/permissions
Authorization: Bearer <firebase_id_token>
```

### Analytics Endpoints (Require Firebase Auth)

#### Get Analytics Dashboard
```http
GET /admin/analytics/dashboard
Authorization: Bearer <firebase_id_token>
```

Returns comprehensive dashboard data including:
- Overview stats (total requests, success rate, avg response time)
- Daily request charts
- Hourly distribution
- Top endpoints
- Method and status code distribution
- Top API keys by usage
- Recent requests

#### Get Analytics Summary
```http
GET /admin/analytics/summary?days=30
Authorization: Bearer <firebase_id_token>
```

Query Parameters:
- `days` (optional): Number of days to include (default: 30)

#### Get Real-Time Analytics
```http
GET /admin/analytics/realtime
Authorization: Bearer <firebase_id_token>
```

Returns:
- Today's stats
- Yesterday's stats  
- Recent requests (last 20)
- Requests per minute

#### Get API Key Statistics
```http
GET /admin/analytics/api-keys
Authorization: Bearer <firebase_id_token>
```

Query Parameters:
- `keyId` (optional): Filter by specific API key ID

#### Flush Analytics Buffer
```http
POST /admin/analytics/flush
Authorization: Bearer <firebase_id_token>
```

Manually flushes the in-memory analytics buffer to Firestore.

## 🔐 Permission System

### Available Permissions

| Permission | Description |
|------------|-------------|
| `read:media` | GET requests on media endpoints |
| `write:media` | POST requests to create media |
| `update:media` | PUT/PATCH requests to update media |
| `delete:media` | DELETE requests to remove media |
| `read:settings` | GET requests on settings endpoint |
| `update:settings` | PUT requests to update settings |

### How Permissions Work

1. **Admin generates API key** with specific permissions
2. **Client includes API key** in `x-api-key` header
3. **Middleware validates** the key exists and is active
4. **Middleware checks** if the key's permissions include the required permission for the HTTP method and resource path

Example: A `GET /api/feed` request requires `read:media` permission.

## 🗄️ Firebase Collections

### `admins`
```javascript
{
  uid: "firebase_user_uid",
  email: "admin@example.com",
  role: "super_admin",
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

### `api_keys`
```javascript
{
  key: "mc_abc123...",
  name: "Mobile App Key",
  description: "API key for iOS app",
  accessType: "read_only",
  permissions: ["read:media", "read:settings"],
  isActive: true,
  createdBy: "admin_uid",
  createdAt: "2024-01-01T00:00:00.000Z",
  expiresAt: null,
  lastUsedAt: "2024-01-02T00:00:00.000Z",
  usageCount: 42
}
```

### `media_content`
```javascript
{
  title: "My Video",
  subtitle: "A great video",
  type: "video",
  filename: "uuid.mp4",
  originalName: "original_name.mp4",
  filePath: "/public/uploads/video/uuid.mp4",
  fileUrl: "https://example.com/public/uploads/video/uuid.mp4",
  fileSize: 1234567,
  mimeType: "video/mp4",
  uploadedBy: "admin_uid",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

### `app_settings`
```javascript
// Document ID: "general"
{
  appName: "MediaCore",
  version: "1.0.0",
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

### `analytics_requests`
```javascript
{
  timestamp: "2024-01-01T12:00:00.000Z",
  method: "GET",
  path: "/api/feed",
  endpoint: "/api/feed",
  statusCode: 200,
  responseTime: 45,
  userAgent: "Mozilla/5.0...",
  ip: "192.168.1.1",
  apiKeyId: "abc123",
  apiKeyName: "Mobile App",
  success: true
}
```

### `analytics_daily`
```javascript
// Document ID: "2024-01-01" (date)
{
  date: "2024-01-01",
  totalRequests: 1500,
  successfulRequests: 1450,
  failedRequests: 50,
  avgResponseTime: 42,
  endpoints: {
    "/api/feed": 1200,
    "/api/media": 300
  },
  methods: {
    "GET": 1400,
    "POST": 100
  },
  statusCodes: {
    "200": 1400,
    "201": 50,
    "404": 30,
    "500": 20
  },
  hourlyRequests: {
    "00": 45,
    "01": 32,
    // ... 
    "23": 89
  }
}
```

### `analytics_stats`
```javascript
// Document ID: "overall"
{
  totalRequests: 150000,
  totalSuccessful: 148500,
  totalFailed: 1500,
  createdAt: "2024-01-01T00:00:00.000Z",
  lastUpdated: "2024-01-15T12:00:00.000Z"
}
```

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3000/health
```

### Test with API Key
```bash
curl -H "x-api-key: your_api_key" http://localhost:3000/api/feed
```

### Generate Admin Token (Firebase Client SDK)
```javascript
// In your frontend/admin app
const token = await firebase.auth().currentUser.getIdToken();
console.log(token); // Use this in Authorization header
```

## 🔒 Security Notes

1. **Never commit `.env`** - It's in `.gitignore`
2. **First authenticated user** automatically becomes admin
3. **API keys are hashed** in preview responses
4. **File validation** checks both MIME type and extension
5. **Rate limiting** - Consider adding for production

## 📝 License

ISC

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
