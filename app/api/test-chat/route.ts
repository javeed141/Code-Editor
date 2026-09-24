// import { google } from '@ai-sdk/google';
// import { streamText, convertToModelMessages } from 'ai';

// export async function POST(req: Request) {
//   const { messages } = await req.json();

//   const result = streamText({
//     model: google('gemini-2.5-flash'),
//     system: 'You are a helpful assistant.',
//     messages: await convertToModelMessages(messages),
//   });

//   return result.toUIMessageStreamResponse();
// }

import { groq } from '@ai-sdk/groq';
import { convertToModelMessages, streamText } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: groq('openai/gpt-oss-20b'),
    system: 'You are a helpful assistant.',
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}