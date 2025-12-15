import { useState } from 'react';
import type { ChatModelAdapter, ChatModelRunResult } from '@assistant-ui/react';
import type { SupportedModel } from '../App';

interface UseSupabaseRuntimeProps {
  model: SupportedModel;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

interface ToolCall {
  toolCallId: string;
  toolName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any;
  result?: unknown;
  state?: 'pending' | 'complete';
}

export const useSupabaseRuntime = ({
  model,
  supabaseUrl = 'http://127.0.0.1:54321',
  supabaseAnonKey = '',
}: UseSupabaseRuntimeProps): ChatModelAdapter => {
  const [adapter] = useState<ChatModelAdapter>(() => ({
    async *run({ messages, abortSignal }) {
      // Convert Assistant UI messages to our API format
      const apiMessages = messages.map((msg) => {
        const textContent = msg.content
          .filter((part) => part.type === 'text')
          .map((part) => ('text' in part ? part.text : ''))
          .join('');
        
        return {
          role: msg.role,
          content: textContent,
        };
      });

      const requestBody = {
        messages: apiMessages,
        model,
      };

      console.log('🚀 Sending request with model:', model);
      console.log('📦 Request body:', requestBody);

      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortSignal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let currentText = '';
      const toolCalls: ToolCall[] = [];

      const buildResult = (isComplete = false): ChatModelRunResult => {
        const content: Array<ChatModelRunResult['content'][number]> = [];
        
        if (currentText) {
          content.push({
            type: 'text',
            text: currentText,
          });
        }
        
        toolCalls.forEach(tc => {
          content.push({
            type: 'tool-call',
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            args: tc.args,
            argsText: JSON.stringify(tc.args),
            result: tc.result,
          });
        });
        
        if (isComplete) {
          return { content, status: { type: 'complete' } };
        }
        
        return { content };
      };

      try {
        while (true) {
          // Check if aborted before reading
          if (abortSignal.aborted) {
            console.log('Stream aborted by user');
            break;
          }

          const { done, value } = await reader.read();
          if (done) {
            // Yield final result with complete status before breaking
            console.log('✅ Stream complete');
            yield buildResult(true);
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          // Split lines but keep multi-line payloads safe; only parse known prefixes
          const lines = chunk.split('\n').filter((line) => line.trim());

          for (const line of lines) {
            try {
              // Parse AI SDK data stream format
              if (line.startsWith('0:')) {
                // Text chunk
                // Text chunks are JSON-encoded strings; guard parsing
                let text = '';
                try {
                  text = JSON.parse(line.slice(2));
                } catch {
                  // If not valid JSON, treat raw as text
                  text = line.slice(2);
                }
                currentText += text;
                yield buildResult();
              } else if (line.startsWith('9:')) {
                // Tool call
                let toolCall: any;
                try {
                  toolCall = JSON.parse(line.slice(2));
                } catch {
                  // Skip malformed tool call lines
                  console.warn('Skipping malformed tool-call line');
                  continue;
                }
                const toolCallId = toolCall.toolCallId || `tool-${Date.now()}-${toolCalls.length}`;
                
                console.log('🔧 Tool call detected:', toolCall.toolName, 'ID:', toolCallId);
                
                toolCalls.push({
                  toolCallId,
                  toolName: toolCall.toolName,
                  args: toolCall.args,
                  state: 'pending',
                });
                
                yield buildResult();
              } else if (line.startsWith('a:')) {
                // Tool result
                let toolResult: any;
                try {
                  toolResult = JSON.parse(line.slice(2));
                } catch (e) {
                  // Tool results sometimes include large SQL strings; handle non-JSON payloads
                  console.warn('Tool result parse failed, wrapping raw as error payload');
                  toolResult = { result: { success: false, error: 'ParseError', raw: line.slice(2) } };
                }
                
                console.log('✅ Tool result received:', toolResult);
                
                // Match tool result with tool call
                // The AI SDK sends tool results in the same order as tool calls
                const pendingToolCall = toolCalls.find(tc => tc.state === 'pending');
                
                if (pendingToolCall) {
                  pendingToolCall.result = toolResult.result;
                  pendingToolCall.state = 'complete';
                  console.log('🔗 Matched tool result to:', pendingToolCall.toolName);
                } else if (toolCalls.length > 0) {
                  // Fallback: assign to last tool call
                  const lastToolCall = toolCalls[toolCalls.length - 1];
                  lastToolCall.result = toolResult.result;
                  lastToolCall.state = 'complete';
                  console.log('🔗 Matched tool result to last tool:', lastToolCall.toolName);
                }
                
                yield buildResult();
              }
            } catch (parseError) {
              console.warn('Failed to parse line:', line, parseError);
            }
          }
        }
      } catch (error) {
        // Handle abort errors gracefully
        if (error instanceof Error && error.name === 'AbortError') {
          // Silently handle abort - user cancelled or navigated away
          yield buildResult(true);
        } else {
          console.error('❌ Error in stream:', error);
          throw error;
        }
      } finally {
        try {
          reader.releaseLock();
        } catch (e) {
          // Reader might already be released, this is fine
          console.debug('Reader already released');
        }
      }
    },
  }));

  return adapter;
};

