# ZenWallet Implementation Plan

> Plano de implementação detalhado com tarefas bite-sized (2-5 min cada)

**Documento de Referência:** `/Users/lucasbertol/zenwallet/MASTERPLAN.md`

---

## Metadata

| Campo | Valor |
|-------|-------|
| **Projeto** | ZenWallet - Crypto Wallet Gamificada |
| **Stack** | React + TypeScript + Tailwind + Solana + Midaz |
| **Plataforma** | PWA (Lovable) |
| **Data** | 2025-12-26 |

---

## Prerequisites

Antes de iniciar, certifique-se de ter:

- [ ] Node.js 18+ instalado
- [ ] Conta no Lovable (https://lovable.dev)
- [ ] API Key do Helius (https://helius.dev) - free tier OK
- [ ] Midaz rodando localmente ou na cloud

---

## Sprint 1: Foundation

### Batch 1.1: Project Setup (Lovable)

---

#### Task 1.1.1: Criar projeto no Lovable

**Objetivo:** Iniciar projeto React + TypeScript + Tailwind no Lovable

**Ação Manual:**
1. Acesse https://lovable.dev
2. Clique "New Project"
3. Nome: `ZenWallet`
4. Template: `React + TypeScript + Tailwind`
5. Clique "Create"

**Verificação:**
- Preview do Lovable mostra app React rodando
- Consegue editar código e ver hot reload

**Tempo estimado:** 2 min

---

#### Task 1.1.2: Instalar dependências Solana

**Arquivo:** `package.json` (via terminal Lovable ou local)

**Comando:**
```bash
npm install @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/wallet-adapter-base
```

**Verificação:**
```bash
npm list @solana/web3.js
# Deve mostrar: @solana/web3.js@1.95.x
```

**Tempo estimado:** 2 min

---

#### Task 1.1.3: Instalar dependências Crypto/Utils

**Comando:**
```bash
npm install bip39 tweetnacl zustand framer-motion @jup-ag/api qrcode.react
```

**Verificação:**
```bash
npm list bip39 tweetnacl zustand
# Deve mostrar todas as versões
```

**Tempo estimado:** 2 min

---

#### Task 1.1.4: Instalar tipos TypeScript

**Comando:**
```bash
npm install -D @types/bip39
```

**Verificação:**
```bash
npm list @types/bip39
```

**Tempo estimado:** 1 min

---

### Batch 1.2: Design System

---

#### Task 1.2.1: Configurar cores no Tailwind

**Arquivo:** `tailwind.config.js`

**Código completo:**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base
        'bg-primary': '#0A0A0B',
        'bg-secondary': '#141416',
        'bg-tertiary': '#1C1C1F',

        // Brand
        'solana-green': '#14F195',
        'accent-purple': '#9945FF',

        // Semantic
        'success': '#19FB9B',
        'error': '#FF6B6B',
        'warning': '#FFB547',

        // Text
        'text-primary': '#FFFFFF',
        'text-secondary': '#A0A0A0',
        'text-muted': '#666666',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-xp': 'linear-gradient(90deg, #14F195 0%, #9945FF 100%)',
        'gradient-card': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(20, 241, 149, 0.3)',
        'glow-purple': '0 0 20px rgba(153, 69, 255, 0.3)',
      },
    },
  },
  plugins: [],
}
```

**Verificação:**
```bash
# Adicionar classe bg-bg-primary a qualquer elemento
# Deve renderizar com cor #0A0A0B
```

**Tempo estimado:** 3 min

---

#### Task 1.2.2: Configurar CSS global

**Arquivo:** `src/index.css`

**Código completo:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Inter', system-ui, sans-serif;
  }

  body {
    @apply bg-bg-primary text-text-primary min-h-screen;
  }
}

@layer components {
  .text-display {
    @apply font-bold text-5xl leading-tight;
  }

  .text-heading {
    @apply font-semibold text-2xl;
  }

  .text-body {
    @apply font-normal text-base;
  }

  .text-mono {
    @apply font-mono text-sm;
  }

  .card {
    @apply bg-gradient-card rounded-2xl p-6 shadow-lg;
  }

  .btn-primary {
    @apply bg-solana-green text-bg-primary font-semibold py-3 px-6 rounded-xl
           hover:shadow-glow-green transition-all duration-200
           active:scale-95;
  }

  .btn-secondary {
    @apply bg-bg-tertiary text-text-primary font-medium py-3 px-6 rounded-xl
           border border-text-muted/20 hover:border-solana-green/50
           transition-all duration-200 active:scale-95;
  }
}
```

