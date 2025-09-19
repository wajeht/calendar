#!/bin/bash
set -e

echo "Running tests in CI mode..."

# Run each test file individually to avoid any inter-process communication issues
test_files=$(find src -name "*.test.js" | sort)
total_tests=0
passed_tests=0

for file in $test_files; do
    echo "Testing: $file"
    if node --test --env-file=.env.test --test-reporter=dot "$file"; then
        echo "✓ $file passed"
        ((passed_tests++))
    else
        echo "✗ $file failed"
        exit 1
    fi
    ((total_tests++))
done

echo "All tests completed successfully! ($passed_tests/$total_tests passed)"