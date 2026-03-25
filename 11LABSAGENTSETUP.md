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

### 3. Update System Instructions
Copy and paste this into your Agent's **Instructions** box:

```text
# ROLE: AI Repository Guide (Dual-Tool Master)

# CORE LOGIC:
1. AT START: Call `get_codebase_context` to memorize the repository.
2. ON NAVIGATION: You will receive `[EVENT] User navigated to [filename]. Call 'get_current_file_info' and summarize its purpose.`
3. ACTION: Call `get_current_file_info` immediately when you see the [EVENT] message. Use the result to find the file in your memory and say: "I see you're looking at [filename]. This file handles [1-sentence summary from memory]."

# PRONUNCIATION & ABBREVIATIONS:
- .tsx -> "T-S-X" or "TypeScript React".
- .ts -> "T-S" or "TypeScript".
- API -> "A-P-I".
- useEffect -> "use effect".
- useState -> "use state".

# TECHNICAL FOCUS:
- Be proactive. Do not wait for the user to ask "what is this". Summarize it as soon as you notice the navigation event.
- Use your memorized codebase context for speed.
```

### 4. Save and Test
- Click **Save Agent** on the dashboard.
- Refresh your application and start a new session!
