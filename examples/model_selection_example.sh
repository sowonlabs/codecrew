#!/bin/bash

# CodeCrew Model Selection Examples
# This script demonstrates how to use different AI models with CodeCrew agents

echo "================================"
echo "CodeCrew Model Selection Examples"
echo "================================"
echo ""

# Example 1: Using Claude with different models
echo "📝 Example 1: Claude with different models"
echo "---"
codecrew query "@claude:opus What are the key differences between opus and sonnet models?"
echo ""
codecrew query "@claude:sonnet Explain this briefly"
echo ""
codecrew query "@claude:haiku Give me a one-liner summary"
echo ""

# Example 2: Using Gemini with different models
echo "📝 Example 2: Gemini with different models"
echo "---"
codecrew query "@gemini:gemini-2.5-pro Analyze the performance characteristics of this algorithm"
echo ""
codecrew query "@gemini:gemini-2.5-flash Quick analysis of this code"
echo ""

# Example 3: Using Copilot with different models
echo "📝 Example 3: Copilot with different models"
echo "---"
codecrew query "@copilot:gpt-5 Review this code for best practices"
echo ""
codecrew query "@copilot:claude-sonnet-4 What improvements can be made?"
echo ""

# Example 4: Parallel queries with different models
echo "📝 Example 4: Parallel queries with different models"
echo "---"
codecrew query \
  "@claude:opus Provide detailed analysis" \
  "@gemini:gemini-2.5-pro Calculate performance metrics" \
  "@copilot:gpt-5 Suggest refactoring options"
echo ""

# Example 5: Using model selection with context
echo "📝 Example 5: Using models with piped context"
echo "---"
cat README.md | codecrew query "@claude:opus Summarize this document in detail"
echo ""

# Example 6: Default models (no model specified)
echo "📝 Example 6: Using default models"
echo "---"
codecrew query "@claude What is your default model?"
codecrew query "@gemini What is your default model?"
codecrew query "@copilot What is your default model?"
echo ""

echo "================================"
echo "✅ Examples completed"
echo "================================"
