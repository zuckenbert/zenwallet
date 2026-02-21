import { Tool } from '@anthropic-ai/sdk/resources/messages';

export const agentTools: Tool[] = [
  {
    name: 'get_lead_info',
    description: 'Busca informações do lead/cliente pelo telefone. Use para verificar dados já cadastrados.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'Telefone do lead' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'request_lgpd_consent',
    description: 'Registra o consentimento LGPD do cliente. OBRIGATÓRIO antes de coletar CPF ou dados pessoais. Use quando o cliente concordar com o tratamento de dados.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'Telefone do lead' },
        granted: { type: 'boolean', description: 'Se o cliente concedeu consentimento (true) ou recusou (false)' },
      },
      required: ['phone', 'granted'],
    },
  },
  {
    name: 'update_lead',
    description: 'Atualiza dados do lead (nome, CPF, email, renda, empregador, etc). Use quando o cliente fornecer informações pessoais. Requer consentimento LGPD prévio.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'Telefone do lead' },
        name: { type: 'string', description: 'Nome completo' },
        cpf: { type: 'string', description: 'CPF (apenas números)' },
        email: { type: 'string', description: 'Email' },
        birthDate: { type: 'string', description: 'Data de nascimento (YYYY-MM-DD)' },
        monthlyIncome: { type: 'number', description: 'Renda mensal em reais' },
        employerName: { type: 'string', description: 'Nome do empregador' },
        employmentType: { type: 'string', enum: ['CLT', 'PUBLIC_SERVANT', 'SELF_EMPLOYED', 'BUSINESS_OWNER', 'RETIRED', 'OTHER'] },
      },
      required: ['phone'],
    },
  },
  {
    name: 'simulate_loan',
    description: 'Faz simulação de empréstimo pessoal. Retorna parcelas, juros, CET. Use quando o cliente quiser saber valores.',
    input_schema: {
      type: 'object' as const,
      properties: {
        amount: { type: 'number', description: 'Valor do empréstimo em reais' },
        installments: { type: 'number', description: 'Número de parcelas' },
        monthlyIncome: { type: 'number', description: 'Renda mensal para cálculo personalizado (opcional)' },
      },
      required: ['amount', 'installments'],
    },
  },
  {
    name: 'create_application',
    description: 'Cria uma proposta/solicitação de empréstimo formal. Use quando o cliente confirmar que deseja prosseguir com a simulação.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'Telefone do lead' },
        amount: { type: 'number', description: 'Valor do empréstimo' },
        installments: { type: 'number', description: 'Número de parcelas' },
        purpose: {
          type: 'string',
          enum: ['DEBT_CONSOLIDATION', 'HOME_IMPROVEMENT', 'MEDICAL', 'EDUCATION', 'VEHICLE', 'TRAVEL', 'BUSINESS', 'OTHER'],
        },
      },
      required: ['phone', 'amount', 'installments'],
    },
  },
  {
    name: 'check_required_documents',
    description: 'Verifica quais documentos o cliente já enviou e quais ainda faltam.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'Telefone do lead' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'process_document',
    description: 'Registra um documento enviado pelo cliente (foto de RG, comprovante de renda, etc).',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'Telefone do lead' },
        documentType: {
          type: 'string',
          enum: ['RG_FRONT', 'RG_BACK', 'CPF', 'CNH', 'PROOF_OF_INCOME', 'PROOF_OF_ADDRESS', 'SELFIE', 'BANK_STATEMENT'],
        },
        mediaUrl: { type: 'string', description: 'URL do arquivo de mídia' },
        mediaType: { type: 'string', description: 'MIME type do arquivo' },
      },
      required: ['phone', 'documentType'],
    },
  },
  {
    name: 'run_credit_analysis',
    description: 'Executa análise de crédito completa (score, fraude, capacidade de pagamento). Use após coleta de documentos.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'Telefone do lead' },
        applicationId: { type: 'string', description: 'ID da proposta' },
      },
      required: ['phone', 'applicationId'],
    },
  },
  {
    name: 'generate_contract',
    description: 'Gera o contrato de empréstimo para assinatura digital via Clicksign. Use após aprovação da análise de crédito. O link de assinatura será enviado automaticamente ao cliente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        applicationId: { type: 'string', description: 'ID da proposta aprovada' },
      },
      required: ['applicationId'],
    },
  },
  {
    name: 'get_application_status',
    description: 'Consulta o status atual de uma proposta de empréstimo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'Telefone do lead' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'update_lead_stage',
    description: 'Atualiza o estágio do lead no funil de originação.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'Telefone do lead' },
        stage: {
          type: 'string',
          enum: ['NEW', 'QUALIFYING', 'SIMULATING', 'DOCUMENTS_PENDING', 'ANALYZING', 'APPROVED', 'DENIED', 'CONTRACT_SENT', 'CONTRACT_SIGNED', 'DISBURSED', 'COMPLETED', 'CANCELLED'],
        },
      },
      required: ['phone', 'stage'],
    },
  },
];
