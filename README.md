# Proof of Pulse

Decentralized biometric attestation on NEAR. Upload Apple Health heart rate data, get a cryptographic proof of your workout on-chain. No raw data exposed -- only the proof.

## How It Works

```
Apple Health XML  -->  Attestation Engine  -->  NEAR Smart Contract
                          |                         |
                     Fraud Detection           On-chain proof
                     HR Zone Analysis          (confidence score,
                     Confidence Scoring         activity type, hash)
                          |
                     NOVA Privacy Vault
                     (encrypted raw data)
```

1. **Upload** -- Export heart rate data from Apple Health (XML)
2. **Analyze** -- The attestation engine extracts workout sessions, detects fraud, and computes a confidence score (0-100)
3. **Attest** -- Oracle submits the proof to NEAR. Raw data goes to an encrypted NOVA vault.
4. **Verify** -- Anyone can verify the attestation on-chain. Consumer dApps can gate rewards on confidence thresholds.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.3.9+
- [pnpm](https://pnpm.io) (for smart contracts)
- [NEAR CLI](https://docs.near.org/tools/near-cli-rs) (`near-cli-rs`)
- Node.js 20+ (for shade-agent)

### Install & Run

```bash
# Root -- Oracle backend
bun install
bun run src/server.ts

# Frontend
cd client && bun install && bun run dev

# Smart contract (uses pnpm)
cd contract && pnpm install && pnpm run build && pnpm run test

# Consumer contract
cd consumer-contract && pnpm install && pnpm run build

# Shade Agent (TEE oracle)
cd shade-agent && npm install && npm run dev
```

### Environment

Copy `.env.example` to `.env` and configure:

```env
NEAR_NETWORK=testnet
CONTRACT_ID=proof-of-pulse.testnet
ORACLE_ACCOUNT_ID=oracle.proof-of-pulse.testnet
ORACLE_PRIVATE_KEY=ed25519:...

NOVA_ACCOUNT_ID=your-account.nova-sdk-6.testnet
NOVA_API_KEY=nova_sk_...
```

## Architecture

```
near/
├── client/                  # Next.js 16 + React 19 frontend
│   ├── components/          # ProofWizard, UploadStep, AnalysisStep, etc.
│   └── hooks/               # useAttestationFlow state management
│
├── src/                     # Bun oracle backend
│   ├── parser/              # Apple Health XML parser (fast-xml-parser)
│   ├── engine/              # Biometric analysis & fraud detection
│   ├── oracle/              # NEAR contract submission (near-api-js v7)
│   └── nova/                # NOVA Privacy Vault integration
│
├── contract/                # Proof of Pulse smart contract (near-sdk-js)
├── consumer-contract/       # Mock Sweatcoin consumer contract
├── shade-agent/             # TEE oracle (Hono + Phala Network)
└── docs/                    # Phase implementation guides
```

## Smart Contract

**Deployed:** `proof-of-pulse.testnet`

| Method | Type | Description |
|--------|------|-------------|
| `submit_attestation` | call | Oracle submits workout proof |
| `get_attestation` | view | Retrieve attestation by key |
| `verify_attestation` | view | Check if confidence >= threshold |
| `request_attestation` | call | User requests async attestation |
| `fulfill_attestation` | call | Oracle fulfills pending request |
| `get_pending_requests` | view | List pending attestation requests |
| `add_oracle` / `remove_oracle` | call | Owner manages oracle accounts |
| `get_oracles` | view | List all authorized oracles |

### Consumer Contract

**Deployed:** `mock-sweatcoin.testnet`

Any dApp on NEAR can verify attestations with a single cross-contract call:

```typescript
// Claims reward only if biometric confidence >= 80%
claim_reward({ attestation_key: "user.testnet:1771134135785657069" })
  // -> cross-contract call to proof-of-pulse.testnet.verify_attestation
  // -> "10 SWEAT" rewarded if confidence passes
```

## Confidence Scoring

The engine prevents spoofed workout data through a multi-factor scoring system:

| Factor | Max Points | What It Detects |
|--------|-----------|-----------------|
| Duration | 25 | Full points at 20+ min workouts |
| Natural Pattern | 25 | Warmup ramp-up, variability, HR range |
| HR Variability | 20 | Beat-to-beat variation (2-8 bpm = natural) |
| Sampling Density | 15 | Minimum samples per minute |
| HR Range | 15 | Max - min heart rate spread |

**Fraud detection:** Flat data (no variation), erratic swings (>15 bpm jumps), missing warmup, low sample density, and short duration all reduce confidence.

## Why "Only on NEAR"

Proof of Pulse leverages five NEAR-native primitives that make this project impossible to build elsewhere:

### 1. Shade Agent + Code Hash Attestation
Our oracle runs inside a TEE (Trusted Execution Environment) via the Shade Agent Framework. The exact code that analyzes your heart rate data is attested on-chain via its Docker image SHA256 hash. Nobody -- not even us -- can deploy a tampered oracle.

### 2. Yield/Resume for Async Attestation
Users request attestations on-chain, and the oracle fulfills them asynchronously. The contract tracks pending requests with NEP-297 events, enabling a decoupled request/fulfill pattern unique to NEAR's async execution model.

### 3. Named Account Hierarchy
Our trust model is human-readable:

```
proof-of-pulse.testnet                  <- Protocol contract
├── oracle-v1.proof-of-pulse.testnet    <- Audited oracle v1
├── shade-oracle.proof-of-pulse.testnet <- TEE-attested oracle
└── (future: dao.proof-of-pulse.testnet)
```

Try doing this on Ethereum with `0x7a250d...`.

### 4. Global Contract Composability
Any dApp on NEAR can verify attestations via a single cross-contract call. Our mock Sweatcoin consumer only rewards tokens when biometric confidence exceeds 80%. The attestation contract is shared state -- a public good.

### 5. NOVA Privacy Vaults
Raw biometric data stays encrypted in NOVA. Only the proof lives on-chain. Users control who can access their health data via grant/revoke permissions.

## Testnet Accounts

| Account | Purpose |
|---------|---------|
| `proof-of-pulse.testnet` | Main attestation contract |
| `oracle.proof-of-pulse.testnet` | Primary oracle (v1) |
| `pop-oracle.testnet` | Shade Agent TEE account |
| `mock-sweatcoin.testnet` | Consumer reward contract |

## Tech Stack

- **Runtime:** Bun (backend), Node.js (shade-agent)
- **Frontend:** Next.js 16, React 19, Tailwind CSS, shadcn/ui, Recharts
- **Blockchain:** NEAR Protocol (near-sdk-js v2, near-api-js v7)
- **Privacy:** NOVA Privacy Vaults (Phala Network)
- **TEE:** Shade Agent Framework (Phala Cloud)
- **Wallet:** NEAR Wallet Selector (My NEAR Wallet, Meteor Wallet)

## Testing

```bash
# Smart contract tests (10 tests)
cd contract && pnpm run test

# Consumer contract tests (3 tests)
cd consumer-contract && pnpm run test

# Attestation engine tests
cd src && bun test
```

## License

MIT
