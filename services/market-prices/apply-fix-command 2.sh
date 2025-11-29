#!/bin/bash
# Complete fix command - run this in /workspaces/coinet-platform/services/market-prices

cd /workspaces/coinet-platform/services/market-prices && \
python3 << 'PYTHONFIX'
import re
import sys

file_path = "src/middleware/rateLimiter.ts"

try:
    with open(file_path, 'r') as f:
        content = f.read()
    
    # The replacement code
    replacement = """          // Extract status code - check ProviderError.statusCode first, then nested properties
          // ProviderError has statusCode as a direct property
          const statusCode = 
            error.statusCode ??                    // ProviderError.statusCode (most common)
            error.status ??                        // Some errors use 'status' instead
            error.originalError?.statusCode ??    // Nested ProviderError
            error.originalError?.status ??        // Nested error status
            error.response?.status ??              // Axios error response
            error.originalError?.response?.status ?? // Nested Axios error
            undefined;

          // Debug logging to see what we're getting
          logger.warn(`[DEBUG] Error details for ${source}`, {
            statusCode,
            errorType: error.constructor?.name,
            hasStatusCode: !!error.statusCode,
            hasStatus: !!error.status,
            hasOriginalError: !!error.originalError,
            originalErrorStatusCode: error.originalError?.statusCode,
            originalErrorStatus: error.originalError?.status,
            responseStatus: error.response?.status,
            originalResponseStatus: error.originalError?.response?.status,
            errorKeys: Object.keys(error),
            fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
          });

          // Don't retry client errors (4xx except 429) - these are permanent failures
          const isClientError = typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500 && statusCode !== 429;
          
          if (isClientError) {
            logger.warn(`Not retrying ${source} - client error ${statusCode} is not retryable`, {
              error: error.message,
              statusCode,
              errorType: error.constructor?.name,
            });
            throw error; // Don't retry, throw immediately
          }"""

    # Pattern to match the old code (flexible matching)
    # Match from "Extract status code" comment to "throw error; // Don't retry"
    pattern = r'          // Extract status code.*?throw error; // Don\'t retry, throw immediately'
    
    if re.search(pattern, content, re.DOTALL):
        # Backup first
        import shutil
        shutil.copy(file_path, f"{file_path}.backup")
        print("✅ Backup created")
        
        # Replace
        new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        
        with open(file_path, 'w') as f:
            f.write(new_content)
        
        print("✅ Fix applied successfully!")
        
        # Verify
        if "[DEBUG] Error details" in new_content:
            print("✅ Debug logging verified")
        else:
            print("⚠️  Warning: Debug logging not found after replacement")
    else:
        print("❌ Pattern not found. Showing current code around line 90-124:")
        lines = content.split('\n')
        for i in range(89, min(125, len(lines))):
            print(f"{i+1:4d}: {lines[i]}")
        sys.exit(1)
        
except FileNotFoundError:
    print(f"❌ File not found: {file_path}")
    print("Make sure you're in /workspaces/coinet-platform/services/market-prices")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
PYTHONFIX

