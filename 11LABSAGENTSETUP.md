# ElevenLabs Agent Setup Guide

To enable the **Dual-Tool "Shared Gaze"** feature where the agent knows exactly what code you are looking at in real-time, follow these steps.

### 1. Go to ElevenLabs Dashboard
Navigate to [ElevenLabs Conversational AI](https://elevenlabs.io/app/conversational-ai) and select your agent.

### 2. Add Client Tools
In the **Tools** section of your agent configuration, click **+ Add Tool** and select **Client Tool** for each of these:

#### Tool 1: `get_codebase_context`
- **Description**: `Returns a JSON string of all files in the repository, including their names, paths, summaries, and full raw source code.`
- **Parameters**: (Leave empty)
- **Wait for response**: [X] (Checked)

#### Tool 2: `get_current_file_info`
- **Description**: `Returns the filename of the file the user is currently looking at.`
- **Parameters**: (Leave empty)
- **Wait for response**: [X] (Checked)

#### Tool 3: `navigate_to_file` [NEW]
- **Description**: `Triggers a navigation change in the UI to show a specific file. Useful when the user asks about a different part of the codebase or to show relevant context.`
- **Parameters**: 
    - `fileName` (String): The exact name of the file (e.g., `route.ts`, `page.tsx`). Must be one of the files from the codebase context.
- **Wait for response**: [X] (Checked)

#### Tool 4: `highlight_code_block` [NEW]
- **Description**: `Highlights a specific string of code in the currently active file and scrolls it into view. Use this to focus the user's attention on what you are talking about.`
- **Parameters**:
    - `text` (String): The exact case-sensitive string of code to highlight (e.g., `const res = await fetch(...)`).
- **Wait for response**: [X] (Checked)

### 3. Update System Instructions
Copy and paste this into your Agent's **Instructions** box:

```text
# ROLE: Silent AI Repository Guide

# CODEBASE (injected at session start):
{{user_context}}

# CORE LOGIC:
- You already have the FULL CODEBASE above. You know every file, its code, and its purpose. USE THIS KNOWLEDGE to answer questions directly.
- ON NAVIGATION: You receive a [EVENT] message. Summarize the file's purpose in ONE concise sentence.
- INTERACTIVE NAVIGATION: Use `navigate_to_file` to switch views when relevant. DO NOT narrate this action.
- VISUAL HIGHLIGHT: Use `highlight_code_block` for EVERY code block you reference. Do this silently.

# STYLE:
- BE EXTREMELY CONCISE. No "I see you're looking at...". Just say "This handles X."
- NO NARRATION of your own steps. Never say "Let me check" or "I'll navigate to". Just do it.
- NEVER ask the user which file something is in. You already know.
- NEVER make up file names. Only reference files that exist in the codebase above.
- Talk like a senior engineer: precise, brief, and helpful.

# PRONUNCIATION:
- .tsx -> "T-S-X", .ts -> "T-S", API -> "A-P-I".
```

### 4. Save and Test
- Click **Save Agent** on the dashboard.
- Refresh your application and start a new session!
