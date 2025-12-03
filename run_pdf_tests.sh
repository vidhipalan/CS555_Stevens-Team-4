#!/bin/bash

# Script to run PDF sharing feature tests only

echo "=========================================="
echo "PDF Sharing Feature - Test Execution"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "app/utils" ]; then
    echo -e "${RED}Error: app/utils directory not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Check if Jest is configured
if ! command -v jest &> /dev/null; then
    echo -e "${YELLOW}Jest not found globally. Checking package.json...${NC}"
    if [ ! -f "package.json" ]; then
        echo -e "${RED}Error: package.json not found${NC}"
        exit 1
    fi
fi

echo "Running PDF Generator Tests..."
echo ""

# Create test results directory
mkdir -p test-results

# Run tests
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    # Use npm test if available
    npm test -- pdfGenerator.test.ts 2>&1 | tee test-results/pdf-tests-output.txt
    TEST_EXIT_CODE=${PIPESTATUS[0]}
elif command -v jest &> /dev/null; then
    # Use global jest
    jest app/utils/__tests__/pdfGenerator.test.ts 2>&1 | tee test-results/pdf-tests-output.txt
    TEST_EXIT_CODE=${PIPESTATUS[0]}
else
    echo -e "${RED}Error: Jest not found. Please install Jest:${NC}"
    echo "  npm install --save-dev jest @types/jest"
    exit 1
fi

echo ""
echo "=========================================="
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}All PDF tests passed!${NC}"
else
    echo -e "${RED}Some PDF tests failed. Check the output above.${NC}"
fi
echo "=========================================="
echo ""
echo "Test results saved to: test-results/pdf-tests-output.txt"

# Generate summary
SUMMARY_FILE="test-results/pdf-tests-summary.txt"
echo "PDF Sharing Feature - Test Execution Summary" > "$SUMMARY_FILE"
echo "Date: $(date)" >> "$SUMMARY_FILE"
echo "Exit Code: $TEST_EXIT_CODE" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"
echo "Full output: test-results/pdf-tests-output.txt" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"
echo "Test File: app/utils/__tests__/pdfGenerator.test.ts" >> "$SUMMARY_FILE"

echo "Summary saved to: $SUMMARY_FILE"
echo ""
echo "Next Steps:"
echo "1. Review test results in test-results/pdf-tests-output.txt"
echo "2. Take screenshots of the PDF sharing feature in the app"
echo "3. Include test results and screenshots in submission"

exit $TEST_EXIT_CODE

