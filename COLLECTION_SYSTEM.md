# Pokemon Collection System

## Overview

The app now supports capturing the same Pokemon multiple times. Each species tracks:
- **Count**: Total number of times caught
- **History**: Every individual capture with CP, level, location, biome
- **Best Stats**: Highest CP and level across all captures

## Data Structure

### Firebase Collection Entry
```json
{
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
        "abc123": {
          "capturedAt": "2024-01-15T10:30:00.000Z",
          "location": { "latitude": 37.7749, "longitude": -122.4194 },
          "biome": "urban",
          "cp": 450,
          "level": 15
        },
        "def456": {
          "capturedAt": "2024-01-20T15:45:00.000Z",
          "biome": "grass",
          "cp": 850,
          "level": 28
        }
      }
    }
  }
}
```

## How It Works

### First Capture
1. User catches Pikachu for the first time
2. Creates entry: `collection/25` with count = 1
3. Adds capture to history
4. Updates stats: `totalCaptured++`, `uniqueCaptured++`

### Duplicate Capture
1. User catches Pikachu again
2. Updates: `count++`, `lastCapturedAt`, `highestCp`, `highestLevel`
3. Adds new capture to history
4. Updates stats: `totalCaptured++` (uniqueCaptured stays same)

## Stats Tracking

- **totalCaptured**: Total number of all Pokemon caught (150)
- **uniqueCaptured**: Number of unique species (42)

Example: Caught 5 Pikachu + 3 Charizard = 8 total, 2 unique

## Benefits

✅ Collect multiple of the same Pokemon  
✅ Track your best CP/level for each species  
✅ View complete capture history  
✅ See when and where you caught each one  
✅ No more "already caught" blocking
