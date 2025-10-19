#!/bin/bash
# Git filter to remove MongoDB Atlas URI from specific commit
# This script will replace the exposed MongoDB URI with a placeholder

echo "🚨 Removing MongoDB Atlas URI from Git history..."
echo "Target commit: edcc82e7613dcdcf7e56146a95e184a20d609ab4"
echo ""

# Create the filter script
cat > /tmp/clean-mongodb-uri.sh << 'EOF'
#!/bin/bash
# Replace MongoDB Atlas URI in .env file
if [ -f .env ]; then
    # Replace any MongoDB Atlas URI that contains the exposed pattern
    sed -i 's|mongodb+srv://mbroadfo:[^@]*@cluster0\.[^/]*\.mongodb\.net/moms_recipe_box_dev[^[:space:]]*|${MONGODB_ATLAS_URI}|g' .env
fi

# Also check other potential files
find . -name "*.md" -o -name "*.txt" -o -name "*.json" | while read file; do
    if [ -f "$file" ]; then
        sed -i 's|mongodb+srv://mbroadfo:[^@]*@cluster0\.[^/]*\.mongodb\.net/moms_recipe_box_dev[^[:space:]]*|${MONGODB_ATLAS_URI}|g' "$file"
    fi
done
EOF

chmod +x /tmp/clean-mongodb-uri.sh

echo "🔄 Running git filter-branch to clean history..."

# Use filter-branch to rewrite history
git filter-branch -f --tree-filter '/tmp/clean-mongodb-uri.sh' HEAD

# Clean up
rm /tmp/clean-mongodb-uri.sh

echo ""
echo "✅ History cleaning complete!"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "1. Verify changes: git log --oneline -5"
echo "2. Check the problematic commit: git show edcc82e7613dcdcf7e56146a95e184a20d609ab4"
echo "3. If satisfied, force push: git push --force-with-lease origin master"
echo "4. Update MongoDB password in Atlas console"
echo "5. Update password in AWS Secrets Manager"
echo ""
echo "🔥 WARNING: This rewrites Git history!"
echo "   All collaborators must re-clone the repository!"