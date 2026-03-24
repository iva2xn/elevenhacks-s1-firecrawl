import { NextResponse } from 'next/server';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev';

export async function POST(req: Request) {
  try {
    const { repoUrl } = await req.json();

    if (!repoUrl) {
      return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
    }

    if (!FIRECRAWL_API_KEY) {
      return NextResponse.json({ error: 'Firecrawl API Key is missing in environment variables' }, { status: 500 });
    }

    // Step 1: Use AI-Powered Extraction to get the file and folder tree
    const extractResponse = await fetch(`${FIRECRAWL_BASE_URL}/v1/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
      },
      body: JSON.stringify({
        url: repoUrl,
        formats: ['markdown', 'extract'],
        extract: {
          schema: {
            type: "object",
            properties: {
              files: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "The name of the file or folder" },
                    url: { type: "string", description: "The full GitHub URL for this item" },
                    type: { type: "string", enum: ["file", "folder"] }
                  },
                  required: ["name", "url", "type"]
                }
              }
            },
            required: ["files"]
          }
        }
      })
    });

    if (!extractResponse.ok) {
      const errorData = await extractResponse.text();
      return NextResponse.json({ error: `Firecrawl Extraction Failed: ${errorData}` }, { status: extractResponse.status });
    }

    const resData = await extractResponse.json();
    const rootExtraction = resData.data?.extract || { files: [] };
    let allDiscoveredFiles = [...rootExtraction.files];

    // Step 2: Recursive Mapping (Go one level deeper into folders)
    const folders = rootExtraction.files.filter((f: any) => f.type === 'folder').slice(0, 5); // Limit to first 5 folders for speed

    if (folders.length > 0) {
      const subFolderScrapes = await Promise.all(folders.map(async (folder: any) => {
        try {
          const subRes = await fetch(`${FIRECRAWL_BASE_URL}/v1/scrape`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
            },
            body: JSON.stringify({
              url: folder.url,
              formats: ['extract'],
              extract: {
                schema: {
                  type: "object",
                  properties: {
                    files: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          url: { type: "string" },
                          type: { type: "string", enum: ["file", "folder"] }
                        }
                      }
                    }
                  }
                }
              }
            })
          });
          if (subRes.ok) {
            const subData = await subRes.json();
            return subData.data?.extract?.files || [];
          }
          return [];
        } catch (e) {
          console.error(`Failed to scrape folder ${folder.name}:`, e);
          return [];
        }
      }));

      allDiscoveredFiles = [...allDiscoveredFiles, ...subFolderScrapes.flat()];
    }

    // Step 3: Clean up and find README
    const uniqueFiles = Array.from(new Map(allDiscoveredFiles.map(item => [item.url, item])).values());
    const links = uniqueFiles.map((f: any) => f.url);
    
    // Improved README extraction: Use the markdown from the root scrape
    const readmeContent = resData.data?.markdown || "Could not extract repository content.";
    const readmeUrl = repoUrl;

    return NextResponse.json({
      success: true,
      repoUrl,
      mappedLinks: links,
      readmeUrl,
      readmeContent,
      extraction: uniqueFiles
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
