# MediaCore API Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Public API Endpoints](#public-api-endpoints)
5. [Admin API Endpoints](#admin-api-endpoints)
6. [Analytics Endpoints](#analytics-endpoints)
7. [Error Handling](#error-handling)
8. [Frontend Integration Guide](#frontend-integration-guide)
9. [Code Examples](#code-examples)

---

## Overview

MediaCore API is a RESTful backend service for managing media content (video/audio files). It provides:

- **Public API** - For mobile/web apps to fetch media content (requires API Key)
- **Admin API** - For admin dashboard to manage content (requires Firebase Auth)
- **Analytics** - Track API usage and visitor statistics

---

## Base URL

| Environment | URL |
|-------------|-----|
| **Production** | `https://mediacoreapi.masakalirestrobar.ca` |
| **Local Development** | `http://localhost:3000` |

---

## Authentication

### 1. API Key Authentication (For Public Endpoints)

Used by mobile apps and web clients to access media content.

**Header:**
```
x-api-key: mc_your_api_key_here
```

**How to get an API Key:**
1. Login to admin dashboard
2. Go to API Keys section
3. Generate a new key with appropriate permissions

### 2. Firebase Admin Authentication (For Admin Endpoints)

Used by admin dashboard for content management.

**Header:**
```
Authorization: Bearer <firebase_id_token>
```

**How to get a Firebase ID Token:**
```javascript
// In your frontend app with Firebase Auth
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const idToken = await auth.currentUser.getIdToken();
```

---

## Public API Endpoints

These endpoints require an **API Key** with appropriate permissions.

### GET /api/feed

Fetch all media content.

**Headers:**
```
x-api-key: mc_your_api_key_here
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | - | Filter by type: `video` or `audio` |
| `limit` | number | 50 | Maximum items to return |
| `orderBy` | string | `createdAt` | Field to sort by |
| `order` | string | `desc` | Sort order: `asc` or `desc` |

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "abc123",
      "title": "Sample Video",
      "subtitle": "Description here",
      "type": "video",
      "fileUrl": "https://mediacoreapi.masakalirestrobar.ca/public/uploads/video/uuid.mp4",
      "fileSize": 15728640,
      "mimeType": "video/mp4",
      "createdAt": "2025-11-28T10:30:00.000Z"
    }
  ]
}
```

---

### GET /api/media/:id

Fetch a single media item by ID.

**Headers:**
```
x-api-key: mc_your_api_key_here
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "title": "Sample Video",
    "subtitle": "Description here",
    "type": "video",
    "fileUrl": "https://mediacoreapi.masakalirestrobar.ca/public/uploads/video/uuid.mp4",
    "fileSize": 15728640,
    "mimeType": "video/mp4",
    "createdAt": "2025-11-28T10:30:00.000Z"
  }
}
```

---

### GET /api/settings

Fetch app settings.

**Headers:**
```
x-api-key: mc_your_api_key_here
```

**Response:**
```json
{
  "success": true,
  "data": {
    "appName": "MediaCore",
    "version": "1.0.0",
    "theme": "dark"
  }
}
```

---

## Admin API Endpoints

These endpoints require **Firebase Admin Authentication**.

### POST /admin/generate-key

Generate a new API key.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Mobile App Production",
  "accessType": "read_only",
  "description": "API key for mobile app",
  "expiresInDays": 365
}
```

**Access Types:**
| Type | Permissions |
|------|-------------|
| `read_only` | `read:media`, `read:settings` |
| `full_access` | All permissions |
| `custom` | Specify custom permissions array |

**Response:**
```json
{
  "success": true,
  "message": "API key generated successfully",
  "data": {
    "id": "key_doc_id",
    "key": "mc_abc123def456...",
    "name": "Mobile App Production",
    "accessType": "read_only",
    "permissions": ["read:media", "read:settings"],
    "expiresAt": "2026-11-28T10:30:00.000Z"
  }
}
```

---

### GET /admin/api-keys

List all API keys.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "key_id",
      "name": "Mobile App",
      "accessType": "read_only",
      "permissions": ["read:media", "read:settings"],
      "isActive": true,
      "keyPreview": "mc_****abc123",
      "usageCount": 1250,
      "lastUsedAt": "2025-11-28T10:30:00.000Z"
    }
  ]
}
```

---

### DELETE /admin/api-keys/:id

Delete or deactivate an API key.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `hardDelete` | boolean | false | Permanently delete if true |

---

### POST /admin/media

Upload new media content.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | The media file (.mp4 or .mp3) |
| `title` | string | Yes | Title of the media |
| `subtitle` | string | No | Description/subtitle |
| `type` | string | No | `video` (default) or `audio` |

**Response:**
```json
{
  "success": true,
  "message": "Media uploaded successfully",
  "data": {
    "id": "media_id",
    "title": "My Video",
    "fileUrl": "https://mediacoreapi.masakalirestrobar.ca/public/uploads/video/uuid.mp4",
    "fileSize": 15728640,
    "createdAt": "2025-11-28T10:30:00.000Z"
  }
}
```

---

### PUT /admin/media/:id

Update media metadata.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Updated Title",
  "subtitle": "Updated description"
}
```

---

### DELETE /admin/media/:id

Delete media content.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `deleteFile` | boolean | true | Also delete the physical file |

---

### PUT /admin/settings

Update app settings.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Body:**
```json
{
  "appName": "My App",
  "theme": "dark",
  "customSetting": "value"
}
```

---

## Analytics Endpoints

All analytics endpoints require **Firebase Admin Authentication**.

### GET /admin/analytics/summary

Get analytics summary for a period.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | number | 30 | Number of days to analyze |

---

### GET /admin/analytics/realtime

Get real-time statistics (last 24 hours).

---

### GET /admin/analytics/dashboard

Get comprehensive dashboard data in a single request.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalMediaItems": 45,
      "activeApiKeys": 3,
      "totalRequests": 15420,
      "requestsToday": 1250,
      "successRate": 98.5,
      "avgResponseTime": 125
    },
    "charts": {
      "dailyRequests": [...],
      "topEndpoints": [...],
      "methodDistribution": {...}
    },
    "recentRequests": [...]
  }
}
```

---

### GET /admin/analytics/api-keys

Get API key usage statistics.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `keyId` | string | Filter by specific key ID |

---

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message"
}
```

**Common Error Codes:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 413 | File Too Large | Upload exceeds 500MB limit |
| 415 | Unsupported Media Type | Invalid file type |
| 500 | Internal Server Error | Server-side error |

---

## Frontend Integration Guide

### Step 1: Install Dependencies

```bash
npm install axios firebase
```

### Step 2: Create API Service

Create a file `src/services/api.js`:

```javascript
import axios from 'axios';
import { getAuth } from 'firebase/auth';

// API Configuration
const API_BASE_URL = 'https://mediacoreapi.masakalirestrobar.ca';
// For local development: 'http://localhost:3000'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ============================================
// PUBLIC API (uses API Key)
// ============================================

const API_KEY = 'mc_your_api_key_here'; // Get this from admin dashboard

export const publicApi = {
  // Get all media
  getMedia: async (options = {}) => {
    const { type, limit = 50, orderBy = 'createdAt', order = 'desc' } = options;
    const params = new URLSearchParams({ limit, orderBy, order });
    if (type) params.append('type', type);
    
    const response = await api.get(`/api/feed?${params}`, {
      headers: { 'x-api-key': API_KEY }
    });
    return response.data;
  },

  // Get single media by ID
  getMediaById: async (id) => {
    const response = await api.get(`/api/media/${id}`, {
      headers: { 'x-api-key': API_KEY }
    });
    return response.data;
  },

  // Get app settings
  getSettings: async () => {
    const response = await api.get('/api/settings', {
      headers: { 'x-api-key': API_KEY }
    });
    return response.data;
  }
};

// ============================================
// ADMIN API (uses Firebase Auth)
// ============================================

// Helper to get auth token
const getAuthToken = async () => {
  const auth = getAuth();
  if (!auth.currentUser) {
    throw new Error('Not authenticated');
  }
  return await auth.currentUser.getIdToken();
};

// Helper to create auth headers
const getAuthHeaders = async () => {
  const token = await getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const adminApi = {
  // ---- Media Management ----
  
  uploadMedia: async (file, title, subtitle = '', type = 'video') => {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('subtitle', subtitle);
    formData.append('type', type);
    
    const response = await api.post('/admin/media', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  updateMedia: async (id, data) => {
    const headers = await getAuthHeaders();
    const response = await api.put(`/admin/media/${id}`, data, { headers });
    return response.data;
  },

  deleteMedia: async (id, deleteFile = true) => {
    const headers = await getAuthHeaders();
    const response = await api.delete(`/admin/media/${id}?deleteFile=${deleteFile}`, { headers });
    return response.data;
  },

  // ---- API Key Management ----
  
  generateApiKey: async (name, accessType = 'read_only', options = {}) => {
    const headers = await getAuthHeaders();
    const response = await api.post('/admin/generate-key', {
      name,
      accessType,
      ...options
    }, { headers });
    return response.data;
  },

  getApiKeys: async () => {
    const headers = await getAuthHeaders();
    const response = await api.get('/admin/api-keys', { headers });
    return response.data;
  },

  deleteApiKey: async (id, hardDelete = false) => {
    const headers = await getAuthHeaders();
    const response = await api.delete(`/admin/api-keys/${id}?hardDelete=${hardDelete}`, { headers });
    return response.data;
  },

  // ---- Settings ----
  
  updateSettings: async (settings) => {
    const headers = await getAuthHeaders();
    const response = await api.put('/admin/settings', settings, { headers });
    return response.data;
  },

  // ---- Analytics ----
  
  getDashboard: async () => {
    const headers = await getAuthHeaders();
    const response = await api.get('/admin/analytics/dashboard', { headers });
    return response.data;
  },

  getAnalyticsSummary: async (days = 30) => {
    const headers = await getAuthHeaders();
    const response = await api.get(`/admin/analytics/summary?days=${days}`, { headers });
    return response.data;
  },

  getRealTimeStats: async () => {
    const headers = await getAuthHeaders();
    const response = await api.get('/admin/analytics/realtime', { headers });
    return response.data;
  }
};

export default { publicApi, adminApi };
```

### Step 3: Firebase Setup

Create `src/config/firebase.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB4EEnbp67-U-GkImFsx7IR5Au7t3yEaDA",
  authDomain: "eckhart-tolle-7a33f.firebaseapp.com",
  projectId: "eckhart-tolle-7a33f",
  storageBucket: "eckhart-tolle-7a33f.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
```

### Step 4: Usage Examples

#### React Example - Fetch Media Feed:

```jsx
import React, { useEffect, useState } from 'react';
import { publicApi } from '../services/api';

function MediaFeed() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const response = await publicApi.getMedia({ type: 'video', limit: 20 });
        if (response.success) {
          setMedia(response.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="media-feed">
      {media.map(item => (
        <div key={item.id} className="media-card">
          <h3>{item.title}</h3>
          <p>{item.subtitle}</p>
          <video src={item.fileUrl} controls />
        </div>
      ))}
    </div>
  );
}

export default MediaFeed;
```

#### React Example - Admin Upload:

```jsx
import React, { useState } from 'react';
import { adminApi } from '../services/api';

function UploadMedia() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title) return;

    setUploading(true);
    try {
      const response = await adminApi.uploadMedia(file, title, '', 'video');
      if (response.success) {
        alert('Upload successful!');
        setFile(null);
        setTitle('');
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleUpload}>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        type="file"
        accept="video/mp4,audio/mp3"
        onChange={(e) => setFile(e.target.files[0])}
        required
      />
      <button type="submit" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  );
}

export default UploadMedia;
```

#### Flutter/Dart Example:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class MediaCoreApi {
  static const String baseUrl = 'https://mediacoreapi.masakalirestrobar.ca';
  static const String apiKey = 'mc_your_api_key_here';

  // Fetch media feed
  static Future<List<dynamic>> getMediaFeed({String? type, int limit = 50}) async {
    final params = {'limit': limit.toString()};
    if (type != null) params['type'] = type;
    
    final uri = Uri.parse('$baseUrl/api/feed').replace(queryParameters: params);
    
    final response = await http.get(
      uri,
      headers: {'x-api-key': apiKey},
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['data'];
    } else {
      throw Exception('Failed to load media');
    }
  }

  // Fetch single media
  static Future<Map<String, dynamic>> getMediaById(String id) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/media/$id'),
      headers: {'x-api-key': apiKey},
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['data'];
    } else {
      throw Exception('Media not found');
    }
  }
}

// Usage:
void main() async {
  final media = await MediaCoreApi.getMediaFeed(type: 'video');
  print(media);
}
```

---

## Code Examples

### cURL Examples

```bash
# Health Check
curl https://mediacoreapi.masakalirestrobar.ca/health

# Get Media Feed (with API Key)
curl -H "x-api-key: mc_your_key_here" \
  https://mediacoreapi.masakalirestrobar.ca/api/feed

# Get Media Feed (filtered by type)
curl -H "x-api-key: mc_your_key_here" \
  "https://mediacoreapi.masakalirestrobar.ca/api/feed?type=video&limit=10"

# Get Single Media
curl -H "x-api-key: mc_your_key_here" \
  https://mediacoreapi.masakalirestrobar.ca/api/media/MEDIA_ID

# Admin - Generate API Key (with Firebase Token)
curl -X POST \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My App","accessType":"read_only"}' \
  https://mediacoreapi.masakalirestrobar.ca/admin/generate-key

# Admin - Upload Media
curl -X POST \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN" \
  -F "file=@/path/to/video.mp4" \
  -F "title=My Video" \
  -F "type=video" \
  https://mediacoreapi.masakalirestrobar.ca/admin/media

# Admin - Get Dashboard
curl -H "Authorization: Bearer FIREBASE_ID_TOKEN" \
  https://mediacoreapi.masakalirestrobar.ca/admin/analytics/dashboard
```

---

## Quick Reference

### Endpoint Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | None | API info |
| GET | `/health` | None | Health check |
| GET | `/api/feed` | API Key | Get all media |
| GET | `/api/media/:id` | API Key | Get single media |
| GET | `/api/settings` | API Key | Get app settings |
| POST | `/admin/generate-key` | Firebase | Create API key |
| GET | `/admin/api-keys` | Firebase | List API keys |
| DELETE | `/admin/api-keys/:id` | Firebase | Delete API key |
| POST | `/admin/media` | Firebase | Upload media |
| PUT | `/admin/media/:id` | Firebase | Update media |
| DELETE | `/admin/media/:id` | Firebase | Delete media |
| PUT | `/admin/settings` | Firebase | Update settings |
| GET | `/admin/analytics/summary` | Firebase | Analytics summary |
| GET | `/admin/analytics/realtime` | Firebase | Real-time stats |
| GET | `/admin/analytics/dashboard` | Firebase | Full dashboard |
| GET | `/admin/analytics/api-keys` | Firebase | API key stats |

### Available Permissions

| Permission | Description |
|------------|-------------|
| `read:media` | Read media content |
| `write:media` | Create/update media |
| `delete:media` | Delete media |
| `read:settings` | Read app settings |
| `write:settings` | Update app settings |
| `read:analytics` | View analytics |

---

## Support

For issues or questions, check the server logs or contact the development team.
