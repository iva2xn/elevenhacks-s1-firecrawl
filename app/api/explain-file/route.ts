import { NextResponse } from 'next/server';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev';

// Convert GitHub blob URL to raw.githubusercontent.com URL for clean code
function toRawUrl(url: string): string {
  // https://github.com/user/repo/blob/main/path/file.ts
  // -> https://raw.githubusercontent.com/user/repo/main/path/file.ts
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)/);
  if (match) {
    return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}`;
  }
  return url;
}

export async function POST(req: Request) {
  try {
    const { fileUrl } = await req.json();

    if (!fileUrl) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
    }
    if (!FIRECRAWL_API_KEY) {
      return NextResponse.json({ error: 'Firecrawl API Key is missing' }, { status: 500 });
    }

    // Step 1: Fetch the FULL raw code directly from GitHub
    const rawUrl = toRawUrl(fileUrl);
    let rawCode = '';
    try {
      const rawRes = await fetch(rawUrl);
      if (rawRes.ok) {
        rawCode = await rawRes.text();
      }
    } catch (e) {
      console.error('Failed to fetch raw code:', e);
    }

    // Step 2: Use Firecrawl AI extraction for the intelligence layer
    const extractResponse = await fetch(`${FIRECRAWL_BASE_URL}/v1/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
      },
      body: JSON.stringify({
        url: fileUrl,
        formats: ['extract'],
        extract: {
          prompt: "Analyze the source code. Focus on functions, hooks, API calls, state management, and core logic. Be technical.",
          schema: {
            type: "object",
            properties: {
              summary: {
                type: "string",
                description: "Technical 2-sentence summary of what this code file does."
              },
              highlights: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    feature: { type: "string", description: "Name of the logic block or function." },
                    explanation: { type: "string", description: "Technical explanation of how it works." }
                  }
                },
                description: "3-5 key technical features found in the code."
              },
              targetAudienceNotice: {
                type: "string",
                description: "How this code affects the end user experience."
              }
            },
            required: ["summary", "highlights", "targetAudienceNotice"]
          }
        }
      })
    });

    let explanation = null;
    if (extractResponse.ok) {
      const resData = await extractResponse.json();
      explanation = resData.data?.extract;
    }

    return NextResponse.json({
      success: true,
      explanation,
      rawCode,
      fileUrl
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
