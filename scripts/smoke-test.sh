#!/bin/bash
set -e

echo "Building..."
npm run build

echo "Running Smoke Test 1: Code Query"
node dist/index.js "Find the definition of 'Agent' in github.com/sourcegraph/amp" > logs/smoke_test_1.log
if grep -q "FINAL_ANSWER" logs/smoke_test_1.log; then
    echo "✅ Test 1 Passed (Output contains FINAL_ANSWER)"
else
    echo "❌ Test 1 Failed (Missing FINAL_ANSWER)"
    exit 1
fi

echo "Running Smoke Test 2: General Agent Query"
node dist/index.js "What are recent posts about 'agentic workflows'?" > logs/smoke_test_2.log
if grep -q "FINAL_ANSWER" logs/smoke_test_2.log; then
    echo "✅ Test 2 Passed (Output contains FINAL_ANSWER)"
else
    echo "❌ Test 2 Failed (Missing FINAL_ANSWER)"
    exit 1
fi

echo "All smoke tests passed!"
