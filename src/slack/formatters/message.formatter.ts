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

    // Header
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: result.success ? '✅ *Task Completed*' : '❌ *Task Failed*',
      },
    });

    // Divider
    blocks.push({ type: 'divider' });

    // Metadata
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Coordinator:*\n${result.agent}`,
        },
        {
          type: 'mrkdwn',
          text: `*Provider:*\n${result.provider}`,
        },
        {
          type: 'mrkdwn',
          text: `*Task ID:*\n${result.taskId}`,
        },
        {
          type: 'mrkdwn',
          text: `*Status:*\n${result.success ? '✅ Success' : '❌ Failed'}`,
        },
      ],
    });

    // Response/Error
    if (result.success) {
      // Truncate long responses for Slack
      const response = this.truncateForSlack(result.response, 2500);

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Response:*\n${response}`,
        },
      });
    } else {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error:*\n\`\`\`${result.error || 'Unknown error'}\`\`\``,
        },
      });
    }

    // Divider
    blocks.push({ type: 'divider' });

    // Action buttons
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '📄 View Details' },
          action_id: 'view_details',
          value: result.taskId,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '🔄 Run Again' },
          action_id: 'rerun',
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
