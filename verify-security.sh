#!/bin/bash
# Pre-commit verification script
# Run this before pushing to GitHub to ensure no sensitive data is committed

echo "🔍 Checking for sensitive information before commit..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ISSUES_FOUND=0

# Check if .env is ignored
echo "Checking if .env is properly ignored..."
if git check-ignore -q .env 2>/dev/null || [ ! -f .env ]; then
    echo -e "${GREEN}✓${NC} .env is properly ignored or doesn't exist"
else
    echo -e "${RED}✗${NC} .env is NOT ignored!"
    ISSUES_FOUND=$((ISSUES_FOUND+1))
fi

# Check if data/settings.json is ignored
echo "Checking if data/settings.json is properly ignored..."
if git check-ignore -q data/settings.json 2>/dev/null || [ ! -f data/settings.json ]; then
    echo -e "${GREEN}✓${NC} data/settings.json is properly ignored or doesn't exist"
else
    echo -e "${RED}✗${NC} data/settings.json is NOT ignored!"
    ISSUES_FOUND=$((ISSUES_FOUND+1))
fi

# Check for potential API keys in tracked files
echo "Searching for potential API keys in tracked files..."
API_KEY_MATCHES=$(git ls-files | xargs grep -l "sk-[a-zA-Z0-9]\{20,\}" 2>/dev/null | grep -v "\.example" | grep -v "SECURITY_CHECKLIST.md" || true)
if [ -z "$API_KEY_MATCHES" ]; then
    echo -e "${GREEN}✓${NC} No API keys found in tracked files"
else
    echo -e "${RED}✗${NC} Potential API keys found in:"
    echo "$API_KEY_MATCHES"
    ISSUES_FOUND=$((ISSUES_FOUND+1))
fi

# Check for private IP addresses (excluding examples)
echo "Searching for private IP addresses in tracked files..."
PRIVATE_IP_MATCHES=$(git ls-files | xargs grep -lE "(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)" 2>/dev/null | grep -v "\.example" | grep -v "SECURITY_CHECKLIST.md" | grep -v "verify-security.sh" || true)
if [ -z "$PRIVATE_IP_MATCHES" ]; then
    echo -e "${GREEN}✓${NC} No private IP addresses found in tracked files"
else
    echo -e "${YELLOW}⚠${NC} Private IP addresses found in:"
    echo "$PRIVATE_IP_MATCHES"
    echo "   (Review these files to ensure they're examples only)"
fi

# Check for password or secret keywords
echo "Searching for password/secret keywords in tracked files..."
SECRET_MATCHES=$(git ls-files | xargs grep -li "password.*=\|secret.*=.*['\"].*['\"]" 2>/dev/null | grep -v "\.example" | grep -v "SECURITY_CHECKLIST.md" | grep -v "verify-security.sh" || true)
if [ -z "$SECRET_MATCHES" ]; then
    echo -e "${GREEN}✓${NC} No hardcoded passwords/secrets found"
else
    echo -e "${YELLOW}⚠${NC} Potential secrets found in:"
    echo "$SECRET_MATCHES"
    echo "   (Review these files to ensure they're placeholders only)"
fi

# Check if example files exist
echo "Checking for required example files..."
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✓${NC} .env.example exists"
else
    echo -e "${YELLOW}⚠${NC} .env.example not found (recommended)"
fi

if [ -f "data/settings.example.json" ]; then
    echo -e "${GREEN}✓${NC} data/settings.example.json exists"
else
    echo -e "${YELLOW}⚠${NC} data/settings.example.json not found (recommended)"
fi

# Check GitHub Actions workflow
echo "Checking GitHub Actions workflow..."
if [ -f ".github/workflows/docker-publish.yml" ]; then
    echo -e "${GREEN}✓${NC} Docker publish workflow exists"
    # Check if it uses secrets properly
    if grep -q "secrets.GITHUB_TOKEN" .github/workflows/docker-publish.yml; then
        echo -e "${GREEN}✓${NC} Workflow uses GitHub secrets"
    else
        echo -e "${YELLOW}⚠${NC} Workflow may not be using GitHub secrets properly"
    fi
else
    echo -e "${YELLOW}⚠${NC} GitHub Actions workflow not found"
fi

echo ""
echo "======================================"
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ All security checks passed!${NC}"
    echo "You can safely commit and push to GitHub."
    exit 0
else
    echo -e "${RED}✗ Found $ISSUES_FOUND security issue(s)${NC}"
    echo "Please fix the issues before pushing to GitHub."
    exit 1
fi