**Verificação:**
- Abrir app no browser
- Background deve ser escuro (#0A0A0B)
- Texto deve ser branco

**Tempo estimado:** 3 min

---

#### Task 1.2.3: Criar componente Button

**Arquivo:** `src/components/ui/Button.tsx`

**Código completo:**
```typescript
import { motion } from 'framer-motion';
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  isLoading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2';

  const variants = {
    primary: 'bg-solana-green text-bg-primary hover:shadow-glow-green',
    secondary: 'bg-bg-tertiary text-text-primary border border-text-muted/20 hover:border-solana-green/50',
    ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
  };

  const sizes = {
    sm: 'py-2 px-4 text-sm',
    md: 'py-3 px-6 text-base',
    lg: 'py-4 px-8 text-lg',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} ${
        (disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </motion.button>
  );
}
```

**Verificação:**
```typescript
// Em qualquer componente:
import { Button } from '@/components/ui/Button';

<Button variant="primary">Test</Button>
// Deve renderizar botão verde com hover glow
```

**Tempo estimado:** 4 min

---

#### Task 1.2.4: Criar componente Card

**Arquivo:** `src/components/ui/Card.tsx`

**Código completo:**
```typescript
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
}

export function Card({ children, className = '', animate = true }: CardProps) {
  const Wrapper = animate ? motion.div : 'div';

  const animationProps = animate ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  } : {};

  return (
    <Wrapper
      className={`bg-gradient-card rounded-2xl p-6 shadow-lg ${className}`}
      {...animationProps}
    >
      {children}
    </Wrapper>
  );
}
```

**Verificação:**
```typescript
import { Card } from '@/components/ui/Card';

<Card>Content here</Card>
// Deve renderizar card com gradient e animação de entrada
```

**Tempo estimado:** 3 min

---

#### Task 1.2.5: Criar componente Modal

**Arquivo:** `src/components/ui/Modal.tsx`

**Código completo:**
```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
          >
            <div className="bg-bg-secondary rounded-2xl p-6 shadow-2xl">
              {title && (
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-heading">{title}</h2>
                  <button
                    onClick={onClose}
                    className="text-text-muted hover:text-text-primary transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

**Verificação:**
```typescript
const [isOpen, setIsOpen] = useState(false);

<Button onClick={() => setIsOpen(true)}>Open Modal</Button>
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Test">
  Modal content
</Modal>
// Deve abrir modal com backdrop blur e fechar com X ou Escape
```

**Tempo estimado:** 5 min

---

#### Task 1.2.6: Criar componente Input

**Arquivo:** `src/components/ui/Input.tsx`

**Código completo:**
```typescript
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, rightElement, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm text-text-secondary mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={`
              w-full bg-bg-tertiary border border-text-muted/20 rounded-xl
              py-3 px-4 text-text-primary placeholder:text-text-muted
              focus:outline-none focus:border-solana-green/50 focus:ring-1 focus:ring-solana-green/20
              transition-all duration-200
              ${error ? 'border-error' : ''}
              ${rightElement ? 'pr-12' : ''}
              ${className}
            `}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="text-error text-sm mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

**Verificação:**
```typescript
<Input label="Amount" placeholder="0.00" error="Invalid amount" />
// Deve renderizar input estilizado com label e error message
```

**Tempo estimado:** 4 min

---

#### Task 1.2.7: Criar componente BottomNav

**Arquivo:** `src/components/ui/BottomNav.tsx`

**Código completo:**
```typescript
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    path: '/',
    label: 'Home',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    path: '/assets',
    label: 'Assets',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    path: '/swap',
    label: 'Swap',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    path: '/achievements',
    label: 'Achieve',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-secondary/95 backdrop-blur-lg border-t border-text-muted/10 px-4 py-2 safe-area-bottom">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.9 }}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors ${
                isActive
                  ? 'text-solana-green'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 w-1 h-1 bg-solana-green rounded-full"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
```

**Verificação:**
- Renderizar BottomNav no layout principal
- Clicar em cada item deve navegar para a rota correspondente
- Item ativo deve ter cor verde

**Tempo estimado:** 5 min

---

### Batch 1.3: Solana Setup

---

#### Task 1.3.1: Criar connection helper

**Arquivo:** `src/lib/solana/connection.ts`

**Código completo:**
```typescript
import { Connection, clusterApiUrl } from '@solana/web3.js';

const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY || '';
const NETWORK = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';

function getRpcUrl(): string {
  if (HELIUS_API_KEY) {
    const cluster = NETWORK === 'mainnet-beta' ? 'mainnet' : 'devnet';
    return `https://${cluster}.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  }
  return clusterApiUrl(NETWORK as 'devnet' | 'mainnet-beta');
}

// Singleton connection
let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(getRpcUrl(), {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
  }
  return connection;
}

export function getExplorerUrl(signature: string): string {
  const cluster = NETWORK === 'mainnet-beta' ? '' : `?cluster=${NETWORK}`;
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}

export function getAddressExplorerUrl(address: string): string {
  const cluster = NETWORK === 'mainnet-beta' ? '' : `?cluster=${NETWORK}`;
  return `https://explorer.solana.com/address/${address}${cluster}`;
}
```

**Verificação:**
```typescript
import { getConnection } from '@/lib/solana/connection';

const conn = getConnection();
const version = await conn.getVersion();
console.log('Solana version:', version);
// Deve logar algo como { 'solana-core': '1.18.x', ... }
```

**Tempo estimado:** 3 min

---

#### Task 1.3.2: Criar arquivo de variáveis de ambiente

**Arquivo:** `.env.example`

**Código completo:**
```env
# Solana
VITE_SOLANA_NETWORK=devnet
VITE_HELIUS_API_KEY=your-helius-api-key-here

# Jupiter
VITE_JUPITER_API_URL=https://quote-api.jup.ag/v6

# Midaz
VITE_MIDAZ_API_URL=http://localhost:3000
VITE_MIDAZ_ORG_ID=
VITE_MIDAZ_LEDGER_ID=

