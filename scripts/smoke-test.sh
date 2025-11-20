#!/bin/bash
set -e

echo "Building..."
npm run build

echo "Running Smoke Test 1: Code Query"
# We redirect stderr to stdout to capture logs for grepping
# Clear the agent log first
rm -f logs/agent.log
node dist/index.js "Find the definition of 'Agent' in github.com/sourcegraph/amp" > logs/smoke_test_1.log 2>&1

if grep -q "FINAL_ANSWER" logs/smoke_test_1.log; then
    echo "✅ Test 1 Passed (Output contains FINAL_ANSWER)"
else
    echo "❌ Test 1 Failed (Missing FINAL_ANSWER)"
    cat logs/smoke_test_1.log
    exit 1
fi

# Check the agent log file for tool execution
if grep -q "Tool execution started" logs/agent.log; then
    echo "✅ Logging Check Passed (Found tool execution logs in agent.log)"
else
    echo "❌ Logging Check Failed (Missing tool execution logs in agent.log)"
    echo "--- agent.log content ---"
    cat logs/agent.log
    exit 1
fi

echo "Running Smoke Test 2: General Agent Query"
node dist/index.js "What are recent posts about 'agentic workflows'?" > logs/smoke_test_2.log 2>&1

if grep -q "FINAL_ANSWER" logs/smoke_test_2.log; then
    echo "✅ Test 2 Passed (Output contains FINAL_ANSWER)"
else
    echo "❌ Test 2 Failed (Missing FINAL_ANSWER)"
    exit 1
fi

echo "All smoke tests passed!"
