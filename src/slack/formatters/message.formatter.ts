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
  /**
   * Format execution result into Slack blocks
   */
  formatExecutionResult(result: ExecutionResult): (Block | KnownBlock)[] {
    const blocks: (Block | KnownBlock)[] = [];

    // Response/Error (Main content first!)
    if (result.success) {
      // Truncate long responses for Slack
      const response = this.truncateForSlack(result.response, 2500);

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: response,
        },
      });
    } else {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `❌ *Error*\n\`\`\`${result.error || 'Unknown error'}\`\`\``,
        },
      });
    }

    // Context (compact metadata at the bottom)
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `${result.success ? '✅' : '❌'} *${result.agent}* (${result.provider}) · \`${result.taskId}\``,
        },
      ],
    });

    return blocks;
  }

  /**
   * Truncate text to fit Slack's limits
   */
  private truncateForSlack(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength) + '\n\n_[Response truncated - use "View Details" for full output]_';
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
