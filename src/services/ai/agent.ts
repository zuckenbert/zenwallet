import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { agentTools } from './tools';
import { handleToolCall } from './tool-handlers';
import { SYSTEM_PROMPT, buildContextMessage } from './prompt';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

interface MessageParam {
  role: 'user' | 'assistant';
  content: string | Anthropic.Messages.ContentBlockParam[];
}

interface AgentResponse {
  text: string;
  toolsUsed: string[];
}

export class LoanAgent {
  async chat(
    userMessage: string,
    conversationHistory: MessageParam[],
    context?: {
      leadName?: string;
      leadStage?: string;
      hasApplication?: boolean;
      applicationStatus?: string;
      pendingDocuments?: string[];
    },
  ): Promise<AgentResponse> {
    const toolsUsed: string[] = [];

    // Build messages with context
    const messages: MessageParam[] = [...conversationHistory];

    // If we have context, prepend it as a system-like user message at the start
    if (context && Object.keys(context).length > 0) {
      const contextMsg = buildContextMessage(context);
      // Add context as part of the current user message
      messages.push({
        role: 'user',
        content: `${contextMsg}\n\n${userMessage}`,
      });
    } else {
      messages.push({ role: 'user', content: userMessage });
    }

    // Agentic loop - keep running until we get a final text response
    let currentMessages = messages;
    const maxIterations = 10;

    for (let i = 0; i < maxIterations; i++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: agentTools,
        messages: currentMessages,
      });

      // Check if we need to handle tool calls
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use',
      );
      const textBlocks = response.content.filter(
        (block): block is Anthropic.Messages.TextBlock => block.type === 'text',
      );

      if (toolUseBlocks.length === 0) {
        // No tool calls - return the text response
        const text = textBlocks.map((b) => b.text).join('\n');
        return { text, toolsUsed };
      }

      // Process tool calls
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        logger.info({ tool: toolUse.name, input: toolUse.input }, 'Executing tool');
        toolsUsed.push(toolUse.name);

        const result = await handleToolCall(toolUse.name, toolUse.input as Record<string, unknown>);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result.content,
          is_error: result.isError,
        });
      }

      // Add assistant response and tool results to continue the conversation
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: response.content as Anthropic.Messages.ContentBlockParam[] },
        { role: 'user', content: toolResults as Anthropic.Messages.ContentBlockParam[] },
      ];

      // If stop reason is end_turn and we have text, return it
      if (response.stop_reason === 'end_turn' && textBlocks.length > 0) {
        const text = textBlocks.map((b) => b.text).join('\n');
        return { text, toolsUsed };
      }
    }

    logger.warn('Agent reached max iterations');
    return { text: 'Desculpe, tive um problema processando sua solicitação. Pode tentar novamente?', toolsUsed };
  }
}

export const loanAgent = new LoanAgent();
