# Simple Agent Example

This is a minimal agent configuration example.

## Basic Configuration

```yaml
agents:
  - id: "simple_helper"
    name: "Simple Helper"
    role: "development"
    provider: "claude"
    inline:
      model: "sonnet"
      system_prompt: |
        You are a helpful coding assistant.
        Answer questions clearly and concisely.
```

## Usage

```bash
codecrew q "@simple_helper explain recursion"
```

## Expected Output

The agent will provide a clear explanation of recursion with examples.

## Customization

You can customize the agent by:
1. Adding specific expertise areas to the system prompt
2. Referencing documentation using the document system
3. Specifying different models for different complexity levels
