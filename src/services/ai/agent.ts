import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { agentTools } from './tools';
import { handleToolCall } from './tool-handlers';
import { SYSTEM_PROMPT, buildContextMessage } from './prompt';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const API_TIMEOUT_MS = 30_000;
const MAX_ITERATIONS = 8;

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
    const collectedText: string[] = [];

    // Build messages with context
    const messages: MessageParam[] = [...conversationHistory];

    if (context && Object.keys(context).length > 0) {
      const contextMsg = buildContextMessage(context);
      messages.push({
        role: 'user',
        content: `${contextMsg}\n\n${userMessage}`,
      });
    } else {
      messages.push({ role: 'user', content: userMessage });
    }

    let currentMessages = messages;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await this.callWithTimeout(currentMessages);

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use',
      );
      const textBlocks = response.content.filter(
        (block): block is Anthropic.Messages.TextBlock => block.type === 'text',
      );

      // Collect any text from this turn
      if (textBlocks.length > 0) {
        collectedText.push(...textBlocks.map((b) => b.text));
      }

      // If no tool calls, we're done
      if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
        if (collectedText.length === 0) {
          return { text: 'Desculpe, não consegui processar. Pode repetir?', toolsUsed };
        }
        return { text: collectedText.join('\n'), toolsUsed };
      }

      // Process tool calls
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        logger.info({ tool: toolUse.name, iteration: i }, 'Executing tool');
        toolsUsed.push(toolUse.name);

        const result = await handleToolCall(toolUse.name, toolUse.input as Record<string, unknown>);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result.content,
          is_error: result.isError,
        });
      }

      // Continue the conversation with tool results
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: response.content as Anthropic.Messages.ContentBlockParam[] },
        { role: 'user', content: toolResults as Anthropic.Messages.ContentBlockParam[] },
      ];
    }

    logger.warn({ toolsUsed }, 'Agent reached max iterations');
    if (collectedText.length > 0) {
      return { text: collectedText.join('\n'), toolsUsed };
    }
    return { text: 'Desculpe, tive um problema processando sua solicitação. Pode tentar novamente?', toolsUsed };
  }

  private async callWithTimeout(
    messages: MessageParam[],
  ): Promise<Anthropic.Messages.Message> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      return await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: agentTools,
        messages: currentMessagesToApiFormat(messages),
      }, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function currentMessagesToApiFormat(
  messages: MessageParam[],
): Anthropic.Messages.MessageParam[] {
  return messages as Anthropic.Messages.MessageParam[];
}

export const loanAgent = new LoanAgent();
