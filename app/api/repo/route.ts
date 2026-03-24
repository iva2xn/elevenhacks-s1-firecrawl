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

    // Step 2: Recursive Mapping (Go deep into folders)
    const initialFolders = rootExtraction.files.filter((f: any) => f.type === 'folder');
    let processedFolders = new Set<string>();
    let queue: string[] = initialFolders.map((f: any) => f.url);
    let depth = 0;
    const MAX_DEPTH = 3; // Deep enough for app/api/repo/route.ts

    while (queue.length > 0 && depth < MAX_DEPTH) {
      const currentLevel = [...queue];
      queue = [];
      depth++;

      const levelScrapes = await Promise.all(currentLevel.map(async (folderUrl) => {
        if (processedFolders.has(folderUrl)) return [];
        processedFolders.add(folderUrl);

        try {
          const subRes = await fetch(`${FIRECRAWL_BASE_URL}/v1/scrape`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
            },
            body: JSON.stringify({
              url: folderUrl,
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
            const discovered = subData.data?.extract?.files || [];
            // Add folders to queue for next level
            const newFolders = discovered.filter((f: any) => f.type === 'folder').map((f: any) => f.url);
            queue.push(...newFolders);
            return discovered;
          }
          return [];
        } catch (e) {
          console.error(`Failed to scrape folder:`, e);
          return [];
        }
      }));

      allDiscoveredFiles = [...allDiscoveredFiles, ...levelScrapes.flat()];
      // Limit queue size to avoid massive scrapes
      if (queue.length > 20) queue = queue.slice(0, 20);
    }

    // Step 3: Clean up and find README
    const ignoreList = [
      'next.config.ts', 'postcss.config.mjs', 'package-lock.json', 
      'eslint.config.mjs', 'tsconfig.json', '.gitignore', 'favicon', '.git'
    ];

    const imageExtensions = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'];
    
    const filteredFiles = allDiscoveredFiles.filter((f: any) => {
      const lowerName = f.name.toLowerCase();
      
      // Strict rule: Only keep README.md if it's a markdown file
      if (lowerName.endsWith('.md') && lowerName !== 'readme.md') {
        return false;
      }
      
      // Ignore images
      if (imageExtensions.some(ext => lowerName.endsWith(ext))) {
        return false;
      }
      
      // Explicitly ignore boilerplate/config
      const isBlacklisted = ignoreList.some(term => lowerName.includes(term));
      
      return !isBlacklisted;
    });

    const uniqueFiles = Array.from(new Map(filteredFiles.map((item: any) => [item.url, item])).values());
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
