#!/usr/bin/env python3
"""
Cleanup script to remove duplicate documentation files.
Finds files with numbered suffixes ( 3.md, 4.md, etc.) and removes duplicates.
"""

import os
import re
import filecmp
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path("/Users/sebastian/Desktop/Arbeit/Coinet v1/coinet-platform")
LOG_FILE = PROJECT_ROOT / f"cleanup-log-{datetime.now().strftime('%Y%m%d-%H%M%S')}.txt"

def get_base_filename(filepath):
    """Extract base filename by removing numbered suffix."""
    name = filepath.name
    # Match pattern like " 3.md", " 4.txt", etc.
    pattern = r' (\d+)\.(md|txt|js|sh|yml|ts|html|json|yaml)$'
    match = re.search(pattern, name)
    if match:
        number = match.group(1)
        ext = match.group(2)
        base_name = name.replace(f' {number}.{ext}', f'.{ext}')
        return filepath.parent / base_name
    return None

def find_duplicates():
    """Find all files with numbered suffixes."""
    duplicates = []
    excluded_dirs = {'node_modules', '.git', 'dist', 'build', '__pycache__', '.next'}
    
    for root, dirs, files in os.walk(PROJECT_ROOT):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in excluded_dirs]
        
        for file in files:
            filepath = Path(root) / file
            # Check if file has numbered suffix pattern
            if re.search(r' \d+\.(md|txt|js|sh|yml|ts|html|json|yaml)$', file):
                duplicates.append(filepath)
    
    return duplicates

def main():
    os.chdir(PROJECT_ROOT)
    
    print("🔍 Scanning for duplicate files...")
    duplicates = find_duplicates()
    print(f"📊 Found {len(duplicates)} potential duplicate files\n")
    
    deleted = []
    kept = []
    errors = []
    
    with open(LOG_FILE, 'w') as log:
        log.write(f"Cleanup Log - {datetime.now()}\n")
        log.write("=" * 50 + "\n\n")
        
        for dup_file in sorted(duplicates):
            try:
                base_file = get_base_filename(dup_file)
                
                if base_file and base_file.exists():
                    # Compare files
                    if filecmp.cmp(str(dup_file), str(base_file), shallow=False):
                        print(f"✅ Identical: {dup_file.relative_to(PROJECT_ROOT)}")
                        log.write(f"✅ DELETED (identical): {dup_file.relative_to(PROJECT_ROOT)}\n")
                        log.write(f"   Base file: {base_file.relative_to(PROJECT_ROOT)}\n\n")
                        dup_file.unlink()
                        deleted.append(dup_file)
                    else:
                        print(f"⚠️  Different: {dup_file.relative_to(PROJECT_ROOT)}")
                        log.write(f"⚠️  KEPT (different): {dup_file.relative_to(PROJECT_ROOT)}\n")
                        log.write(f"   Base file: {base_file.relative_to(PROJECT_ROOT)}\n\n")
                        kept.append(dup_file)
                else:
                    print(f"⚠️  Orphaned: {dup_file.relative_to(PROJECT_ROOT)} (no base file)")
                    log.write(f"⚠️  KEPT (orphaned): {dup_file.relative_to(PROJECT_ROOT)}\n")
                    log.write(f"   No base file found\n\n")
                    kept.append(dup_file)
            except Exception as e:
                error_msg = f"❌ Error processing {dup_file.relative_to(PROJECT_ROOT)}: {e}"
                print(error_msg)
                log.write(f"❌ ERROR: {error_msg}\n\n")
                errors.append((dup_file, str(e)))
        
        # Summary
        log.write("=" * 50 + "\n")
        log.write("SUMMARY\n")
        log.write("=" * 50 + "\n")
        log.write(f"Deleted: {len(deleted)} files\n")
        log.write(f"Kept: {len(kept)} files\n")
        log.write(f"Errors: {len(errors)} files\n")
    
    print(f"\n✅ Cleanup complete!")
    print(f"📝 Log saved to: {LOG_FILE.name}")
    print(f"🗑️  Deleted: {len(deleted)} duplicate files")
    print(f"📦 Kept: {len(kept)} files (different or orphaned)")
    if errors:
        print(f"❌ Errors: {len(errors)} files")

if __name__ == "__main__":
    main()

