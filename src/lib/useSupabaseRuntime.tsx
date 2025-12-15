import { useState } from 'react';
import type { ChatModelAdapter, ChatModelRunResult } from '@assistant-ui/react';
import type { SupportedModel } from '../App';
import type { ThreadAssistantMessagePart } from '@assistant-ui/react';


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
      // Convert Assistant UI messages to API format
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
          Authorization: `Bearer ${
            supabaseAnonKey ||
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
          }`,
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
  const content: ThreadAssistantMessagePart[] = [];


  if (currentText) {
    content.push({
      type: 'text',
      text: currentText,
    });
  }

  toolCalls.forEach((tc) => {
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
    return {
      content,
      status: { type: 'complete', reason: 'stop' },
    };
  }

  return { content };
};


      try {
        while (true) {
          if (abortSignal.aborted) {
            console.log('Stream aborted by user');
            break;
          }

          const { done, value } = await reader.read();
          if (done) {
            console.log('✅ Stream complete');
            yield buildResult(true);
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((line) => line.trim());

          for (const line of lines) {
            try {
              if (line.startsWith('0:')) {
                let text = '';
                try {
                  text = JSON.parse(line.slice(2));
                } catch {
                  text = line.slice(2);
                }
                currentText += text;
                yield buildResult();
              } else if (line.startsWith('9:')) {
                let toolCall: any;
                try {
                  toolCall = JSON.parse(line.slice(2));
                } catch {
                  console.warn('Skipping malformed tool-call line');
                  continue;
                }

                const toolCallId =
                  toolCall.toolCallId || `tool-${Date.now()}-${toolCalls.length}`;

                console.log(
                  '🔧 Tool call detected:',
                  toolCall.toolName,
                  'ID:',
                  toolCallId
                );

                toolCalls.push({
                  toolCallId,
                  toolName: toolCall.toolName,
                  args: toolCall.args,
                  state: 'pending',
                });

                yield buildResult();
              } else if (line.startsWith('a:')) {
                let toolResult: any;
                try {
                  toolResult = JSON.parse(line.slice(2));
                } catch {
                  console.warn(
                    'Tool result parse failed, wrapping raw as error payload'
                  );
                  toolResult = {
                    result: {
                      success: false,
                      error: 'ParseError',
                      raw: line.slice(2),
                    },
                  };
                }

                console.log('✅ Tool result received:', toolResult);

                const pendingToolCall = toolCalls.find(
                  (tc) => tc.state === 'pending'
                );

                if (pendingToolCall) {
                  pendingToolCall.result = toolResult.result;
                  pendingToolCall.state = 'complete';
                  console.log(
                    '🔗 Matched tool result to:',
                    pendingToolCall.toolName
                  );
                } else if (toolCalls.length > 0) {
                  const lastToolCall = toolCalls[toolCalls.length - 1];
                  lastToolCall.result = toolResult.result;
                  lastToolCall.state = 'complete';
                  console.log(
                    '🔗 Matched tool result to last tool:',
                    lastToolCall.toolName
                  );
                }

                yield buildResult();
              }
            } catch (parseError) {
              console.warn('Failed to parse line:', line, parseError);
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          yield buildResult(true);
        } else {
          console.error('❌ Error in stream:', error);
          throw error;
        }
      } finally {
        try {
          reader.releaseLock();
        } catch {
          console.debug('Reader already released');
        }
      }
    },
  }));

  return adapter;
};
