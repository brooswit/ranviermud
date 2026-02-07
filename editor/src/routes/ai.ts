import { Hono } from 'hono';
import { checksum, get, set } from '../lib/summaryCache';

const ai = new Hono();

ai.post('/summarize', async (c) => {
  try {
    const { code } = await c.req.json();
    if (!code) {
      return c.json({ error: 'Code is required' }, 400);
    }

    const key = checksum(code);
    const cached = get(key);
    if (cached != null) {
      return c.json({ summary: cached });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return c.json({ error: 'OpenRouter API key not configured. Set OPENROUTER_API_KEY environment variable.' }, 500);
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Ranvier MUD Editor'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: 'You are analyzing RanvierMUD game code. This IS game code for a MUD (Multi-User Dungeon) game engine. Do not use hedging language like "appears to be" or "seems to be" - state facts directly. Provide a concise, technical summary focusing on what the code does and how it works. Focus on the specific functionality, mechanics, and purpose of this particular module. Start directly with what the code does, not with context about it being game code.'
          },
          {
            role: 'user',
            content: `This is RanvierMUD game code. Summarize what this code module does:\n\n\`\`\`javascript\n${code}\n\`\`\``
          }
        ],
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return c.json({ error: `OpenRouter API error: ${errorText}` }, 500);
    }
    
    const data = await response.json() as any;
    const summary = data.choices?.[0]?.message?.content || 'Unable to generate summary';
    set(key, summary);

    return c.json({ summary });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

ai.post('/modify', async (c) => {
  try {
    const { code, prompt } = await c.req.json();
    if (!code || !prompt) {
      return c.json({ error: 'Code and prompt are required' }, 400);
    }
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return c.json({ error: 'OpenRouter API key not configured. Set OPENROUTER_API_KEY environment variable.' }, 500);
    }
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Ranvier MUD Editor'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful code assistant. Modify the provided JavaScript code according to the user\'s request. Return ONLY the modified code, without explanations or markdown formatting. Preserve the code structure and style.'
          },
          {
            role: 'user',
            content: `Here is the current code:\n\n\`\`\`javascript\n${code}\n\`\`\`\n\nPlease modify it according to this request: ${prompt}\n\nReturn only the modified JavaScript code, no explanations.`
          }
        ],
        max_tokens: 4000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return c.json({ error: `OpenRouter API error: ${errorText}` }, 500);
    }
    
    const data = await response.json() as any;
    let modifiedCode = data.choices?.[0]?.message?.content || '';
    
    // Clean up the response - remove markdown code blocks if present
    modifiedCode = modifiedCode.replace(/^```(?:javascript|js)?\n?/gm, '').replace(/\n?```$/gm, '').trim();
    
    return c.json({ code: modifiedCode });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

ai.post('/modify-config', async (c) => {
  try {
    const { config, resourceType, prompt } = await c.req.json();
    if (config === undefined || !prompt) {
      return c.json({ error: 'Config and prompt are required' }, 400);
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return c.json({ error: 'OpenRouter API key not configured. Set OPENROUTER_API_KEY environment variable.' }, 500);
    }

    const configStr = typeof config === 'string' ? config : JSON.stringify(config, null, 2);
    const resourceLabel = resourceType ? ` (${resourceType} resource)` : '';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Ranvier MUD Editor'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant editing RanvierMUD resource config${resourceLabel}. The user will provide a JSON object (resource configuration). Modify it according to their request. Return ONLY the modified JSON object, no explanations, no markdown code fences. Preserve all existing keys unless the user asks to remove them. Output must be valid JSON.`
          },
          {
            role: 'user',
            content: `Current config:\n\n${configStr}\n\nRequest: ${prompt}\n\nReturn only the modified JSON object.`
          }
        ],
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return c.json({ error: `OpenRouter API error: ${errorText}` }, 500);
    }

    const data = await response.json() as any;
    let raw = data.choices?.[0]?.message?.content || '';

    // Strip markdown code block if present
    raw = raw.replace(/^```(?:json)?\n?/gm, '').replace(/\n?```$/gm, '').trim();

    let modified: unknown;
    try {
      modified = JSON.parse(raw);
    } catch {
      return c.json({ error: 'AI response was not valid JSON. Try rephrasing your request.' }, 500);
    }

    return c.json({ config: modified });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

export default ai;
