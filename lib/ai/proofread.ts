import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { MAX_RETRIES, SYSTEM_PROMPT } from './constants';
import { issueSchema, ProofreadResult } from './schema';
import { filterValidIssues } from './utils';

async function callModel(text: string) {
  return generateText({
    model: openai('gpt-5.6-luna'),
    system: SYSTEM_PROMPT,
    prompt: text,
    output: Output.object({ schema: issueSchema }),
    providerOptions: {
      openai: {
        reasoningEffort: "none",
      },
    },
  });
}

export async function proofread(text: string): Promise<ProofreadResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await callModel(text);
      if (!result.output) {
        throw new Error('Model returned no structured output');
      }
      return {
        issues: filterValidIssues(result.output.issues, text),
      };
    } catch (err) {
      lastError = err;
    }
  }

  console.error('Proofread check failed after retry:', lastError);
  throw new Error('Proofread check failed');
}