#!/bin/bash

# Script to update Tabs imports to use Tabs2 as Tabs
FILES=$(grep -r "import { Tabs, " --include="*.tsx" --include="*.jsx" src/ | awk -F: '{print $1}' | sort | uniq)

for file in $FILES; do
  echo "Updating $file"
  # Replace the import statement with the updated one
  sed -i '' 's/import { Tabs, \(.*\) } from "@\/components\/ui\/tabs";/import { Tabs2 as Tabs, \1 } from "@\/components\/ui\/tabs";/g' "$file"
done

echo "Done updating files!" 