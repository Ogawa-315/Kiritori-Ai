export const callOpenAI = async (apiKey: string, modelId: string, prompt: string, imageBase64: string) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ]
        }
      ],
      max_tokens: 1000,
    }),
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
};

// Anthropic API呼び出し
export const callAnthropic = async (apiKey: string, modelId: string, prompt: string, imageBase64: string) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } }
          ]
        }
      ],
    }),
  });
  
  const data = await response.json();
  return data.content[0].text;
};

// Google API呼び出し
export const callGoogle = async (apiKey: string, modelId: string, prompt: string, imageBase64: string) => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
          ]
        }
      ],
    }),
  });
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
};