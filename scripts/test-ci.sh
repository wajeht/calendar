#!/bin/bash
set -e

echo "Running tests in CI mode..."

# Use force-exit flag to ensure clean process termination
node --test --env-file=.env.test --test-force-exit --test-reporter=spec $(find src -name "*.test.js" | sort | tr '\n' ' ')

echo "All tests completed successfully!"