#!/bin/bash
set -e

echo "Running tests in CI mode..."

for file in $(find src -name "*.test.js" | sort); do
    echo "Testing: $file"
    NODE_ENV=test node --test --env-file=.env.test "$file"
done

echo "All tests completed successfully!"