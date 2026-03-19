#!/usr/bin/env bun
/**
 * Skill Router CLI Test Tool
 *
 * Usage:
 *   bun run test-cli.ts "your message here"
 *   bun run test-cli.ts "your message here" --debug
 *   bun run test-cli.ts "your message here" --multi
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { routeWithOutput, getContext, routeAll } from './index';
import type { MatcherRegistry } from './types';

function loadMatchers(): MatcherRegistry['matchers'] {
  const matchersPath = resolve(__dirname, 'matchers.json');
  try {
    const content = readFileSync(matchersPath, 'utf-8');
    const registry: MatcherRegistry = JSON.parse(content);
    return registry.matchers;
  } catch (error) {
    console.error('Error loading matchers.json:', error);
    console.log('\nCreating sample matchers.json...');

    // Create sample matchers if file doesn't exist
    const sampleMatchers = {
      matchers: [
        {
          skill: 'brainstorming',
          priority: 1,
          triggers: {
            keywords: ['brainstorm', 'idea', 'worth building', 'should i'],
            phase: ['think']
          },
          explanation: 'Brainstorm ideas with structured thinking'
        },
        {
          skill: 'writing-plans',
          priority: 2,
          triggers: {
            keywords: ['plan', 'implement', 'approach'],
            phase: ['plan']
          },
          explanation: 'Create step-by-step implementation plan'
        },
        {
          skill: 'sa:comprehensive-code-review',
          priority: 3,
          triggers: {
            keywords: ['review', 'check code', 'audit'],
            phase: ['review'],
            gitStatus: ['dirty'],
            uncommittedFiles: { min: 3 }
          },
          explanation: 'Run comprehensive code review with Reality Check'
        }
      ]
    };

    // For test purposes, return sample matchers
    return sampleMatchers.matchers;
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Skill Router CLI Test Tool

Usage:
  bun run test-cli.ts "your message here"
  bun run test-cli.ts "your message here" --debug
  bun run test-cli.ts "your message here" --multi
  bun run test-cli.ts --context "your message here"

Options:
  --debug     Show context information
  --multi     Show multiple suggestions
  --context   Show only context (no routing)
  --help      Show this help message

Examples:
  bun run test-cli.ts "I need to brainstorm this feature"
  bun run test-cli.ts "All tests pass, ready to merge" --debug
  bun run test-cli.ts "The test is failing" --multi
    `);
    process.exit(0);
  }

  const message = args.find(arg => !arg.startsWith('--')) || '';
  const debug = args.includes('--debug');
  const multi = args.includes('--multi');
  const contextOnly = args.includes('--context');

  if (!message) {
    console.error('Error: Please provide a message');
    process.exit(1);
  }

  const matchers = loadMatchers();
  console.log(`Loaded ${matchers.length} skill matchers\n`);

  // Context only mode
  if (contextOnly) {
    const ctx = getContext(message);
    console.log('Context Analysis:');
    console.log(JSON.stringify(ctx, null, 2));
    return;
  }

  // Route and display suggestion
  const output = routeWithOutput(message, matchers, {
    debugContext: debug,
    multiSuggestion: multi,
    includeContext: debug,
  });

  console.log(output);

  // Show all matches if debug mode
  if (debug) {
    console.log('\n--- All Matches ---');
    const allMatches = routeAll(message, matchers);
    if (allMatches.length === 0) {
      console.log('No matches found');
    } else {
      allMatches.forEach((match, i) => {
        console.log(`\n${i + 1}. ${match.skill} (score: ${match.score}, priority: ${match.priority})`);
        console.log(`   ${match.explanation}`);
        console.log(`   Matched: ${match.matchedTriggers.join(', ')}`);
      });
    }
  }
}

main();
