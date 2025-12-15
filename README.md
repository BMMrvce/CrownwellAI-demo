# RCA & Work Order Analyst Chat UI

A modern React-based chat interface for the RCA (Root Cause Analysis) and Work Order Analyst system. This application provides an intuitive interface for querying and analyzing RCA reports and work orders using natural language.

## Features

- 🤖 **Agentic AI Chat**: Natural language queries powered by GPT models
- 🔧 **Tool Call Visualization**: See SQL queries being executed in real-time
- 📊 **Query Results Display**: Formatted display of database query results
- 🎨 **Modern UI**: Dark mode with gradient accents and smooth animations
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Real-time Streaming**: See AI responses as they're generated

## Tech Stack

- **React 19**: Latest React with modern hooks
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **AI SDK**: Integration with OpenAI models
- **Supabase**: Backend and edge functions

## Prerequisites

- Node.js 18+ or Yarn
- Running Supabase instance (local or cloud)
- Configured Supabase Edge Function for chat

## Installation

1. Install dependencies:
```bash
yarn install
# or
npm install
```

2. Configure environment variables (optional):
Create a `.env` file with:
```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Note: If not provided, defaults to local Supabase instance.

## Development

Start the development server:
```bash
yarn dev
# or
npm run dev
```

The app will be available at `http://localhost:5173`

## Building for Production

Build the application:
```bash
yarn build
# or
npm run build
```

Preview the production build:
```bash
yarn preview
# or
npm run preview
```

## Usage

1. **Select a Model**: Choose from GPT-5.1, GPT-5 Mini, or GPT-5.1 Nano (mapped to appropriate OpenAI models)
2. **Ask Questions**: Type natural language questions about:
   - RCA reports and their status
   - Work orders and production tracking
   - Part numbers, batch numbers, serial numbers
   - Quality issues and corrective actions
   - Production efficiency metrics
3. **View Results**: See the AI generate SQL queries, execute them, and provide formatted answers

## Example Queries

- "How many RCA reports are there?"
- "What are the top problems in RCA reports?"
- "Show me work orders for part number UAV-CTRL-288"
- "What's the status of work order WO-20250830-0054?"
- "Which RCA reports have critical severity?"

## Project Structure

```
Chat-UI/
├── src/
│   ├── components/
│   │   ├── ChatInterface.tsx    # Main chat component
│   │   └── ModelSelector.tsx    # Model selection dropdown
│   ├── App.tsx                  # Root component
│   ├── index.css                # Global styles
│   └── main.tsx                 # Entry point
├── public/                      # Static assets
└── package.json                 # Dependencies
```

## Configuration

### Supabase Connection

The app connects to your Supabase instance's chat edge function. Configure via:
- Environment variables (`.env` file)
- Default values (local development)

### Model Selection

Three model options are available:
- **GPT-5.1**: Most capable (currently maps to gpt-4o-mini)
- **GPT-5 Mini**: Balanced performance
- **GPT-5.1 Nano**: Fast and efficient

## Troubleshooting

### Connection Issues
- Verify Supabase is running: `supabase status`
- Check the edge function is deployed: `supabase functions list`
- Ensure OPENAI_API_KEY is set in Supabase secrets

### Build Errors
- Clear cache: `rm -rf node_modules && yarn install`
- Check Node.js version: `node --version` (should be 18+)

## Contributing

This is part of the Crownwell Analyst project. For contributions:
1. Follow the existing code style
2. Ensure TypeScript types are properly defined
3. Test with both local and production Supabase instances
4. Update README if adding new features

## License

Private project - Crownwell

## Support

For issues or questions, contact the development team.