# App
VITE_SWAP_FEE_BPS=50
```

**Verificação:**
```bash
cp .env.example .env.local
# Editar .env.local com valores reais
```

**Tempo estimado:** 2 min

---

#### Task 1.3.3: Criar Solana Provider wrapper

**Arquivo:** `src/providers/SolanaProvider.tsx`

**Código completo:**
```typescript
import { ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaProviderProps {
  children: ReactNode;
}

export function SolanaProvider({ children }: SolanaProviderProps) {
  const network = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
  const heliusKey = import.meta.env.VITE_HELIUS_API_KEY;

  const endpoint = useMemo(() => {
    if (heliusKey) {
      const cluster = network === 'mainnet-beta' ? 'mainnet' : 'devnet';
      return `https://${cluster}.helius-rpc.com/?api-key=${heliusKey}`;
    }
    return clusterApiUrl(network as 'devnet' | 'mainnet-beta');
  }, [network, heliusKey]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

**Verificação:**
- Wrap App com SolanaProvider
- Não deve haver erros no console
- WalletModalProvider deve estar disponível

**Tempo estimado:** 4 min

---

### 📋 Code Review Checkpoint: Batch 1

**Antes de continuar para Sprint 2:**

- [ ] Projeto Lovable criado e funcionando
- [ ] Todas as dependências instaladas
- [ ] Tailwind configurado com cores custom
- [ ] 5 componentes UI criados (Button, Card, Modal, Input, BottomNav)
- [ ] Solana connection funcionando
- [ ] SolanaProvider configurado

**Comando de verificação geral:**
```bash
npm run build
# Deve compilar sem erros
```

---

## Sprint 2: Core Wallet

### Batch 2.1: Crypto Library

---

#### Task 2.1.1: Implementar PBKDF2 key derivation

**Arquivo:** `src/lib/crypto/pbkdf2.ts`

**Código completo:**
```typescript
const ITERATIONS = 100000;
const KEY_LENGTH = 256;

export async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES-GCM key
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );

  return key;
}

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}
```

**Verificação:**
```typescript
import { deriveKey, generateSalt } from '@/lib/crypto/pbkdf2';

const salt = generateSalt();
const key = await deriveKey('123456', salt);
console.log('Key derived:', key);
// Deve retornar CryptoKey object
```

**Tempo estimado:** 4 min

---

#### Task 2.1.2: Implementar AES-256-GCM encryption

**Arquivo:** `src/lib/crypto/encryption.ts`

**Código completo:**
```typescript
const IV_LENGTH = 12;

export async function encrypt(
  data: Uint8Array,
  key: CryptoKey
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data
  );

  // Prepend IV to encrypted data
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);

  return result;
}

export async function decrypt(
  encryptedData: Uint8Array,
  key: CryptoKey
): Promise<Uint8Array> {
  // Extract IV from beginning
  const iv = encryptedData.slice(0, IV_LENGTH);
  const data = encryptedData.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data
  );

  return new Uint8Array(decrypted);
}
```

**Verificação:**
```typescript
import { encrypt, decrypt } from '@/lib/crypto/encryption';
import { deriveKey, generateSalt } from '@/lib/crypto/pbkdf2';

const salt = generateSalt();
const key = await deriveKey('123456', salt);
const original = new TextEncoder().encode('secret data');

const encrypted = await encrypt(original, key);
const decrypted = await decrypt(encrypted, key);

console.log('Match:', new TextDecoder().decode(decrypted) === 'secret data');
// Deve logar: Match: true
```

**Tempo estimado:** 4 min

---

#### Task 2.1.3: Implementar BIP39 helpers

**Arquivo:** `src/lib/crypto/bip39.ts`

**Código completo:**
```typescript
import * as bip39 from 'bip39';
import { Keypair } from '@solana/web3.js';

export function generateMnemonic(strength: 128 | 256 = 128): string {
  return bip39.generateMnemonic(strength);
}

export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
}

export function mnemonicToKeypair(mnemonic: string): Keypair {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic');
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic);
  // Use first 32 bytes for Solana keypair
  return Keypair.fromSeed(seed.slice(0, 32));
}

export function formatMnemonicForDisplay(mnemonic: string): string[] {
  return mnemonic.split(' ');
}

export function mnemonicFromWords(words: string[]): string {
  return words.join(' ').toLowerCase().trim();
}
```

**Verificação:**
```typescript
import { generateMnemonic, mnemonicToKeypair, validateMnemonic } from '@/lib/crypto/bip39';

const mnemonic = generateMnemonic();
console.log('Mnemonic:', mnemonic);
console.log('Valid:', validateMnemonic(mnemonic));

const keypair = mnemonicToKeypair(mnemonic);
console.log('Public key:', keypair.publicKey.toBase58());
// Deve gerar 12 palavras e derivar keypair válido
```

**Tempo estimado:** 4 min

---

#### Task 2.1.4: Implementar IndexedDB keystore

**Arquivo:** `src/lib/crypto/keystore.ts`

**Código completo:**
```typescript
const DB_NAME = 'zenwallet-keystore';
const DB_VERSION = 1;
const STORE_NAME = 'wallets';

interface StoredWallet {
  id: string;
  publicKey: string;
  encryptedSecretKey: string; // Base64 encoded
  salt: string; // Base64 encoded
  createdAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveWallet(
  publicKey: string,
  encryptedSecretKey: Uint8Array,
  salt: Uint8Array
): Promise<void> {
  const db = await openDB();

  const wallet: StoredWallet = {
    id: publicKey,
    publicKey,
    encryptedSecretKey: uint8ArrayToBase64(encryptedSecretKey),
    salt: uint8ArrayToBase64(salt),
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(wallet);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getWallet(publicKey: string): Promise<{
  encryptedSecretKey: Uint8Array;
  salt: Uint8Array;
} | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(publicKey);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const wallet = request.result as StoredWallet | undefined;
      if (!wallet) {
        resolve(null);
        return;
      }
      resolve({
        encryptedSecretKey: base64ToUint8Array(wallet.encryptedSecretKey),
        salt: base64ToUint8Array(wallet.salt),
      });
    };
  });
}

export async function getAllWallets(): Promise<string[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAllKeys();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as string[]);
  });
}

export async function deleteWallet(publicKey: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(publicKey);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Helpers
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
```

**Verificação:**
```typescript
import { saveWallet, getWallet, getAllWallets } from '@/lib/crypto/keystore';

// Salvar
await saveWallet('ABC123', new Uint8Array([1,2,3]), new Uint8Array([4,5,6]));

// Recuperar
const wallet = await getWallet('ABC123');
console.log('Retrieved:', wallet);

// Listar
const all = await getAllWallets();
console.log('All wallets:', all);
```

**Tempo estimado:** 5 min

---

### Batch 2.2: Wallet Store

---

#### Task 2.2.1: Criar Zustand wallet store

**Arquivo:** `src/stores/walletStore.ts`

**Código completo:**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Keypair, PublicKey } from '@solana/web3.js';
import { generateMnemonic, mnemonicToKeypair, validateMnemonic } from '@/lib/crypto/bip39';
import { deriveKey, generateSalt } from '@/lib/crypto/pbkdf2';
import { encrypt, decrypt } from '@/lib/crypto/encryption';
import { saveWallet, getWallet, getAllWallets, deleteWallet } from '@/lib/crypto/keystore';

export type WalletType = 'internal' | 'external';

interface WalletState {
  // State
  publicKey: string | null;
  walletType: WalletType | null;
  isUnlocked: boolean;
  isLoading: boolean;
  error: string | null;

  // Internal keypair (only when unlocked)
  _keypair: Keypair | null;

  // Actions
  createWallet: (pin: string) => Promise<string[]>;
  importWallet: (mnemonic: string, pin: string) => Promise<void>;
  unlockWallet: (pin: string) => Promise<void>;
  lockWallet: () => void;
  setExternalWallet: (publicKey: string) => void;
  clearWallet: () => Promise<void>;
  getKeypair: () => Keypair | null;

  // Helpers
  hasWallet: () => Promise<boolean>;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      publicKey: null,
      walletType: null,
      isUnlocked: false,
      isLoading: false,
      error: null,
      _keypair: null,

      createWallet: async (pin: string) => {
        set({ isLoading: true, error: null });

        try {
          // Generate mnemonic
          const mnemonic = generateMnemonic();
          const words = mnemonic.split(' ');

          // Derive keypair
          const keypair = mnemonicToKeypair(mnemonic);
          const publicKey = keypair.publicKey.toBase58();

          // Encrypt and store
          const salt = generateSalt();
          const key = await deriveKey(pin, salt);
          const encrypted = await encrypt(keypair.secretKey, key);

          await saveWallet(publicKey, encrypted, salt);

          set({
            publicKey,
            walletType: 'internal',
            isUnlocked: true,
            _keypair: keypair,
            isLoading: false,
          });

          return words;
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      importWallet: async (mnemonic: string, pin: string) => {
        set({ isLoading: true, error: null });

        try {
          if (!validateMnemonic(mnemonic)) {
            throw new Error('Invalid seed phrase');
          }

          const keypair = mnemonicToKeypair(mnemonic);
          const publicKey = keypair.publicKey.toBase58();

          const salt = generateSalt();
          const key = await deriveKey(pin, salt);
          const encrypted = await encrypt(keypair.secretKey, key);

          await saveWallet(publicKey, encrypted, salt);

          set({
            publicKey,
            walletType: 'internal',
            isUnlocked: true,
            _keypair: keypair,
            isLoading: false,
          });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      unlockWallet: async (pin: string) => {
        const { publicKey } = get();
        if (!publicKey) throw new Error('No wallet to unlock');

        set({ isLoading: true, error: null });

        try {
          const stored = await getWallet(publicKey);
          if (!stored) throw new Error('Wallet not found');

          const key = await deriveKey(pin, stored.salt);
          const decrypted = await decrypt(stored.encryptedSecretKey, key);

          const keypair = Keypair.fromSecretKey(decrypted);

          // Verify public key matches
          if (keypair.publicKey.toBase58() !== publicKey) {
            throw new Error('Invalid PIN');
          }

          set({
            isUnlocked: true,
            _keypair: keypair,
            isLoading: false,
          });
        } catch (error) {
          set({ error: 'Invalid PIN', isLoading: false });
          throw new Error('Invalid PIN');
        }
      },

      lockWallet: () => {
        const { _keypair } = get();

        // Clear secret key from memory
        if (_keypair) {
          _keypair.secretKey.fill(0);
        }

        set({
          isUnlocked: false,
          _keypair: null,
        });
      },

      setExternalWallet: (publicKey: string) => {
        set({
          publicKey,
          walletType: 'external',
          isUnlocked: true,
          _keypair: null,
        });
      },

      clearWallet: async () => {
        const { publicKey, _keypair } = get();

        if (_keypair) {
          _keypair.secretKey.fill(0);
        }

        if (publicKey) {
          await deleteWallet(publicKey);
        }

        set({
          publicKey: null,
          walletType: null,
          isUnlocked: false,
          _keypair: null,
          error: null,
        });
      },

      getKeypair: () => {
        const { _keypair, isUnlocked } = get();
        if (!isUnlocked || !_keypair) return null;
        return _keypair;
      },

      hasWallet: async () => {
        const wallets = await getAllWallets();
        return wallets.length > 0;
      },
    }),
    {
      name: 'zenwallet-store',
      partialize: (state) => ({
        publicKey: state.publicKey,
        walletType: state.walletType,
      }),
    }
  )
);
```

**Verificação:**
```typescript
import { useWalletStore } from '@/stores/walletStore';

// Criar wallet
const words = await useWalletStore.getState().createWallet('123456');
console.log('Created wallet with words:', words);

// Lock
useWalletStore.getState().lockWallet();

// Unlock
await useWalletStore.getState().unlockWallet('123456');
console.log('Unlocked:', useWalletStore.getState().isUnlocked);
```

**Tempo estimado:** 8 min

---

### Batch 2.3: Onboarding Flow

---

#### Task 2.3.1: Criar tela Welcome

**Arquivo:** `src/pages/onboarding/index.tsx`

**Código completo:**
```typescript
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 pb-12">
      {/* Logo & Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-16 text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-xp flex items-center justify-center">
          <span className="text-4xl">⚡</span>
        </div>
        <h1 className="text-display mb-2">ZenWallet</h1>
        <p className="text-text-secondary text-lg">
          Crypto made fun. For real.
        </p>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4 my-12"
      >
        {[
          { icon: '🎮', text: 'Earn XP with every transaction' },
          { icon: '🚀', text: 'Swap tokens instantly' },
          { icon: '🔒', text: 'Your keys, your crypto' },
        ].map((feature, i) => (
          <div
            key={i}
            className="flex items-center gap-4 bg-bg-secondary/50 rounded-xl p-4"
          >
            <span className="text-2xl">{feature.icon}</span>
            <span className="text-text-secondary">{feature.text}</span>
          </div>
        ))}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => navigate('/onboarding/create')}
        >
          Create New Wallet
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => navigate('/onboarding/import')}
        >
          Import Existing Wallet
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="w-full"
          onClick={() => navigate('/onboarding/connect')}
        >
          Connect Phantom/Solflare
        </Button>
      </motion.div>
    </div>
  );
}
```

**Verificação:**
- Navegar para /onboarding
- Deve mostrar logo, título, features e 3 botões
- Animações devem funcionar

**Tempo estimado:** 5 min

---

#### Task 2.3.2: Criar tela Create Wallet (Step 1 - Generate)

**Arquivo:** `src/pages/onboarding/create.tsx`

**Código completo:**
```typescript
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useWalletStore } from '@/stores/walletStore';

type Step = 'generate' | 'backup' | 'verify' | 'pin';

export default function CreateWalletPage() {
  const navigate = useNavigate();
  const { createWallet, isLoading } = useWalletStore();

  const [step, setStep] = useState<Step>('generate');
  const [words, setWords] = useState<string[]>([]);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Verification state
  const [verifyIndices, setVerifyIndices] = useState<number[]>([]);
  const [verifyInputs, setVerifyInputs] = useState<Record<number, string>>({});
  const [verifyError, setVerifyError] = useState('');

  const handleGenerate = () => {
    // Will generate when PIN is set
    setStep('pin');
  };

  const handlePinSubmit = async () => {
    setPinError('');

    if (pin.length < 6) {
      setPinError('PIN must be at least 6 characters');
      return;
    }

    if (pin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }

    try {
      const generatedWords = await createWallet(pin);
      setWords(generatedWords);
      setStep('backup');
    } catch (error) {
      setPinError((error as Error).message);
    }
  };

  const handleBackupComplete = () => {
    // Select 3 random indices for verification
    const indices: number[] = [];
    while (indices.length < 3) {
      const idx = Math.floor(Math.random() * 12);
      if (!indices.includes(idx)) indices.push(idx);
    }
    indices.sort((a, b) => a - b);
    setVerifyIndices(indices);
    setStep('verify');
  };

  const handleVerify = () => {
    setVerifyError('');

    for (const idx of verifyIndices) {
      if (verifyInputs[idx]?.toLowerCase().trim() !== words[idx]) {
        setVerifyError(`Word ${idx + 1} is incorrect`);
        return;
      }
    }

    // Success!
    navigate('/');
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-text-muted hover:text-text-primary"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-heading ml-4">Create Wallet</h1>
      </div>

      {/* Step: PIN */}
      {step === 'pin' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <p className="text-text-secondary mb-6">
            Set a PIN to secure your wallet. You'll need this to unlock your wallet.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary mb-2 block">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter 6+ digit PIN"
                className="w-full bg-bg-tertiary border border-text-muted/20 rounded-xl py-3 px-4 text-text-primary"
              />
            </div>

            <div>
              <label className="text-sm text-text-secondary mb-2 block">Confirm PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Confirm PIN"
                className="w-full bg-bg-tertiary border border-text-muted/20 rounded-xl py-3 px-4 text-text-primary"
              />
            </div>

            {pinError && (
              <p className="text-error text-sm">{pinError}</p>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full mt-6"
              onClick={handlePinSubmit}
              isLoading={isLoading}
            >
              Create Wallet
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step: Backup */}
      {step === 'backup' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-6">
            <p className="text-warning text-sm">
              ⚠️ Write down these words in order. This is the ONLY way to recover your wallet.
            </p>
          </div>

          <Card className="mb-6">
            <div className="grid grid-cols-3 gap-3">
              {words.map((word, i) => (
                <div
                  key={i}
                  className="bg-bg-tertiary rounded-lg p-3 text-center"
                >
                  <span className="text-text-muted text-xs">{i + 1}.</span>
                  <span className="text-text-primary ml-1 font-mono">{word}</span>
                </div>
              ))}
            </div>
          </Card>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleBackupComplete}
          >
            I've Written It Down
          </Button>
        </motion.div>
      )}

      {/* Step: Verify */}
      {step === 'verify' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <p className="text-text-secondary mb-6">
            Verify your backup by entering the requested words.
          </p>

          <div className="space-y-4">
            {verifyIndices.map((idx) => (
              <div key={idx}>
                <label className="text-sm text-text-secondary mb-2 block">
                  Word #{idx + 1}
                </label>
                <input
                  type="text"
                  value={verifyInputs[idx] || ''}
                  onChange={(e) => setVerifyInputs({ ...verifyInputs, [idx]: e.target.value })}
                  placeholder={`Enter word ${idx + 1}`}
                  className="w-full bg-bg-tertiary border border-text-muted/20 rounded-xl py-3 px-4 text-text-primary font-mono"
                />
              </div>
            ))}

            {verifyError && (
              <p className="text-error text-sm">{verifyError}</p>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full mt-6"
              onClick={handleVerify}
            >
              Verify & Complete
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
```

**Verificação:**
- Navegar para /onboarding/create
- Definir PIN → Gerar seed phrase → Ver 12 palavras
- Verificar 3 palavras aleatórias
- Deve redirecionar para / após sucesso

**Tempo estimado:** 10 min

---

#### Task 2.3.3: Criar tela Import Wallet

**Arquivo:** `src/pages/onboarding/import.tsx`

**Código completo:**
```typescript
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useWalletStore } from '@/stores/walletStore';
import { validateMnemonic } from '@/lib/crypto/bip39';

export default function ImportWalletPage() {
  const navigate = useNavigate();
  const { importWallet, isLoading } = useWalletStore();

  const [step, setStep] = useState<'seed' | 'pin'>('seed');
  const [words, setWords] = useState<string[]>(Array(12).fill(''));
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...words];
    newWords[index] = value.toLowerCase().trim();
    setWords(newWords);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const pastedWords = pasted.trim().toLowerCase().split(/\s+/);

    if (pastedWords.length === 12 || pastedWords.length === 24) {
      setWords(pastedWords.slice(0, 12));
    }
  };

  const handleSeedSubmit = () => {
    setError('');
    const mnemonic = words.join(' ');

    if (!validateMnemonic(mnemonic)) {
      setError('Invalid seed phrase. Please check your words.');
      return;
    }

    setStep('pin');
  };

  const handlePinSubmit = async () => {
    setError('');

    if (pin.length < 6) {
      setError('PIN must be at least 6 characters');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    try {
      const mnemonic = words.join(' ');
      await importWallet(mnemonic, pin);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-text-muted hover:text-text-primary"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-heading ml-4">Import Wallet</h1>
      </div>

      {step === 'seed' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <p className="text-text-secondary mb-6">
            Enter your 12-word recovery phrase.
          </p>

          <div
            className="grid grid-cols-3 gap-2 mb-6"
            onPaste={handlePaste}
          >
            {words.map((word, i) => (
              <div key={i} className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">
                  {i + 1}.
                </span>
                <input
                  type="text"
                  value={word}
                  onChange={(e) => handleWordChange(i, e.target.value)}
                  className="w-full bg-bg-tertiary border border-text-muted/20 rounded-lg py-2 pl-8 pr-2 text-sm text-text-primary font-mono"
                />
              </div>
            ))}
          </div>

          {error && (
            <p className="text-error text-sm mb-4">{error}</p>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleSeedSubmit}
          >
            Continue
          </Button>
        </motion.div>
      )}

      {step === 'pin' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <p className="text-text-secondary mb-6">
            Set a PIN to secure your wallet.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary mb-2 block">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter 6+ digit PIN"
                className="w-full bg-bg-tertiary border border-text-muted/20 rounded-xl py-3 px-4 text-text-primary"
              />
            </div>

            <div>
              <label className="text-sm text-text-secondary mb-2 block">Confirm PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Confirm PIN"
                className="w-full bg-bg-tertiary border border-text-muted/20 rounded-xl py-3 px-4 text-text-primary"
              />
            </div>

            {error && (
              <p className="text-error text-sm">{error}</p>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full mt-6"
              onClick={handlePinSubmit}
              isLoading={isLoading}
            >
              Import Wallet
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
```

**Verificação:**
- Navegar para /onboarding/import
- Colar ou digitar 12 palavras válidas
- Definir PIN
- Deve importar e redirecionar para /

**Tempo estimado:** 7 min

---

### 📋 Code Review Checkpoint: Batch 2

**Antes de continuar:**

- [ ] Crypto library implementada (PBKDF2, AES-GCM, BIP39, Keystore)
- [ ] Wallet store funcional (create, import, lock, unlock)
- [ ] Onboarding flow completo (welcome, create, import)
- [ ] Seed phrase backup e verificação funcionando

**Teste crítico:**
```typescript
// 1. Criar wallet
const words = await createWallet('123456');

// 2. Lock
lockWallet();

// 3. Unlock com PIN errado - deve falhar
try {
  await unlockWallet('wrong');
} catch (e) {
  console.log('Expected error:', e);
}

// 4. Unlock com PIN correto
await unlockWallet('123456');
console.log('Success!');
```

---

## Sprint 3: Gamification

> **Nota:** Este sprint contém as tarefas para XP, Levels, Achievements e Streaks.
> Veja MASTERPLAN.md seção 5 para especificações completas.

### Batch 3.1: XP Engine

---

#### Task 3.1.1: Criar tipos de gamificação

**Arquivo:** `src/types/gamification.ts`

**Código completo:**
```typescript
export interface XPAction {
  type: 'first_login' | 'daily_login' | 'send' | 'receive' | 'swap' | 'connect_dapp';
  xp: number;
}

export const XP_VALUES: Record<XPAction['type'], number> = {
  first_login: 50,
  daily_login: 10,
  send: 25,
  receive: 15,
  swap: 50,
  connect_dapp: 30,
};

export interface Level {
  number: number;
  title: string;
  minXP: number;
  maxXP: number;
}

export const LEVELS: Level[] = [
  { number: 1, title: 'Noob', minXP: 0, maxXP: 100 },
  { number: 2, title: 'Noob', minXP: 100, maxXP: 250 },
  { number: 3, title: 'Noob', minXP: 250, maxXP: 450 },
  { number: 4, title: 'Noob', minXP: 450, maxXP: 700 },
  { number: 5, title: 'Noob', minXP: 700, maxXP: 1000 },
  { number: 6, title: 'Crypto Curious', minXP: 1000, maxXP: 1400 },
  { number: 7, title: 'Crypto Curious', minXP: 1400, maxXP: 1900 },
  { number: 8, title: 'Crypto Curious', minXP: 1900, maxXP: 2500 },
  { number: 9, title: 'Crypto Curious', minXP: 2500, maxXP: 3200 },
  { number: 10, title: 'Crypto Curious', minXP: 3200, maxXP: 4000 },
  { number: 11, title: 'DeFi Explorer', minXP: 4000, maxXP: 5000 },
  { number: 12, title: 'DeFi Explorer', minXP: 5000, maxXP: 6200 },
  { number: 13, title: 'DeFi Explorer', minXP: 6200, maxXP: 7600 },
  { number: 14, title: 'DeFi Explorer', minXP: 7600, maxXP: 9200 },
  { number: 15, title: 'DeFi Explorer', minXP: 9200, maxXP: 11000 },
  { number: 16, title: 'Whale', minXP: 11000, maxXP: 13500 },
  { number: 17, title: 'Whale', minXP: 13500, maxXP: 16500 },
  { number: 18, title: 'Whale', minXP: 16500, maxXP: 20000 },
  { number: 19, title: 'Whale', minXP: 20000, maxXP: 25000 },
  { number: 20, title: 'Whale', minXP: 25000, maxXP: Infinity },
];

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpBonus: number;
  condition: (stats: UserStats) => boolean;
}

export interface UserStats {
  totalTransactions: number;
  totalSwaps: number;
  dappsConnected: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  walletCreatedAt: string;
}

export interface Streak {
  current: number;
  longest: number;
  lastLoginDate: string;
}
```

**Tempo estimado:** 5 min

---

#### Task 3.1.2: Criar gamification store

**Arquivo:** `src/stores/gamificationStore.ts`

**Código completo:**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { XP_VALUES, LEVELS, Level, Achievement, Streak, UserStats } from '@/types/gamification';

interface GamificationState {
  // State
  xp: number;
  level: number;
  achievements: string[]; // IDs of unlocked achievements
  streak: Streak;
  stats: UserStats;

  // Pending notifications
  pendingXP: number | null;
  pendingLevelUp: number | null;
  pendingAchievement: Achievement | null;

  // Actions
  addXP: (action: keyof typeof XP_VALUES) => void;
  checkStreak: () => void;
  incrementStat: (stat: keyof UserStats) => void;
  clearNotification: (type: 'xp' | 'level' | 'achievement') => void;

  // Getters
  getCurrentLevel: () => Level;
  getXPProgress: () => { current: number; max: number; percent: number };
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Create your first wallet',
    icon: '🚀',
    xpBonus: 100,
    condition: () => true, // Triggered on wallet creation
  },
  {
    id: 'first_send',
    name: 'First Send',
    description: 'Send your first transaction',
    icon: '💸',
    xpBonus: 50,
    condition: (stats) => stats.totalTransactions >= 1,
  },
  {
    id: 'swap_master',
    name: 'Swap Master',
    description: 'Complete your first swap',
    icon: '🔄',
    xpBonus: 50,
    condition: (stats) => stats.totalSwaps >= 1,
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: '7 day login streak',
    icon: '📅',
    xpBonus: 100,
    condition: (stats) => stats.currentStreak >= 7,
  },
  {
    id: 'monthly_legend',
    name: 'Monthly Legend',
    description: '30 day login streak',
    icon: '🔥',
    xpBonus: 500,
    condition: (stats) => stats.currentStreak >= 30,
  },
  {
    id: 'transaction_pro',
    name: 'Transaction Pro',
    description: '100 transactions',
    icon: '🎯',
    xpBonus: 300,
    condition: (stats) => stats.totalTransactions >= 100,
  },
  {
    id: 'dapp_explorer',
    name: 'dApp Explorer',
    description: 'Connect 5 dApps',
    icon: '🌐',
    xpBonus: 150,
    condition: (stats) => stats.dappsConnected >= 5,
  },
];

function calculateLevel(xp: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) {
      return LEVELS[i].number;
    }
  }
  return 1;
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      xp: 0,
      level: 1,
      achievements: [],
      streak: {
        current: 0,
        longest: 0,
        lastLoginDate: '',
      },
      stats: {
        totalTransactions: 0,
        totalSwaps: 0,
        dappsConnected: 0,
        currentStreak: 0,
        longestStreak: 0,
        level: 1,
        walletCreatedAt: '',
      },
      pendingXP: null,
      pendingLevelUp: null,
      pendingAchievement: null,

      addXP: (action) => {
        const xpGain = XP_VALUES[action];
        const { xp, level, achievements, stats } = get();

        const newXP = xp + xpGain;
        const newLevel = calculateLevel(newXP);

        // Check for level up
        const leveledUp = newLevel > level;

        // Check for new achievements
        const newStats = { ...stats, level: newLevel };
        let newAchievement: Achievement | null = null;

        for (const achievement of ACHIEVEMENTS) {
          if (!achievements.includes(achievement.id) && achievement.condition(newStats)) {
            newAchievement = achievement;
            break;
          }
        }

        set({
          xp: newXP + (newAchievement?.xpBonus || 0),
          level: newLevel,
          achievements: newAchievement
            ? [...achievements, newAchievement.id]
            : achievements,
          pendingXP: xpGain,
          pendingLevelUp: leveledUp ? newLevel : null,
          pendingAchievement: newAchievement,
          stats: newStats,
        });
      },

      checkStreak: () => {
        const { streak } = get();
        const today = new Date().toISOString().split('T')[0];
        const lastLogin = streak.lastLoginDate;

        if (lastLogin === today) return; // Already logged in today

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newCurrent = 1;
        if (lastLogin === yesterdayStr) {
          newCurrent = streak.current + 1;
        }

        const newLongest = Math.max(streak.longest, newCurrent);

        set({
          streak: {
            current: newCurrent,
            longest: newLongest,
            lastLoginDate: today,
          },
          stats: {
            ...get().stats,
            currentStreak: newCurrent,
            longestStreak: newLongest,
          },
        });

        // Add daily XP
        get().addXP('daily_login');
      },

      incrementStat: (stat) => {
        set({
          stats: {
            ...get().stats,
            [stat]: (get().stats[stat] as number) + 1,
          },
        });
      },

      clearNotification: (type) => {
        switch (type) {
          case 'xp':
            set({ pendingXP: null });
            break;
          case 'level':
            set({ pendingLevelUp: null });
            break;
          case 'achievement':
            set({ pendingAchievement: null });
            break;
        }
      },

      getCurrentLevel: () => {
        const { level } = get();
        return LEVELS[level - 1] || LEVELS[0];
      },

      getXPProgress: () => {
        const { xp } = get();
        const currentLevel = get().getCurrentLevel();
        const current = xp - currentLevel.minXP;
        const max = currentLevel.maxXP - currentLevel.minXP;
        const percent = Math.min((current / max) * 100, 100);
        return { current, max, percent };
      },
    }),
    {
      name: 'zenwallet-gamification',
    }
  )
);
```

**Tempo estimado:** 10 min

---

### Batch 3.2: Gamification UI

---

#### Task 3.2.1: Criar componente XPBar

**Arquivo:** `src/components/gamification/XPBar.tsx`

**Código completo:**
```typescript
import { motion } from 'framer-motion';
import { useGamificationStore } from '@/stores/gamificationStore';

export function XPBar() {
  const { level, getXPProgress, getCurrentLevel } = useGamificationStore();
  const { current, max, percent } = getXPProgress();
  const levelData = getCurrentLevel();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-solana-green font-semibold">Lv.{level}</span>
          <span className="text-text-secondary text-sm">{levelData.title}</span>
        </div>
        <span className="text-text-muted text-sm">
          {current.toLocaleString()} / {max.toLocaleString()} XP
        </span>
      </div>

      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-xp"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
```

**Tempo estimado:** 3 min

---

#### Task 3.2.2: Criar componente XPGainNotification

**Arquivo:** `src/components/gamification/XPGainNotification.tsx`

**Código completo:**
```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useGamificationStore } from '@/stores/gamificationStore';

export function XPGainNotification() {
  const { pendingXP, clearNotification } = useGamificationStore();

  useEffect(() => {
    if (pendingXP) {
      const timer = setTimeout(() => {
        clearNotification('xp');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [pendingXP, clearNotification]);

  return (
    <AnimatePresence>
      {pendingXP && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.8 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-solana-green/20 border border-solana-green/50 rounded-full px-6 py-2 backdrop-blur-sm">
            <span className="text-solana-green font-bold text-lg">
              +{pendingXP} XP
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Tempo estimado:** 3 min

---

#### Task 3.2.3: Criar componente AchievementPopup

**Arquivo:** `src/components/gamification/AchievementPopup.tsx`

**Código completo:**
```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { useGamificationStore } from '@/stores/gamificationStore';
import { Button } from '@/components/ui/Button';
import { Confetti } from './Confetti';

export function AchievementPopup() {
  const { pendingAchievement, clearNotification } = useGamificationStore();

  if (!pendingAchievement) return null;

  return (
    <AnimatePresence>
      {pendingAchievement && (
        <>
          <Confetti />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => clearNotification('achievement')}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-bg-secondary rounded-2xl p-8 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-6xl mb-4"
              >
                {pendingAchievement.icon}
              </motion.div>

              <h2 className="text-heading text-solana-green mb-2">
                Achievement Unlocked!
              </h2>

              <h3 className="text-xl font-semibold text-text-primary mb-2">
                {pendingAchievement.name}
              </h3>

              <p className="text-text-secondary mb-4">
                {pendingAchievement.description}
              </p>

              <div className="bg-solana-green/10 rounded-xl py-2 px-4 inline-block mb-6">
                <span className="text-solana-green font-bold">
                  +{pendingAchievement.xpBonus} XP
                </span>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => clearNotification('achievement')}
              >
                Awesome!
              </Button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

**Tempo estimado:** 5 min

---

#### Task 3.2.4: Criar componente Confetti

**Arquivo:** `src/components/gamification/Confetti.tsx`

**Código completo:**
```typescript
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
}

const COLORS = ['#14F195', '#9945FF', '#19FB9B', '#FFB547', '#FF6B6B'];

export function Confetti() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.5,
        duration: 1 + Math.random() * 1,
      });
    }
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: `${particle.x}%`,
            backgroundColor: particle.color,
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{
            y: '100vh',
            opacity: 0,
            rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  );
}
```

**Tempo estimado:** 4 min

---

#### Task 3.2.5: Criar componente StreakCounter

**Arquivo:** `src/components/gamification/StreakCounter.tsx`

**Código completo:**
```typescript
import { motion } from 'framer-motion';
import { useGamificationStore } from '@/stores/gamificationStore';

export function StreakCounter() {
  const { streak } = useGamificationStore();

  if (streak.current === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-xl px-4 py-2"
    >
      <span className="text-2xl">🔥</span>
      <div>
        <div className="text-warning font-semibold">
          {streak.current} day streak
        </div>
        {streak.longest > streak.current && (
          <div className="text-text-muted text-xs">
            Best: {streak.longest} days
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

**Tempo estimado:** 3 min

---

### 📋 Code Review Checkpoint: Batch 3

**Antes de continuar:**

- [ ] Tipos de gamificação definidos
- [ ] Gamification store funcional
- [ ] XPBar mostrando progresso
- [ ] Notificação de XP ganho
- [ ] Achievement popup com confetti
- [ ] Streak counter

**Teste crítico:**
```typescript
// 1. Adicionar XP
useGamificationStore.getState().addXP('first_login');
console.log('XP:', useGamificationStore.getState().xp);

// 2. Check streak
useGamificationStore.getState().checkStreak();

// 3. Achievement deve ser desbloqueado
console.log('Achievements:', useGamificationStore.getState().achievements);
```

---

## Sprint 4: Polish & Ship

> Este sprint foca em UI polish, PWA config, e deploy.
> Tarefas detalhadas a serem adicionadas conforme progresso.

### Batch 4.1: PWA Configuration

#### Task 4.1.1: Criar manifest.json

**Arquivo:** `public/manifest.json`

```json
{
  "name": "ZenWallet",
  "short_name": "ZenWallet",
  "description": "Crypto made fun. For real.",
  "theme_color": "#0A0A0B",
  "background_color": "#0A0A0B",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## Execution Modes

Após este plano estar pronto, escolha como executar:

| Modo | Descrição |
|------|-----------|
| **Execute Now** | Iniciar implementação imediatamente nesta sessão |
| **Parallel Session** | Abrir nova sessão para execução batch |
| **Save for Later** | Manter plano para revisão manual |

---

## Notes for Agents

1. **Sempre leia o MASTERPLAN.md** antes de implementar
2. **Mobile-first** - teste em viewport 375px
3. **Dark mode only** - não implementar light mode
4. **Animações são obrigatórias** - use Framer Motion
5. **Crypto code é crítico** - nunca log keys, sempre limpar memória
6. **Max 100 linhas por componente**

---

## Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0.0 | 2025-12-26 | Plano inicial completo |
