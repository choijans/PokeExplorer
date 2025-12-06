# Firebase Setup Guide

## Database Structure

Your Firebase Realtime Database will have the following structure:

```
{
  "users": {
    "<userId>": {
      "collection": {
        "25": {
          "id": 25,
          "name": "pikachu",
          "count": 5,
          "firstCapturedAt": "2024-01-15T10:30:00.000Z",
          "lastCapturedAt": "2024-01-20T15:45:00.000Z",
          "highestCp": 850,
          "highestLevel": 28,
          "captures": {
            "<captureId1>": {
              "capturedAt": "2024-01-15T10:30:00.000Z",
              "location": {
                "latitude": 37.7749,
                "longitude": -122.4194
              },
              "biome": "urban",
              "cp": 450,
              "level": 15
            },
            "<captureId2>": {
              "capturedAt": "2024-01-20T15:45:00.000Z",
              "biome": "grass",
              "cp": 850,
              "level": 28
            }
          }
        }
      },
      "inventory": {
        "pokeball": {
          "name": "Poké Ball",
          "type": "pokeball",
          "count": 50,
          "icon": "⚪"
        },
        "greatball": {
          "name": "Great Ball",
          "type": "greatball",
          "count": 10,
          "icon": "🔵"
        },
        "ultraball": {
          "name": "Ultra Ball",
          "type": "ultraball",
          "count": 5,
          "icon": "🟡"
        },
        "razz": {
          "name": "Razz Berry",
          "type": "razz",
          "count": 10,
          "icon": "🍓"
        }
      },
      "stats": {
        "totalCaptured": 150,
        "uniqueCaptured": 42
      }
    }
  },
  "community": {
    "posts": {
      "<postId>": {
        "userId": "<userId>",
        "username": "Trainer123",
        "content": "Just caught a rare Charizard!",
        "timestamp": 1705315800000
      }
    },
    "leaderboard": {
      "<userId>": {
        "username": "Trainer123",
        "totalCaptured": 42,
        "updatedAt": 1705315800000
      }
    }
  }
}
```

## Setup Instructions

### 1. Apply Firebase Rules

1. Go to your Firebase Console: https://console.firebase.google.com
2. Select your project: `pokeexplorer-8b5dc`
3. Navigate to **Realtime Database** → **Rules**
4. Copy the contents of `firebase-rules.json` and paste into the rules editor
5. Click **Publish**

### 2. Database URL

Your database URL is already configured:
```
https://pokeexplorer-8b5dc-default-rtdb.asia-southeast1.firebasedatabase.app/
```

### 3. What Changed

**New Services:**
- `firebaseDiscoveryService.ts` - Syncs captured Pokemon to Firebase
- `firebaseInventoryService.ts` - Syncs inventory to Firebase

**Updated Screens:**
- `ARCaptureScreen.tsx` - Now saves captures to both local storage and Firebase

**Features:**
- ✅ Real-time inventory sync across devices
- ✅ Cloud backup of captured Pokemon
- ✅ **Multiple captures of same Pokemon** - Tracks count per species
- ✅ Capture history - Every catch is recorded with CP, level, location
- ✅ Best stats tracking - Highest CP and level per Pokemon
- ✅ User stats tracking (total captured, unique Pokemon)
- ✅ Secure user-specific data access
- ✅ Community features ready (posts, leaderboard)

### How Collection Works:

- **First Capture**: Creates new entry with count = 1
- **Duplicate Captures**: Increments count, updates lastCapturedAt
- **History**: All captures stored in `captures` array
- **Best Stats**: Tracks highest CP and level across all captures
- **Stats**: `totalCaptured` = all catches, `uniqueCaptured` = unique species

### 4. Testing

After applying the rules, test by:
1. Login to the app
2. Capture a Pokemon
3. Check Firebase Console → Realtime Database
4. You should see data under `users/<your-uid>/captured` and `users/<your-uid>/inventory`

### 5. Security Features

- Users can only read/write their own data
- Community posts are readable by all, writable by authenticated users
- Leaderboard is public read, users can only update their own entry
- Inventory and captured Pokemon are indexed for fast queries
