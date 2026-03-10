#!/bin/bash

echo "🔧 Fixing TypeScript errors for SINGGLEBEE API Integration..."

# Install missing dependencies
echo "📦 Installing dependencies..."
npm install @tanstack/react-query axios react-toastify

# Clear TypeScript cache
echo "🧹 Clearing TypeScript cache..."
npx tsc --build --clean 2>/dev/null || true

# Restart development server
echo "🚀 Ready to start development!"
echo "Run: npm run dev"

echo "✅ All TypeScript errors should now be fixed!"
