#!/usr/bin/env node

/**
 * Secret Leak Prevention Script
 * 
 * Checks that secrets only appear in src/lib/ directory.
 * Run as part of CI to prevent accidental secret leaks.
 */

const fs = require('fs');
const path = require('path');

const SEARCH_DIR = path.join(__dirname, '..', 'src');
const ALLOWED_DIR = path.join(__dirname, '..', 'src', 'lib');

const SECRET_PATTERNS = [
  /service_role/i,
  /SERVICE_ROLE/i,
  /UPSTASH_REDIS_TOKEN/i,
];

const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

let foundLeaks = [];

function checkFile(filePath) {
  const relativePath = path.relative(SEARCH_DIR, filePath);
  const isAllowedFile = filePath.startsWith(ALLOWED_DIR);
  
  // Skip node_modules and other non-source directories
  if (relativePath.includes('node_modules') || relativePath.includes('.next')) {
    return;
  }
  
  // Only check source files
  const ext = path.extname(filePath);
  if (!FILE_EXTENSIONS.includes(ext)) {
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      SECRET_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          // Skip comments
          if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
            return;
          }
          
          foundLeaks.push({
            file: relativePath,
            line: index + 1,
            content: line.trim(),
            pattern: pattern.source,
            isAllowed: isAllowedFile,
          });
        }
      });
    });
  } catch (err) {
    console.error(`Error reading file: ${filePath}`, err.message);
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and .next
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        walkDir(fullPath);
      }
    } else {
      checkFile(fullPath);
    }
  }
}

// Run the check
console.log('🔍 Checking for secret leaks in src/...\n');

walkDir(SEARCH_DIR);

// Filter to only show leaks outside of src/lib/
const actualLeaks = foundLeaks.filter(leak => !leak.isAllowed);

if (actualLeaks.length > 0) {
  console.error('❌ SECRET LEAK DETECTED!\n');
  console.error('The following files contain secrets outside of src/lib/:\n');
  
  actualLeaks.forEach(leak => {
    console.error(`  ${leak.file}:${leak.line}`);
    console.error(`    Pattern: ${leak.pattern}`);
    console.error(`    Content: ${leak.content}`);
    console.error('');
  });
  
  console.error('Secrets must ONLY appear in src/lib/ directory.');
  console.error('Move secret usage to server-side lib files.\n');
  
  process.exit(1);
}

// Warn about secrets in lib/ (informational only)
const libLeaks = foundLeaks.filter(leak => leak.isAllowed);
if (libLeaks.length > 0) {
  console.log('ℹ️  Secrets found in src/lib/ (expected):');
  libLeaks.forEach(leak => {
    console.log(`  ${leak.file}:${leak.line}`);
  });
  console.log('');
}

console.log('✅ No secret leaks detected outside of src/lib/');
process.exit(0);
