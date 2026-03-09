const axios = require('axios');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

/**
 * Claude API'ye streaming olmayan istek gönderir.
 * JSON response parse eder.
 */
const analyzeWithClaude = async (prompt) => {
  const response = await axios.post(
    ANTHROPIC_API_URL,
    {
      model: MODEL,
      max_tokens: 32000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      timeout: 120000,
    }
  );

  const textBlock = response.data.content.find((b) => b.type === 'text');
  if (!textBlock) {
    throw new Error('Claude yanıt vermedi');
  }

  return parseClaudeResponse(textBlock.text);
};

/**
 * Claude API'ye streaming istek gönderir.
 * SSE formatında chunk'ları callback ile iletir.
 */
const streamAnalyzeWithClaude = async (prompt, onChunk, onDone) => {
  let fullText = '';

  try {
    const response = await axios.post(
      ANTHROPIC_API_URL,
      {
        model: MODEL,
        max_tokens: 32000,
        stream: true,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 180000,
        responseType: 'stream',
      }
    );

    return new Promise((resolve, reject) => {
      let buffer = '';
      let done = false;

      response.data.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);

            if (event.type === 'content_block_delta' && event.delta?.text) {
              fullText += event.delta.text;
              onChunk(event.delta.text);
            }

            if (event.type === 'message_stop' && !done) {
              done = true;
              const parsed = parseClaudeResponse(fullText);
              onDone(null, parsed, fullText);
              resolve(parsed);
            }
          } catch {
            // Incomplete JSON fragment, skip
          }
        }
      });

      response.data.on('end', () => {
        if (!done && fullText) {
          done = true;
          try {
            const parsed = parseClaudeResponse(fullText);
            onDone(null, parsed, fullText);
            resolve(parsed);
          } catch (err) {
            onDone(err, null, fullText);
            reject(err);
          }
        }
      });

      response.data.on('error', (err) => {
        if (!done) {
          done = true;
          onDone(err, null, fullText);
          reject(err);
        }
      });
    });
  } catch (error) {
    const msg =
      error.response?.data
        ? typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data)
        : error.message;
    const err = new Error(`Claude API hatası: ${msg}`);
    err.statusCode = 502;
    throw err;
  }
};

/**
 * Claude'un metin yanıtından JSON'u parse eder
 */
const parseClaudeResponse = (text) => {
  // JSON bloğunu bul: ```json ... ``` veya direkt {...}
  let jsonStr = text;

  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  } else {
    // İlk { ile son } arasını al
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      jsonStr = text.substring(start, end + 1);
    }
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.strategies || !Array.isArray(parsed.strategies)) {
      throw new Error('Geçersiz analiz formatı: strategies dizisi bulunamadı');
    }
    return parsed;
  } catch (err) {
    const parseErr = new Error(`Claude yanıtı parse edilemedi: ${err.message}`);
    parseErr.statusCode = 502;
    parseErr.rawResponse = text;
    throw parseErr;
  }
};

module.exports = { analyzeWithClaude, streamAnalyzeWithClaude };
