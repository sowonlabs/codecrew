# JSON Interception System Deprecation Notice

## Date: 2025-10-02

## Decision: Replace JSON Interception with MCP Bridge

### What Was Removed:
1. **buildPromptWithTools()** - Added `codecrew:` tool descriptions to prompts
2. **parseToolUse()** - Parsed AI responses for JSON tool calls
3. **JSON Interception Pattern** - Prompt engineering to force AI to output tool use JSON

### Why:
1. **Model-Dependent Behavior**:
   - Claude Haiku: Works well, autonomously uses tools
   - Claude Sonnet: Selective, sometimes redirects instead
   - Gemini: Requires explicit instruction, never auto-uses tools
   
2. **Conflict with MCP Bridge**:
   - JSON interception prompts interfere with native MCP tools
   - Gemini showed only `codecrew:help` and `codecrew:read_file` in prompts
   - Real MCP tools (`listAgents`, etc.) were hidden from AI

3. **Fragility**:
   - Relies on prompt engineering tricks
   - No guarantee AI will output correct JSON format
   - Each model requires different prompt tuning

### What Replaced It:
**MCP Bridge** - Standard Model Context Protocol integration:
- Claude: `--mcp-config=.mcp.json --dangerously-skip-permissions`
- Gemini: `--allowed-mcp-server-names=codecrew --yolo`
- Tools become **native** to AI CLI, not just text descriptions

### Benefits of MCP Bridge:
1. ✅ **Standard Protocol**: Industry-standard, well-documented
2. ✅ **Consistent Behavior**: AI treats MCP tools as first-class citizens
3. ✅ **No Prompt Engineering**: Tools just work, no tricks needed
4. ✅ **Future-Proof**: Supported by major AI providers

### Migration Guide:
Replace agent options from:
```yaml
options:
  query:
    - "--some-option"
```

To:
```yaml
options:
  query:
    - "--mcp-config=.mcp.json"  # Claude
    - "--dangerously-skip-permissions"
    # OR
    - "--allowed-mcp-server-names=codecrew"  # Gemini
    - "--yolo"
```

### References:
- See `MCP_BRIDGE_PLAN.md` for architecture details
- See `TOOL_CALL_IMPLEMENTATION.md` for historical JSON interception approach
- Test results in git history: commits e4cfd19 (Claude) and bd648c8 (Gemini)

### Conclusion:
MCP Bridge is the correct architectural approach. JSON interception was an interesting experiment but ultimately too fragile for production use.
