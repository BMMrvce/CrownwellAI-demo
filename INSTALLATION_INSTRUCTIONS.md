# Installation Instructions

## Overview

Your React chat interface has been migrated to use **Assistant UI** - a production-ready library for building AI chat interfaces.

## Installation Steps

### 1. Install Required Packages

Run the following command in the `Chat-UI` directory:

```bash
cd /Users/sanjeev/Desktop/crownwell/analyst/Chat-UI
yarn install
```

This will install:
- `@assistant-ui/react` - The main Assistant UI library
- All other existing dependencies

### 2. Start the Development Server

```bash
yarn dev
```

The app should now be running at `http://localhost:5173`

## What Changed

### Files Modified

1. **`src/components/ChatInterface.tsx`** - Completely rewritten to use Assistant UI components
   - Now only ~70 lines of code (was ~270 lines)
   - Uses `<Thread />` component for the entire chat UI
   - Automatic message streaming and tool call handling

2. **`src/lib/useSupabaseRuntime.tsx`** - New custom runtime adapter
   - Connects Assistant UI to your Supabase Edge Function
   - Handles streaming AI SDK responses
   - Manages tool calls and results

3. **`src/index.css`** - Added Assistant UI styling
   - Custom theme matching your dark mode design
   - Responsive layout
   - Tool call visualization styles

4. **`package.json`** - Added `@assistant-ui/react` dependency

### Files Created

- `ASSISTANT_UI_SETUP.md` - Comprehensive guide on the new architecture
- `INSTALLATION_INSTRUCTIONS.md` - This file

## Benefits

✅ **Reduced Code** - 75% less code to maintain
✅ **Better UX** - Production-tested streaming, auto-scroll, and error handling
✅ **Extensible** - Easy to customize and extend
✅ **Performance** - Optimized rendering during streaming
✅ **Future-Proof** - Library updates handle improvements automatically

## Troubleshooting

### If you get "Module not found" errors:

```bash
cd Chat-UI
rm -rf node_modules
rm yarn.lock
yarn install
```

### If the chat doesn't stream properly:

1. Make sure your Supabase Edge Function is running:
   ```bash
   supabase functions serve
   ```

2. Check the browser console for errors

3. Verify environment variables in `.env`:
   ```
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=your-key-here
   ```

### If styling looks wrong:

Make sure you've saved all the CSS changes in `src/index.css`. The Assistant UI components use classes like `aui-*` for styling.

## Testing

Once installed, try:

1. Ask a question like "Show me all RCA reports"
2. Watch the assistant stream its response
3. See tool calls automatically displayed
4. Check that the model indicator shows your selected model

## Next Steps

- Read `ASSISTANT_UI_SETUP.md` for customization options
- Explore Assistant UI docs: https://www.assistant-ui.com/
- Add more features like file upload, message editing, etc.

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify your Supabase Edge Function is running
3. Ensure all environment variables are set correctly
4. Review the `ASSISTANT_UI_SETUP.md` guide

