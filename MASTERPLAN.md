# ZenWallet MasterPlan

> **Crypto made fun. For real.**

Este documento é o guia definitivo para desenvolvimento do ZenWallet - uma crypto wallet gamificada para jovens (16-24 anos) construída sobre Solana.

---

## Sumário

1. [Visão do Produto](#1-visão-do-produto)
2. [Decisões Técnicas](#2-decisões-técnicas)
3. [Arquitetura](#3-arquitetura)
4. [Features do MVP](#4-features-do-mvp)
5. [Sistema de Gamificação](#5-sistema-de-gamificação)
6. [UI/UX Guidelines](#6-uiux-guidelines)
7. [Segurança & Custody](#7-segurança--custody)
8. [Integração Midaz](#8-integração-midaz)
9. [Roadmap de Execução](#9-roadmap-de-execução)
10. [Estrutura do Projeto](#10-estrutura-do-projeto)
11. [Guia para Agentes Claude](#11-guia-para-agentes-claude)

---

## 1. Visão do Produto

### 1.1 O Problema

Wallets de crypto tradicionais são intimidadoras para jovens. Interface fria, terminologia complexa, zero feedback positivo. Jovens querem entrar em crypto mas desistem na primeira tela.

### 1.2 A Solução

ZenWallet combina:
- **Poder técnico do Phantom** (funcionalidade completa)
- **Gamificação do Revolut** (viciante, recompensador)
- **UI/UX premium** (dark mode, animações, dopamina)

### 1.3 Público-Alvo

| Aspecto | Definição |
|---------|-----------|
| **Idade** | 16-24 anos (Gen Z) |
| **Perfil** | Digital natives, gamers, early adopters |
| **Comportamento** | TikTok users, valorizam estética, impacientes com UX ruim |
| **Motivação** | Querem crypto mas acham wallets tradicionais chatas |

### 1.4 Benchmarks

| Phantom | ZenWallet | Revolut |
|---------|-----------|---------|
| Power users | Novatos divertidos | Banking tradicional |
| Funcional | Gamificado | Gamificado |
| Neutro/Frio | Gen Z energy, quente | Corporativo/Limpo |

### 1.5 Valores de Design

1. **Fun > Serious** - Cada interação deve ter prazer
2. **Progress > Perfection** - Mostrar evolução constante
3. **Simple > Complete** - Menos features, mais polidas

### 1.6 Modelo de Negócio

**Fee no Swap:** 0.5% em cada swap (além do fee Jupiter de ~0.35%)

---

## 2. Decisões Técnicas

### 2.1 Stack Confirmada

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| **Frontend** | Lovable + React + TypeScript | Velocidade de desenvolvimento, UI premium |
| **Styling** | Tailwind CSS + Framer Motion | Animações fluidas, design system rápido |
| **Blockchain** | Solana | Taxas baixas, velocidade, ecossistema jovem |
| **Solana SDK** | @solana/web3.js + wallet-adapter | Padrão da indústria |
| **Swap** | Jupiter SDK v6 | Melhor agregador, liquidez máxima |
| **RPC** | Helius (ou QuickNode) | DAS API para tokens/NFTs |
| **Ledger** | Midaz (Lerian) | Registro contábil, histórico, compliance |
| **State** | Zustand | Leve, simples, TypeScript-first |
| **Storage** | IndexedDB (encrypted) | Keypairs seguros no device |
| **Deploy** | Vercel/Netlify | PWA ready, edge functions |

### 2.2 Dependências Principais

```json
{
  "dependencies": {
    "@solana/web3.js": "^1.95",
    "@solana/wallet-adapter-react": "^0.15",
    "@solana/wallet-adapter-react-ui": "^0.9",
    "@solana/wallet-adapter-wallets": "^0.19",
    "@jup-ag/api": "^6.0",
    "bip39": "^3.1",
    "tweetnacl": "^1.0",
    "zustand": "^4.5",
    "framer-motion": "^11",
    "tailwindcss": "^3.4",
    "react": "^18",
    "typescript": "^5"
  }
}
```

### 2.3 Custody Model

**Híbrido Non-Custodial:**
- Criar wallet própria (seed phrase gerada localmente)
- OU conectar wallet externa (Phantom, Solflare, etc.)
- Keys NUNCA saem do device do usuário
- ZenWallet NUNCA tem acesso aos fundos

---

## 3. Arquitetura

### 3.1 Diagrama Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Lovable)                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  React + TypeScript + Tailwind + Framer Motion            │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐  │ │
│  │  │ Wallet  │ │  Swap   │ │  dApps  │ │  Gamification   │  │ │
│  │  │  Core   │ │ Module  │ │ Browser │ │    Engine       │  │ │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────────┬────────┘  │ │
│  └───────┼───────────┼───────────┼───────────────┼───────────┘ │
└──────────┼───────────┼───────────┼───────────────┼─────────────┘
           │           │           │               │
┌──────────▼───────────▼───────────▼───────────────▼─────────────┐
│                      SOLANA LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ @solana/    │  │  Jupiter    │  │    Helius RPC           │ │
│  │ web3.js     │  │  SDK v6     │  │   (DAS API)             │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                    MIDAZ LEDGER LAYER                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │Organization │  │   Ledger    │  │       Accounts          │ │
│  │ "ZenWallet" │  │  "Solana"   │  │  (1 per user wallet)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Assets    │  │Transactions │  │       Balances          │ │
│  │ SOL/USDC/...│  │ (double-    │  │  (real-time tracking)   │ │
│  │             │  │  entry)     │  │                         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                    STORAGE LAYER (Device)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ LocalStorage│  │ IndexedDB   │  │  Encrypted KeyStore     │ │
│  │ (prefs/xp)  │  │ (history)   │  │  (AES-256-GCM)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Fluxo de Dados - Swap com Fee

```
1. User clica "Swap"
2. → Jupiter Quote API (busca melhor rota)
3. → Calcula fee total (0.5% ZenWallet + ~0.35% Jupiter)
4. → Mostra preview para user (input, output, fees)
5. → User confirma
6. → Sign transaction (keypair local OU wallet externa)
7. → Submit to Solana RPC
8. → Aguarda confirmação on-chain
9. → Registra no Midaz (transaction + balance update)
10. → Reward XP + animação de sucesso
11. → Atualiza UI
```

---

## 4. Features do MVP

### 4.1 Core Features (Must Have)

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| **Wallet Creation** | Gerar seed phrase, criar keypair, encrypt & store | P0 |
| **Wallet Import** | Importar via seed phrase existente | P0 |
| **External Connect** | Conectar Phantom/Solflare via Wallet Adapter | P0 |
| **Balance View** | Mostrar SOL + tokens SPL (via Helius DAS API) | P0 |
| **Send Crypto** | Enviar SOL/tokens para endereço | P0 |
| **Receive** | Mostrar endereço + QR code + copy | P0 |
| **Swap** | Jupiter integration com fee 0.5% | P0 |
| **Transaction History** | Lista de txs via Midaz + on-chain | P1 |

### 4.2 Telas do MVP

1. **Onboarding** - Welcome, Create/Import/Connect choice
2. **Create Wallet** - Generate seed, backup quiz, set PIN
3. **Import Wallet** - Input seed phrase, validate, set PIN
4. **Home/Balance** - Saldo principal, XP bar, quick actions
5. **Assets** - Lista de tokens com valores
6. **Send** - Modal com input address, amount, preview, confirm
7. **Receive** - Modal com address, QR code
8. **Swap** - Interface Jupiter, from/to tokens, preview, execute
9. **Achievements** - Grid de badges, progresso
10. **Settings** - Segurança, tema, sobre

---

## 5. Sistema de Gamificação

### 5.1 XP System

| Ação | XP Ganho |
|------|----------|
| Primeiro login | +50 XP |
| Login diário | +10 XP |
| Enviar crypto | +25 XP |
| Receber crypto | +15 XP |
| Fazer swap | +50 XP |
| Conectar dApp | +30 XP |
| Streak 7 dias | +100 XP bonus |
| Streak 30 dias | +500 XP bonus |

### 5.2 Level System

| Level Range | Título | XP Required |
|-------------|--------|-------------|
| 1-10 | Noob | 0-1,000 |
| 11-25 | Crypto Curious | 1,001-5,000 |
| 26-40 | DeFi Explorer | 5,001-15,000 |
| 41-50 | Whale | 15,001+ |

**Fórmula XP por Level:**
```typescript
const xpForLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(level, 1.5));
};
```

### 5.3 Achievements

| Badge | Condição | XP Bonus |
|-------|----------|----------|
| 🚀 First Steps | Criar primeira wallet | +100 |
| 💸 First Send | Enviar primeira transação | +50 |
| 🔄 Swap Master | Fazer primeiro swap | +50 |
| 📅 Week Warrior | 7 dias consecutivos | +100 |
| 🔥 Monthly Legend | 30 dias consecutivos | +500 |
| 💎 Diamond Hands | Manter saldo 30 dias | +200 |
| 🎯 Transaction Pro | 100 transações | +300 |
| 🌐 dApp Explorer | Conectar 5 dApps | +150 |
| 🐋 Whale Status | Atingir level 41 | +1000 |

### 5.4 Streaks

```typescript
interface Streak {
  currentStreak: number;    // Dias consecutivos
  longestStreak: number;    // Recorde pessoal
  lastLoginDate: string;    // ISO date
}

// Regras:
// - Login conta 1x por dia (00:00 - 23:59 UTC)
// - Perder um dia = streak reseta para 0
// - Bonus XP em milestones (7, 14, 30, 60, 90 dias)
```

### 5.5 Persistência

Gamification data armazenado em:
1. **LocalStorage** - XP, level, achievements (cache rápido)
2. **Midaz** - Histórico oficial, backup, multi-device futuro

---

## 6. UI/UX Guidelines

### 6.1 Color Palette

```css
:root {
  /* Base */
  --bg-primary: #0A0A0B;
  --bg-secondary: #141416;
  --bg-tertiary: #1C1C1F;

  /* Brand */
  --solana-green: #14F195;
  --accent-purple: #9945FF;

  /* Semantic */
  --success: #19FB9B;
  --error: #FF6B6B;
  --warning: #FFB547;

  /* Text */
  --text-primary: #FFFFFF;
  --text-secondary: #A0A0A0;
  --text-muted: #666666;

  /* Gradients */
  --gradient-xp: linear-gradient(90deg, #14F195 0%, #9945FF 100%);
  --gradient-card: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  --glow-green: 0 0 20px rgba(20, 241, 149, 0.3);
}
```

### 6.2 Typography

```css
/* Display - Saldos grandes */
.text-display {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 48px;
  line-height: 1.1;
}

/* Headings */
.text-heading {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 24px;
}

/* Body */
.text-body {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 16px;
}

/* Mono - Addresses, hashes */
.text-mono {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 400;
  font-size: 14px;
}
```

### 6.3 Component Patterns

**Balance Card:**
```
┌───────────────────────────────────┐
│  ◉ Level 12 • Crypto Curious      │
│  ████████████░░░░░░ 2,450 XP      │
│                                   │
│         $1,234.56                 │
│         ≈ 12.5 SOL                │
│                                   │
│  [📤 Send]  [📥 Receive]  [🔄 Swap] │
└───────────────────────────────────┘
```

**Achievement Popup:**
```
┌───────────────────────────────────┐
│         🎉 CONFETTI 🎉            │
│                                   │
│     🏆 First Swap Complete!       │
│         +50 XP earned             │
│                                   │
│          [Awesome!]               │
└───────────────────────────────────┘
```

**Bottom Navigation:**
```
┌─────────────────────────────────────────┐
│  🏠      📊      🔄      🏆      ⚙️   │
│ Home   Assets   Swap  Achieve  Settings │
└─────────────────────────────────────────┘
```

### 6.4 Animations (Framer Motion)

```typescript
// Configurações padrão
const transitions = {
  button: { duration: 0.1, scale: 0.95 },
  card: { duration: 0.3, y: 20, opacity: 0 },
  xpGain: { duration: 0.8, y: -30, opacity: 0 },
  confetti: { duration: 1.5 },
  levelUp: { duration: 2.0 },
  balanceUpdate: { duration: 0.6 },
};

// Exemplo: XP gain animation
const xpGainVariants = {
  initial: { opacity: 0, y: 0 },
  animate: { opacity: 1, y: -30 },
  exit: { opacity: 0, y: -50 },
};
```

### 6.5 Responsive Breakpoints

```css
/* Mobile First - Primary Target */
@media (min-width: 320px) { /* Base */ }
@media (min-width: 480px) { /* Large mobile */ }
@media (min-width: 768px) { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop - optional */ }
```

---

## 7. Segurança & Custody

### 7.1 Princípios

1. **Non-Custodial** - User controla 100% das keys
2. **Local-First** - Seed phrase nunca sai do device
3. **Encrypted Storage** - AES-256-GCM para keypairs
4. **Zero Knowledge** - ZenWallet não pode acessar fundos

### 7.2 Encryption Flow

```
Seed Phrase (12/24 words)
        │
        ▼
┌─────────────────────────┐
│  PBKDF2 Key Derivation  │
│  - 100,000 iterations   │
│  - Salt único por user  │
│  - Input: PIN/Biometric │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   AES-256-GCM Encrypt   │
│   - IV único por op     │
│   - Auth tag included   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   IndexedDB Storage     │
│   - Encrypted blob      │
│   - Never plaintext     │
└─────────────────────────┘
```

### 7.3 Security Checklist

| Controle | Implementação | Status |
|----------|---------------|--------|
| Encrypted storage | AES-256-GCM + IndexedDB | Required |
| PIN/Biometric lock | Web Authn API | Required |
| Session timeout | 5 min inatividade | Required |
| Seed phrase backup | Quiz de confirmação | Required |
| Transaction preview | Mostrar antes de assinar | Required |
| Phishing protection | Verificar domínio dApp | Important |
| Rate limiting | Throttle em falhas de PIN | Important |
| Secure clipboard | Auto-clear após 60s | Nice-to-have |

### 7.4 Fluxo de Criação de Wallet

```typescript
async function createWallet(pin: string): Promise<void> {
  // 1. Gerar entropia segura
  const entropy = crypto.getRandomValues(new Uint8Array(16));

  // 2. Derivar mnemonic via BIP39
  const mnemonic = bip39.entropyToMnemonic(entropy);

  // 3. Mostrar para user fazer backup
  await showBackupScreen(mnemonic);

  // 4. Quiz de confirmação
  const confirmed = await backupQuiz(mnemonic);
  if (!confirmed) throw new Error('Backup not confirmed');

  // 5. Gerar keypair
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const keypair = Keypair.fromSeed(seed.slice(0, 32));

  // 6. Derivar encryption key
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await pbkdf2(pin, salt, 100000);

  // 7. Encrypt keypair
  const encrypted = await aesEncrypt(keypair.secretKey, key);

  // 8. Salvar em IndexedDB
  await saveToKeystore({
    publicKey: keypair.publicKey.toBase58(),
    encryptedSecretKey: encrypted,
    salt: salt,
  });

  // 9. Limpar memória
  mnemonic = '';
  keypair.secretKey.fill(0);
}
```

### 7.5 Disclaimers Obrigatórios

```typescript
const DISCLAIMERS = {
  backup: `
    IMPORTANTE: Sua seed phrase é a ÚNICA forma de recuperar sua wallet.
    - Anote em papel físico
    - NUNCA compartilhe com ninguém
    - NUNCA armazene digitalmente (print screen, email, cloud)
    Se perder, seus fundos serão perdidos PERMANENTEMENTE.
  `,

  nonCustodial: `
    ZenWallet é uma wallet non-custodial.
    Você é o único responsável pela segurança dos seus fundos.
    Não podemos recuperar sua wallet ou reverter transações.
  `,
};
```

---

## 8. Integração Midaz

### 8.1 Hierarquia de Entidades

```
Organization: "ZenWallet"
    │
    └── Ledger: "solana-mainnet"
            │
            ├── Asset: "SOL" (native)
            ├── Asset: "USDC" (SPL token)
            ├── Asset: "BONK" (SPL token)
            │
            └── Portfolio: "user-wallets"
                    │
                    ├── Account: "wallet-ABC123..."
                    │       ├── Balance: SOL
                    │       └── Balance: USDC
                    │
                    └── Account: "wallet-DEF456..."
                            ├── Balance: SOL
                            └── Balance: BONK
```

### 8.2 Setup Inicial

```typescript
// 1. Criar Organization (uma vez)
const org = await midaz.organizations.create({
  legalName: "ZenWallet",
  legalDocument: "00000000000",
  status: { code: "ACTIVE" },
});

// 2. Criar Ledger para Solana
const ledger = await midaz.ledgers.create(org.id, {
  name: "solana-mainnet",
  status: { code: "ACTIVE" },
});

// 3. Criar Assets
await midaz.assets.create(org.id, ledger.id, {
  name: "Solana",
  type: "crypto",
  code: "SOL",
  status: { code: "ACTIVE" },
});

await midaz.assets.create(org.id, ledger.id, {
  name: "USD Coin",
  type: "crypto",
  code: "USDC",
  status: { code: "ACTIVE" },
});
```

### 8.3 Registrar Nova Wallet

```typescript
async function registerWalletInMidaz(publicKey: string): Promise<void> {
  // Criar account no Midaz
  const account = await midaz.accounts.create(org.id, ledger.id, {
    name: `wallet-${publicKey.slice(0, 8)}`,
    type: "wallet",
    assetCode: "SOL",
    status: { code: "ACTIVE" },
    metadata: {
      solanaAddress: publicKey,
      createdAt: new Date().toISOString(),
    },
  });

  // Salvar account ID localmente
  await saveAccountId(publicKey, account.id);
}
```

### 8.4 Registrar Transação

```typescript
async function recordTransaction(
  signature: string,
  from: string,
  to: string,
  amount: number,
  asset: string,
  type: 'send' | 'receive' | 'swap'
): Promise<void> {
  const tx = await midaz.transactions.create(org.id, ledger.id, {
    description: `${type}: ${amount} ${asset}`,
    metadata: {
      solanaSignature: signature,
      type: type,
    },
    operations: [
      {
        accountId: await getAccountId(from),
        type: 'debit',
        amount: amount.toString(),
        assetCode: asset,
      },
      {
        accountId: await getAccountId(to),
        type: 'credit',
        amount: amount.toString(),
        assetCode: asset,
      },
    ],
  });
}
```

### 8.5 Sync de Balances

```typescript
async function syncBalances(publicKey: string): Promise<Balance[]> {
  const accountId = await getAccountId(publicKey);

  // Buscar balances do Midaz
  const midazBalances = await midaz.balances.list(org.id, ledger.id, accountId);

  // Buscar balances on-chain (Helius)
  const onChainBalances = await helius.getBalances(publicKey);

  // Reconciliar se necessário
  // (Midaz é source of truth para histórico, on-chain para saldo atual)

  return onChainBalances;
}
```

---

## 9. Roadmap de Execução

### 9.1 Sprint 1: Foundation

**Objetivo:** Setup completo do projeto e infraestrutura

| Task | Descrição | Acceptance Criteria |
|------|-----------|---------------------|
| Lovable Setup | Criar projeto no Lovable | Deploy preview funcionando |
| Solana Config | Instalar deps, configurar RPC | Conectar devnet OK |
| Midaz Setup | Deploy local/cloud Midaz | API respondendo |
| Design System | Implementar cores, fonts, components base | 5+ componentes prontos |
| Project Structure | Criar estrutura de pastas | Conforme seção 10 |

### 9.2 Sprint 2: Core Wallet

**Objetivo:** Funcionalidades essenciais de wallet

| Task | Descrição | Acceptance Criteria |
|------|-----------|---------------------|
| Wallet Creation | BIP39 + encrypt + store | Criar wallet funcional |
| Wallet Import | Input seed, validate, store | Import funcional |
| External Connect | Phantom/Solflare adapter | Conectar OK |
| Balance View | Fetch SOL + tokens | Mostrar saldos corretos |
| Send Transaction | Build, sign, submit | Enviar SOL OK |
| Receive | Address + QR | Copiar/scan funcional |
| Swap | Jupiter quote + execute | Swap com fee OK |
| Midaz Sync | Record txs + balances | Histórico no Midaz |

### 9.3 Sprint 3: Gamification

**Objetivo:** Sistema de gamificação completo

| Task | Descrição | Acceptance Criteria |
|------|-----------|---------------------|
| XP Engine | Calcular + persistir XP | XP incrementa corretamente |
| Level System | Thresholds + level up | Subir de level funciona |
| Achievements | Triggers + badges | 10+ achievements |
| Streaks | Login tracking + bonus | Streak conta corretamente |
| Progress UI | XP bar, level badge | UI mostra progresso |
| Celebrations | Confetti, animations | Animações funcionando |
| dApp Browser | Lista + connect | Conectar 3+ dApps |

### 9.4 Sprint 4: Polish & Ship

**Objetivo:** Qualidade production-ready

| Task | Descrição | Acceptance Criteria |
|------|-----------|---------------------|
| UI Polish | Animações, transições | UX fluida |
| Error States | Loading, error, empty | Todos estados tratados |
| PWA Config | Manifest, SW, icons | Instalável como app |
| Performance | Lazy load, optimize | < 3s first load |
| Security Review | Audit crypto, storage | Checklist 100% |
| Testing | E2E flows críticos | Tests passando |
| Deploy Prod | Domínio + deploy | App LIVE |

---

## 10. Estrutura do Projeto

```
zenwallet/
├── src/
│   ├── components/
│   │   ├── wallet/
│   │   │   ├── BalanceCard.tsx
│   │   │   ├── TokenList.tsx
│   │   │   ├── SendModal.tsx
│   │   │   ├── ReceiveModal.tsx
│   │   │   ├── SwapInterface.tsx
│   │   │   └── TransactionHistory.tsx
│   │   │
│   │   ├── gamification/
│   │   │   ├── XPBar.tsx
│   │   │   ├── LevelBadge.tsx
│   │   │   ├── AchievementPopup.tsx
│   │   │   ├── AchievementGrid.tsx
│   │   │   ├── StreakCounter.tsx
│   │   │   └── Confetti.tsx
│   │   │
│   │   ├── onboarding/
│   │   │   ├── Welcome.tsx
│   │   │   ├── CreateWallet.tsx
│   │   │   ├── ImportWallet.tsx
│   │   │   ├── BackupQuiz.tsx
│   │   │   ├── SetupPIN.tsx
│   │   │   └── ConnectExternal.tsx
│   │   │
│   │   ├── dapps/
│   │   │   ├── DAppBrowser.tsx
│   │   │   ├── DAppCard.tsx
│   │   │   └── ConnectionStatus.tsx
│   │   │
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Modal.tsx
│   │       ├── Input.tsx
│   │       ├── QRCode.tsx
│   │       ├── Toast.tsx
│   │       └── BottomNav.tsx
│   │
│   ├── hooks/
│   │   ├── useWallet.ts           # Wallet state e operações
│   │   ├── useBalance.ts          # Fetch e cache de balances
│   │   ├── useSwap.ts             # Jupiter integration
│   │   ├── useXP.ts               # XP e level logic
│   │   ├── useAchievements.ts     # Achievement triggers
│   │   ├── useStreak.ts           # Streak tracking
│   │   ├── useMidaz.ts            # Midaz API client
│   │   └── useTransaction.ts      # Send/receive logic
│   │
│   ├── lib/
│   │   ├── solana/
│   │   │   ├── connection.ts      # RPC connection setup
│   │   │   ├── keypair.ts         # Keypair generation
│   │   │   ├── transactions.ts    # Transaction builders
│   │   │   └── tokens.ts          # SPL token helpers
│   │   │
│   │   ├── crypto/
│   │   │   ├── encryption.ts      # AES-256-GCM
│   │   │   ├── keystore.ts        # IndexedDB storage
│   │   │   ├── bip39.ts           # Mnemonic helpers
│   │   │   └── pbkdf2.ts          # Key derivation
│   │   │
│   │   ├── jupiter/
│   │   │   ├── client.ts          # Jupiter API client
│   │   │   ├── quote.ts           # Get swap quotes
│   │   │   └── execute.ts         # Execute swaps
│   │   │
│   │   ├── midaz/
│   │   │   ├── client.ts          # Midaz API client
│   │   │   ├── accounts.ts        # Account management
│   │   │   ├── transactions.ts    # Transaction recording
│   │   │   └── sync.ts            # Balance sync
│   │   │
│   │   └── gamification/
│   │       ├── xp.ts              # XP calculations
│   │       ├── levels.ts          # Level thresholds
│   │       ├── achievements.ts    # Achievement definitions
│   │       └── streaks.ts         # Streak logic
│   │
│   ├── pages/
│   │   ├── index.tsx              # Home/Balance (main)
│   │   ├── onboarding/
│   │   │   ├── index.tsx          # Welcome screen
│   │   │   ├── create.tsx         # Create wallet flow
│   │   │   ├── import.tsx         # Import wallet flow
│   │   │   └── connect.tsx        # Connect external
│   │   ├── swap.tsx               # Swap interface
│   │   ├── assets.tsx             # Token list
│   │   ├── achievements.tsx       # Achievement grid
│   │   ├── dapps.tsx              # dApp browser
│   │   └── settings.tsx           # Settings page
│   │
│   ├── stores/
│   │   ├── walletStore.ts         # Zustand wallet state
│   │   ├── gamificationStore.ts   # XP, level, achievements
│   │   └── uiStore.ts             # UI state (modals, toasts)
│   │
│   ├── types/
│   │   ├── wallet.ts
│   │   ├── transaction.ts
│   │   ├── gamification.ts
│   │   └── midaz.ts
│   │
│   ├── constants/
│   │   ├── tokens.ts              # Token metadata
│   │   ├── dapps.ts               # dApp list
│   │   ├── achievements.ts        # Achievement definitions
│   │   └── config.ts              # App config
│   │
│   └── utils/
│       ├── format.ts              # Number/address formatting
│       ├── validation.ts          # Input validation
│       └── storage.ts             # LocalStorage helpers
│
├── public/
│   ├── icons/                     # App icons (PWA)
│   ├── images/                    # Achievement badges, etc
│   └── manifest.json              # PWA manifest
│
├── tests/
│   ├── unit/
│   │   ├── xp.test.ts
│   │   ├── encryption.test.ts
│   │   └── levels.test.ts
│   └── e2e/
│       ├── create-wallet.spec.ts
│       ├── swap.spec.ts
│       └── achievements.spec.ts
│
├── .env.example
├── .gitignore
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

---

## 11. Guia para Agentes Claude

### 11.1 Princípios de Desenvolvimento

```markdown
IMPORTANTE: Leia esta seção antes de implementar qualquer feature.

1. **Mobile-First**: Sempre desenvolva pensando em mobile primeiro
2. **Dark Mode Only**: MVP é dark mode, não implementar light mode
3. **Animations Matter**: Use Framer Motion para TUDO que move
4. **Security First**: Nunca log seed phrases, nunca plaintext keys
5. **Type Safety**: TypeScript strict mode, sem `any`
6. **Small Components**: Max 100 linhas por componente
7. **Hooks Pattern**: Lógica em hooks, UI em componentes
```

### 11.2 Ordem de Implementação

```markdown
SIGA ESTA ORDEM:

Sprint 1 (Foundation):
1. Setup projeto Lovable
2. Instalar todas as deps
3. Configurar Tailwind + theme
4. Criar componentes UI base (Button, Card, Modal, Input)
5. Setup Solana connection (devnet)
6. Setup Midaz client

Sprint 2 (Core Wallet):
1. Implementar lib/crypto/* (encryption, keystore)
2. Implementar lib/solana/* (connection, keypair)
3. Criar flow de onboarding (create/import)
4. Implementar BalanceCard + fetch balances
5. Implementar Send transaction
6. Implementar Receive (QR code)
7. Implementar Swap (Jupiter)
8. Integrar Midaz para histórico

Sprint 3 (Gamification):
1. Implementar XP engine (lib/gamification/xp.ts)
2. Implementar Level system
3. Criar XPBar + LevelBadge components
4. Implementar Achievements
5. Implementar Streaks
6. Criar celebration animations

Sprint 4 (Polish):
1. Adicionar todas as animações
2. Implementar error states
3. Configurar PWA
4. Otimizar performance
5. Security audit
6. Deploy
```

### 11.3 Padrões de Código

**Componentes:**
```typescript
// ✅ BOM - Componente pequeno, tipado, com animação
import { motion } from 'framer-motion';

interface XPBarProps {
  currentXP: number;
  maxXP: number;
  level: number;
}

export function XPBar({ currentXP, maxXP, level }: XPBarProps) {
  const progress = (currentXP / maxXP) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-gray-400 mb-1">
        <span>Level {level}</span>
        <span>{currentXP}/{maxXP} XP</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-solana-green to-accent-purple"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
```

**Hooks:**
```typescript
// ✅ BOM - Hook com estado, efeitos, e retorno tipado
import { useCallback, useEffect, useState } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { fetchBalances } from '@/lib/solana/tokens';

export function useBalance() {
  const { publicKey } = useWalletStore();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchBalances(publicKey);
      setBalances(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { balances, loading, error, refresh };
}
```

**Crypto (CRÍTICO):**
```typescript
// ✅ BOM - Crypto com limpeza de memória
export async function decryptKeypair(
  encryptedData: Uint8Array,
  pin: string,
  salt: Uint8Array
): Promise<Keypair> {
  // Derivar key
  const key = await deriveKey(pin, salt);

  // Decrypt
  const secretKey = await aesDecrypt(encryptedData, key);

  // Criar keypair
  const keypair = Keypair.fromSecretKey(secretKey);

  // CRÍTICO: Limpar secretKey da memória
  secretKey.fill(0);

  return keypair;
}

// ❌ RUIM - Nunca faça isso
console.log(seedPhrase); // NUNCA
localStorage.setItem('seed', mnemonic); // NUNCA
```

### 11.4 Checklist por Feature

**Antes de marcar qualquer feature como completa:**

- [ ] TypeScript compila sem erros
- [ ] Componente tem < 100 linhas
- [ ] Mobile responsivo testado
- [ ] Animações implementadas
- [ ] Estados de loading/error tratados
- [ ] Sem `any` no código
- [ ] Sem console.logs esquecidos
- [ ] Crypto: memória limpa após uso

### 11.5 APIs e Endpoints

**Solana RPC (Helius):**
```
Devnet: https://devnet.helius-rpc.com/?api-key=YOUR_KEY
Mainnet: https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

**Jupiter:**
```
Quote: https://quote-api.jup.ag/v6/quote
Swap: https://quote-api.jup.ag/v6/swap
```

**Midaz:**
```
Local: http://localhost:3000
Cloud: (configurar conforme deploy)
```

### 11.6 Variáveis de Ambiente

```env
# .env.example
VITE_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=xxx
VITE_SOLANA_NETWORK=devnet
VITE_JUPITER_API_URL=https://quote-api.jup.ag/v6
VITE_MIDAZ_API_URL=http://localhost:3000
VITE_MIDAZ_ORG_ID=xxx
VITE_MIDAZ_LEDGER_ID=xxx
VITE_SWAP_FEE_BPS=50
```

---

## Referências

- [Phantom Wallet](https://phantom.app/) - Benchmark principal
- [Revolut Gamification](https://strivecloud.io/blog/gamification-examples-revolut/) - Benchmark gamificação
- [Solana Wallet Adapter](https://solana.com/developers/cookbook/wallets/connect-wallet-react) - Documentação oficial
- [Jupiter SDK](https://station.jup.ag/docs) - Swap integration
- [Midaz Documentation](https://docs.lerian.studio) - Ledger integration
- [Framer Motion](https://www.framer.com/motion/) - Animações

---

## Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0.0 | 2025-12-26 | MasterPlan inicial completo |

---

**🚀 Let's build the future of crypto for the next generation!**
