---
name: debug-llm-integration
description: Use this skill when there are issues with the LLM integration, including OpenRouter, Ollama, or Anthropic connections, streaming problems, or tool-calling failures.
---

# Skill: Debug LLM Integration Issues

## Common Issues & Solutions

### 1. OpenRouter / OpenAI API Errors

**Symptoms**: 401/403 errors, quota exceeded, model not found.

**Check**:
```bash
# Verify config
cat config.json | grep -E "apiKey|model|baseUrl"
```

**Solutions**:
- Verify API key in `config.json` is valid and not expired
- Check model name matches exactly (e.g., `openai/gpt-4o-mini` not `gpt-4o-mini`)
- Check OpenRouter quota at https://openrouter.ai/usage

### 2. Ollama Connection Issues

**Symptoms**: Connection refused, timeout on local requests.

**Check**:
```bash
# Is Ollama running?
curl http://localhost:11434/api/tags
# List models
ollama list
```

**Solutions**:
- Start Ollama: `ollama serve`
- Pull required model: `ollama pull llama3`
- Check `config.json` for correct Ollama base URL

### 3. Streaming Not Working

**Symptoms**: Response appears all at once, no progressive rendering.

**Check**:
- In `src/gateway/`: Verify `stream: true` is set in LLM call
- In the WebSocket handler: Ensure chunks are emitted immediately
- In the UI: Check WebSocket `onmessage` handler is appending chunks

### 4. Tool Calling Failures

**Symptoms**: LLM doesn't call tools, or calls them with wrong args.

**Debug Steps**:
1. Log the full tool definitions sent to the LLM
2. Check the Zod schema `.describe()` fields are clear
3. Verify the model supports function calling (not all Ollama models do)
4. Check `tool_choice` parameter

### 5. SQLite Errors

**Common**: `SQLITE_CONSTRAINT`, `table already exists`

**Solutions**:
- Check migration scripts are idempotent (`CREATE TABLE IF NOT EXISTS`)
- For locked DB: stop all running processes using the DB
- Backup: `cp assistant.db assistant.db.bak`

## Logging
Enable verbose logging by setting `DEBUG=*` or checking the `.server.log` file.

## Emergency Reset
```bash
# Backup and reset DB (last resort)
cp assistant.db assistant.db.bak
rm assistant.db
pnpm dev  # Will recreate DB
```
