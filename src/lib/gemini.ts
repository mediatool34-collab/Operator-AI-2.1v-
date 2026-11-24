/**
 * Frontend-side Gemini AI service.
 * Calls server-side Gemini API endpoint to ensure secure server-side execution.
 */
export async function analyzeWithGemini(prompt: string, isJson: boolean = false): Promise<string> {
  const userId = localStorage.getItem('operator_user_id') || localStorage.getItem('user_id') || 'anonymous';

  const executeOnce = async (): Promise<string> => {
    const response = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ prompt, isJson, stream: true }),
    });

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/x-ndjson') && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalText: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;
            let msg: any;
            try {
              msg = JSON.parse(line);
            } catch {
              continue;
            }
            if (msg.ping) continue;
            if (msg.error) {
              const err: any = new Error(msg.error);
              err.status = msg.status;
              throw err;
            }
            if (msg.done) {
              finalText = msg.text || '';
            }
          }
        }
        if (done) break;
      }

      if (buffer.trim()) {
        try {
          const tail = JSON.parse(buffer.trim());
          if (tail.error) {
            const err: any = new Error(tail.error);
            err.status = tail.status;
            throw err;
          }
          if (tail.done) {
            finalText = tail.text || '';
          }
        } catch (parseErr: any) {
          if (parseErr?.message && !parseErr.message.includes('JSON')) {
            throw parseErr;
          }
        }
      }

      if (finalText !== null) {
        return finalText;
      }
      throw new Error('انقطع الاتصال قبل اكتمال التحليل. يرجى المحاولة مرة أخرى.');
    }

    if (!contentType.includes('application/json')) {
      const rawText = await response.text();
      console.warn(`[Gemini Client] Expected JSON/NDJSON but received non-JSON (status: ${response.status}):`, rawText.slice(0, 100));
      if (response.status === 504 || response.status === 502 || rawText.includes('<!doctype') || rawText.includes('Gateway')) {
        const err: any = new Error('الخادم تحت ضغط مؤقت أو استغرق الرد وقتاً طويلاً. يرجى المحاولة مرة أخرى.');
        err.status = response.status || 504;
        throw err;
      }
      throw new Error(`خطأ في استجابة الخادم (${response.status})`);
    }

    const data = await response.json();

    if (!response.ok) {
      const err: any = new Error(data.error || 'Failed to generate AI response');
      err.status = response.status;
      throw err;
    }

    return data.text || '';
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await executeOnce();
    } catch (error: any) {
      const msg = error?.message || '';
      const isTransient =
        error?.status === 503 ||
        error?.status === 504 ||
        error?.status === 502 ||
        msg.includes('503') ||
        msg.includes('high demand') ||
        msg.includes('ضغط مؤقت');
      if (isTransient && attempt === 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to generate AI response');
}
