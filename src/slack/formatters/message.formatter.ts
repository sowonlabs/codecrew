import { Block, KnownBlock } from '@slack/web-api';

export interface ExecutionResult {
  agent: string;
  provider: string;
  taskId: string;
  response: string;
  success: boolean;
  error?: string;
}

export class SlackMessageFormatter {
  // Slack limits: 3000 chars per text block, 50 blocks max, 40000 chars total
  // Default to ~100K tokens (approximately 400K characters for code-heavy content)
  // Can be overridden with SLACK_MAX_RESPONSE_LENGTH env var
  private readonly maxResponseLength: number;
  private readonly maxBlockLength = 2900; // Per block limit with safety margin

  constructor() {
    // Default: 400000 chars (~100K tokens for code)
    // Set lower if you experience issues (e.g., 40000 for Slack message limit)
    this.maxResponseLength = parseInt(
      process.env.SLACK_MAX_RESPONSE_LENGTH || '400000',
      10
    );
  }

  /**
   * Format execution result into Slack blocks
   */
  formatExecutionResult(result: ExecutionResult): (Block | KnownBlock)[] {
    const blocks: (Block | KnownBlock)[] = [];

    if (result.success) {
      // Success: Show only the response content (clean!)
      const response = this.truncateForSlack(result.response, this.maxResponseLength);

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: response,
        },
      });
    } else {
      // Error: Show error message with metadata
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `❌ *Error*\n\`\`\`${result.error || 'Unknown error'}\`\`\``,
        },
      });

      // Add metadata context only on error
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Agent: *${result.agent}* (${result.provider}) · Task ID: \`${result.taskId}\``,
          },
        ],
      });
    }

    return blocks;
  }

  /**
   * Truncate text to fit Slack's limits
   */
  private truncateForSlack(text: string, maxLength: number): string {
    if (!text) return '';

    if (text.length <= maxLength) {
      return text;
    }

    // Try to break at a sensible point (newline or sentence)
    const searchStart = Math.max(0, maxLength - 500);
    let breakPoint = maxLength;

    const lastNewline = text.lastIndexOf('\n', maxLength);
    if (lastNewline > searchStart) {
      breakPoint = lastNewline;
    } else {
      const lastPeriod = text.lastIndexOf('. ', maxLength);
      if (lastPeriod > searchStart) {
        breakPoint = lastPeriod + 1;
      }
    }

    const truncatedText = text.substring(0, breakPoint);
    const estimatedTokens = Math.floor(text.length / 4); // Rough estimate

    return truncatedText + `\n\n_[Response truncated: ~${estimatedTokens.toLocaleString()} tokens. Adjust SLACK_MAX_RESPONSE_LENGTH env var if needed]_`;
  }

  /**
   * Format error message
   */
  formatError(error: string): (Block | KnownBlock)[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `❌ *Error*\n\`\`\`${error}\`\`\``,
        },
      },
    ];
  }

  /**
   * Format simple message
   */
  formatMessage(message: string, emoji?: string): (Block | KnownBlock)[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji || '💬'} ${message}`,
        },
      },
    ];
  }
}
