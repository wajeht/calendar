#!/bin/bash
set -e

echo "Running tests in CI mode..."

# Run all tests with concurrency disabled to avoid serialization issues
node --test --env-file=.env.test --test-concurrency=1 $(find src -name "*.test.js" | sort | tr '\n' ' ')

echo "All tests completed successfully!"