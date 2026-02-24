import { LeadStage, ApplicationStatus, DocumentType } from '@prisma/client';

export interface IncomingMessage {
  phone: string;
  name?: string;
  text: string;
  mediaUrl?: string;
  mediaType?: string;
  whatsappMsgId?: string;
}

export interface LoanSimulation {
  amount: number;
  installments: number;
  interestRate: number;
  monthlyPayment: number;
  totalAmount: number;
  totalInterest: number;
  iof: number;
  cet: number; // Custo Efetivo Total
}

export interface CreditCheckResult {
  score: number;
  provider: string;
  fraudRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  debtToIncome: number;
  existingDebts: number;
  decision: 'APPROVED' | 'DENIED' | 'MANUAL_REVIEW';
  reason: string;
  maxApprovedAmount?: number;
  suggestedRate?: number;
}

export interface LeadData {
  phone: string;
  name?: string;
  cpf?: string;
  email?: string;
  birthDate?: Date;
  monthlyIncome?: number;
  employerName?: string;
  employmentType?: string;
}

export interface ConversationContext {
  leadId: string;
  stage: LeadStage;
  pendingDocuments: DocumentType[];
  currentApplication?: {
    id: string;
    status: ApplicationStatus;
    amount: number;
    installments: number;
  };
  simulationHistory: LoanSimulation[];
}

export interface AIToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface AIToolResult {
  content: string;
  isError?: boolean;
}
