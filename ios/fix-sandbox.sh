#!/bin/bash
# Find and modify the sandbox profile to allow file operations
SANDBOX_FILE=$(find ~/Library/Developer/Xcode/DerivedData/PokeExplorer-* -name "*.sb" 2>/dev/null | head -1)
if [ -n "$SANDBOX_FILE" ]; then
  echo "Found sandbox file: $SANDBOX_FILE"
  # The sandbox file is regenerated each build, so we can't modify it
  echo "Sandbox restrictions cannot be bypassed without Terminal Full Disk Access"
fi
