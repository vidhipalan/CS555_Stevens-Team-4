#!/bin/bash

# Test runner script for vpalan4@stevens.edu authentication tests
# This script runs the specific authentication tests for the provided credentials

echo "Running authentication tests for vpalan4@stevens.edu..."
echo "Email: vpalan4@stevens.edu"
echo "Password: vpalan@123"
echo ""

# Change to backend directory
cd "$(dirname "$0")/../backend"

# Run the specific test file
echo "Running vpalan-auth.test.js..."
npm test -- tests/vpalan-auth.test.js

echo ""
echo "Test run completed!"
