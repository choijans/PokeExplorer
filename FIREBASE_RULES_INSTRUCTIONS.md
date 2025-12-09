# Firebase Rules Update Instructions

## Step-by-Step Guide

### 1. Access Firebase Console
1. Go to: https://console.firebase.google.com
2. Select project: **pokeexplorer-8b5dc**
3. Click on **Realtime Database** in left sidebar
4. Click on **Rules** tab

### 2. Copy New Rules
Copy the entire content below:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        "collection": {
          "$pokemonId": {
            ".indexOn": ["count", "lastCapturedAt"],
            "captures": {
              ".indexOn": ["capturedAt"]
            }
          }
        },
        "inventory": {
          ".validate": "newData.hasChildren(['pokeball', 'greatball', 'ultraball', 'razz'])"
        },
        "stats": {
          ".validate": "newData.hasChildren(['totalCaptured', 'uniqueCaptured'])"
        },
        "catchHistory": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid",
          ".indexOn": ["timestamp", "result", "rarity"],
          "$entryId": {
            ".validate": "newData.hasChildren(['pokemonId', 'pokemonName', 'timestamp', 'result', 'biome', 'rarity'])"
          }
        }
      }
    },
    "community": {
      "posts": {
        ".read": true,
        ".write": "auth != null",
        "$postId": {
          ".read": true,
          ".write": "auth != null"
        }
      },
      "leaderboard": {
        ".read": true,
        "$uid": {
          ".write": "$uid === auth.uid"
        }
      }
    }
  }
}
```

### 3. Paste and Publish
1. Select all existing rules in the editor
2. Delete them
3. Paste the new rules above
4. Click **Publish** button
5. Confirm the changes

### 4. Verify Rules
After publishing, you should see:
- ✅ Rules published successfully
- ✅ No syntax errors
- ✅ Security rules active

## What Changed?

### Added: catchHistory Node
```json
"catchHistory": {
  ".read": "$uid === auth.uid",
  ".write": "$uid === auth.uid",
  ".indexOn": ["timestamp", "result", "rarity"],
  "$entryId": {
    ".validate": "newData.hasChildren(['pokemonId', 'pokemonName', 'timestamp', 'result', 'biome', 'rarity'])"
  }
}
```

**Features:**
- ✅ User can only read/write their own catch history
- ✅ Indexed on timestamp, result, and rarity for fast queries
- ✅ Validates required fields on write
- ✅ Supports real-time subscriptions

### Existing Rules (Unchanged)
- ✅ Collection rules
- ✅ Inventory rules
- ✅ Stats rules
- ✅ Community posts
- ✅ Leaderboard

## Testing After Update

### Test 1: Catch History Write
```typescript
// Should succeed for authenticated user
await firebaseCatchHistoryService.addEntry(userId, {
  pokemonId: 25,
  pokemonName: 'pikachu',
  timestamp: Date.now(),
  result: 'caught',
  biome: 'grass',
  rarity: 'uncommon',
  ballUsed: 'pokeball',
  xpGained: 100,
  candyGained: 3
});
```

### Test 2: Catch History Read
```typescript
// Should succeed for authenticated user
const unsubscribe = firebaseCatchHistoryService.subscribeToHistory(userId, (history) => {
  console.log('Catch history:', history);
});
```

### Test 3: Real-time Updates
1. Open app on Device A
2. Catch a Pokemon
3. Open app on Device B (same user)
4. Verify catch appears in history instantly

## Troubleshooting

### Error: "Permission Denied"
- ✅ Verify user is authenticated
- ✅ Check userId matches auth.uid
- ✅ Confirm rules are published

### Error: "Index not defined"
- ✅ Verify `.indexOn` arrays are present
- ✅ Wait 1-2 minutes for indexes to build
- ✅ Refresh Firebase Console

### Error: "Validation failed"
- ✅ Check all required fields are present
- ✅ Verify field names match exactly
- ✅ Ensure data types are correct

## Database Structure Preview

After catching Pokemon, your database will look like:

```
users/
  {userId}/
    catchHistory/
      -NxAbCdEfGh: {
        pokemonId: 25
        pokemonName: "pikachu"
        timestamp: 1234567890
        result: "caught"
        biome: "grass"
        rarity: "uncommon"
        ballUsed: "pokeball"
        xpGained: 100
        candyGained: 3
      }
      -NxAbCdEfGi: {
        ...
      }
```

## Performance Notes

- Queries limited to last 100 entries
- Indexes optimize read performance
- Real-time listeners auto-cleanup on unmount
- Offline data cached locally

## Support

If you encounter issues:
1. Check Firebase Console for error messages
2. Verify authentication is working
3. Check browser console for detailed errors
4. Ensure database URL is correct
