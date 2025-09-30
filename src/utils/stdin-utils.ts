/**
 * Utility for reading stdin input in CLI handlers
 */

/**
 * Read content from stdin if available (for pipe operations)
 * @returns Promise<string | null> - Returns piped content or null if no pipe
 */
export async function readStdin(): Promise<string | null> {
  // Check if stdin is from a pipe (not a TTY)
  if (process.stdin.isTTY) {
    return null;
  }

  return new Promise((resolve, reject) => {
    let data = '';
    
    // Set encoding to handle text properly
    process.stdin.setEncoding('utf8');
    
    // Read data chunks
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    
    // Handle end of input
    process.stdin.on('end', () => {
      resolve(data.trim() || null);
    });
    
    // Handle errors
    process.stdin.on('error', (error) => {
      reject(error);
    });
    
    // Set a timeout to prevent hanging
    const timeout = setTimeout(() => {
      reject(new Error('Stdin read timeout'));
    }, 5000);
    
    // Clear timeout when done
    process.stdin.on('end', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Format piped content as context for agents
 * @param pipedContent - Content received from stdin
 * @returns Formatted context string
 */
export function formatPipedContext(pipedContent: string): string {
  return `Previous step result:\n${pipedContent}\n\nPlease use this information as context for the current task.`;
}