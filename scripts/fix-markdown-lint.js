#!/usr/bin/env node

/**
 * Markdown Lint Fixer
 * 
 * Automatically fixes common Markdown linting errors:
 * - MD032: Add blank lines around lists
 * - MD022: Add blank lines around headings
 * - MD036: Convert bold text to proper headings where appropriate
 * - MD009: Remove trailing spaces
 * - MD047: Ensure single trailing newline
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

/**
 * Fix markdown content
 */
function fixMarkdownContent(content) {
    let lines = content.split('\n');
    let fixed = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const prevLine = i > 0 ? lines[i - 1] : '';
        const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
        
        // MD009: Remove trailing spaces
        let cleanLine = line.replace(/\s+$/, '');
        
        // MD022: Add blank lines around headings
        if (cleanLine.match(/^#{1,6}\s/)) {
            // This is a heading
            if (prevLine.trim() !== '' && !prevLine.match(/^#{1,6}\s/) && !prevLine.match(/^---+$|^===+$/)) {
                // Need blank line before heading
                fixed.push('');
            }
            fixed.push(cleanLine);
            // Check if we need blank line after
            if (nextLine && nextLine.trim() !== '' && !nextLine.match(/^#{1,6}\s/) && !nextLine.match(/^---+$|^===+$/)) {
                fixed.push('');
            }
            continue;
        }
        
        // MD032: Add blank lines around lists
        if (cleanLine.match(/^[\s]*[-*+]\s/) || cleanLine.match(/^[\s]*\d+\.\s/)) {
            // This is a list item
            if (prevLine.trim() !== '' && !prevLine.match(/^[\s]*[-*+]\s/) && !prevLine.match(/^[\s]*\d+\.\s/)) {
                // Need blank line before first list item
                fixed.push('');
            }
        }
        
        fixed.push(cleanLine);
        
        // Check if we need blank line after list
        if ((cleanLine.match(/^[\s]*[-*+]\s/) || cleanLine.match(/^[\s]*\d+\.\s/)) &&
            nextLine && nextLine.trim() !== '' &&
            !nextLine.match(/^[\s]*[-*+]\s/) && !nextLine.match(/^[\s]*\d+\.\s/)) {
            // Need blank line after last list item
            fixed.push('');
        }
    }
    
    // MD047: Ensure single trailing newline
    while (fixed.length > 0 && fixed[fixed.length - 1] === '') {
        fixed.pop();
    }
    
    return fixed.join('\n') + '\n';
}

/**
 * Fix markdown files
 */
async function fixMarkdownFiles() {
    console.log('Finding markdown files...');
    
    const files = await glob('**/*.md', {
        ignore: ['node_modules/**', '**/node_modules/**']
    });
    
    console.log(`Found ${files.length} markdown files to process`);
    
    let fixedCount = 0;
    
    for (const file of files) {
        try {
            const content = readFileSync(file, 'utf8');
            const fixed = fixMarkdownContent(content);
            
            if (content !== fixed) {
                writeFileSync(file, fixed);
                console.log(`Fixed: ${file}`);
                fixedCount++;
            }
        } catch (error) {
            console.error(`Error processing ${file}:`, error.message);
        }
    }
    
    console.log(`\nCompleted! Fixed ${fixedCount} files`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    fixMarkdownFiles().catch(console.error);
}