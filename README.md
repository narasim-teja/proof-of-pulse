# 🫀 Proof of Pulse

**Biometric proof your users are real, present, and active — one API call.**

Proof of Pulse is a decentralized biometric attestation oracle on NEAR. It takes Apple Watch heart rate data, detects fraud, and produces a cryptographic on-chain proof that a real human performed a real workout. Raw health data stays encrypted in NOVA Privacy Vaults — only the proof lives on-chain.

---

## The Problem

Move-to-earn apps reward people with tokens for exercising. **But people cheat.** GPS spoofing, phone shaking, watches strapped to dogs — step counts and location data are trivially fakeable.

**Heart rate data is not.** You can't fake a cardiovascular response. When someone runs on a treadmill, their heart goes from 93 → 177 bpm with specific warmup ramps, sustained cardio zones, and recovery curves. That pattern is physiologically unique to actual exercise.

Proof of Pulse turns that biometric signal into an on-chain attestation that any dApp can verify.

## How It Works

```
Apple Watch HR Data ──→ Shade Agent (TEE) ──→ NEAR Smart Contract
                             │                        │
                        Fraud Detection          On-chain proof
                        Zone Analysis           (confidence score,
                        Confidence Score         activity type, hash)
                             │
                        NOVA Privacy Vault
                       (AES-256-GCM encrypted
                        raw data on IPFS)
```

1. **Upload** — Export heart rate data from Apple Health
2. **Analyze** — The attestation engine runs inside a TEE, detects spoofed data, computes a confidence score (0–100)
3. **Attest** — Signed attestation submitted to NEAR. Raw biometric data encrypted and stored in NOVA.
4. **Verify** — Any dApp on NEAR can verify the proof with a single cross-contract call

## Live Demo

| Component | URL |
|-----------|-----|
| Frontend | *Deployed via Vercel* |
| Shade Agent (TEE) | `https://46198e92a8656bdd9690c82254b9d0414c91a1be-3000.dstack-pha-prod5.phala.network` |
| NEAR Contract | [`proof-of-pulse.testnet`](https://testnet.nearblocks.io/address/proof-of-pulse.testnet) |
| NOVA Vault | `narasimteja.nova-sdk.near` (mainnet) |

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.3.9+ · [pnpm](https://pnpm.io) · [NEAR CLI](https://docs.near.org/tools/near-cli-rs) · Node.js 20+

### Run Locally

```bash
# Oracle backend
bun install && bun run src/server.ts

# Frontend
cd client && bun install && bun run dev

# Smart contract
cd contract && pnpm install && pnpm run build && pnpm run test

# Shade Agent (TEE oracle)
cd shade-agent && npm install && npm run dev
```

### Environment

Copy `.env.example` → `.env`:

```env
NEAR_NETWORK=testnet
CONTRACT_ID=proof-of-pulse.testnet
ORACLE_ACCOUNT_ID=oracle.proof-of-pulse.testnet
ORACLE_PRIVATE_KEY=ed25519:...
NOVA_ACCOUNT_ID=your-account.nova-sdk.near
NOVA_API_KEY=nova_sk_...
```

---

## Architecture

```
proof-of-pulse/
├── client/                  # Next.js 16 + React 19 frontend
│   ├── components/          # ProofWizard, UploadStep, AnalysisStep, etc.
│   └── hooks/               # useAttestationFlow state management
│
├── src/                     # Bun oracle backend
│   ├── parser/              # Apple Health XML parser
│   ├── engine/              # Biometric analysis & fraud detection
│   ├── oracle/              # NEAR contract submission (near-api-js v7)
│   └── nova/                # NOVA Privacy Vault integration
│
├── contract/                # Attestation smart contract (near-sdk-js)
├── consumer-contract/       # Mock Sweatcoin — cross-contract consumer
└── shade-agent/             # TEE oracle (Hono + Phala Cloud)
```

## Smart Contract

**Deployed:** [`proof-of-pulse.testnet`](https://testnet.nearblocks.io/address/proof-of-pulse.testnet)

| Method | Type | Description |
|--------|------|-------------|
| `submit_attestation` | call | Oracle submits workout proof |
| `get_attestation` | view | Retrieve attestation by key |
| `verify_attestation` | view | Check if confidence ≥ threshold |
| `request_attestation` | call | User requests async attestation |
| `fulfill_attestation` | call | Oracle fulfills pending request |
| `get_pending_requests` | view | List pending requests |
| `add_oracle` / `remove_oracle` | call | Owner manages authorized oracles |
| `get_oracles` | view | List all authorized oracles |

### Consumer Contract

**Deployed:** [`mock-sweatcoin.testnet`](https://testnet.nearblocks.io/address/mock-sweatcoin.testnet)

Any dApp on NEAR can gate rewards on biometric proof with one cross-contract call:

```typescript
claim_reward({ attestation_key: "user.testnet:1771134135785657069" })
// → cross-contract call to proof-of-pulse.testnet.verify_attestation
// → "10 SWEAT" rewarded only if confidence >= 80%
```

---

## Confidence Scoring & Fraud Detection

The engine prevents spoofed workout data through multi-factor analysis:

| Factor | Max Points | What It Detects |
|--------|-----------|-----------------|
| Duration | 25 | Sustained effort (full points at 20+ min) |
| Natural Pattern | 25 | Warmup ramp-up, recovery curves, HR range |
| HR Variability | 20 | Beat-to-beat variation (2–8 bpm = natural) |
| Sampling Density | 15 | Samples per minute (dense = real watch) |
| HR Range | 15 | Max–min spread (wide = real exertion) |

**What gets flagged:** Flat HR data (no variation), erratic swings (>15 bpm jumps between consecutive readings), missing warmup phase, low sampling density, short duration. A real 25-minute treadmill session scores 90+. A phone taped to a ceiling fan scores under 30.

---

## Why "Only on NEAR"

Proof of Pulse leverages five NEAR-native primitives that make this project impossible to build elsewhere.

### 1. Shade Agent + Code Hash Attestation

Our oracle runs inside a **Trusted Execution Environment** via the Shade Agent Framework, deployed on Phala Cloud. The Docker image SHA256 hash is attested on-chain — proving the exact code that analyzed your heart rate data is the code that was audited. Nobody, not even us, can deploy a tampered oracle. Any instance running the same code gets the same signing keys through NEAR's Chain Signatures.

**Live TEE endpoint:** [`https://46198e92...phala.network`](https://46198e92a8656bdd9690c82254b9d0414c91a1be-3000.dstack-pha-prod5.phala.network)

### 2. Async Attestation (Request/Fulfill Pattern)

Users call `request_attestation` on-chain. The contract stores the pending request and emits a NEP-297 event. The Shade Agent picks it up, processes the biometric data in the TEE, and calls `fulfill_attestation` with the result. This decoupled async pattern leverages NEAR's unique execution model — the contract tracks state across asynchronous boundaries without polling loops.

### 3. Named Account Hierarchy

Our trust model is human-readable:

```
proof-of-pulse.testnet                   ← Protocol contract
├── oracle.proof-of-pulse.testnet        ← Primary oracle (v1)
├── shade-oracle.proof-of-pulse.testnet  ← TEE-attested oracle
└── (future: dao.proof-of-pulse.testnet) ← DAO governance
```

The account name IS the identity. No ABI decoding, no hex address lookups. Users and auditors can read the trust hierarchy directly.

### 4. Global Contract Composability

The attestation contract is shared state — a public good. Any dApp on NEAR verifies attestations with a single cross-contract call. Our `mock-sweatcoin.testnet` consumer demonstrates this: it only distributes rewards when biometric confidence exceeds 80%, verified via cross-contract call to `proof-of-pulse.testnet`.

### 5. NOVA Privacy Vaults (Mainnet)

Raw biometric data is encrypted client-side with **AES-256-GCM** and stored in NOVA vaults on IPFS via NEAR mainnet. Only the attestation proof and a `nova_vault_id` reference live on-chain (testnet). Users control access through grant/revoke — revoking triggers automatic key rotation so previously authorized parties lose access.

**Data flow:**
```
80MB Apple Health XML
  → parsed to ~20KB workout HR samples
  → encrypted (AES-256-GCM) + uploaded to NOVA
  → IPFS CID + SHA-256 hash returned
  → nova_vault_id recorded on-chain alongside attestation
```

**Network split:** Attestation contract runs on NEAR testnet. NOVA vaults run on NEAR mainnet. This works because `nova_vault_id` is stored as a plain string reference — no cross-network contract calls needed.

| NOVA Endpoint | Description |
|---------------|-------------|
| `GET /api/vault/:groupId` | Query vault status, owner, files, authorization |
| `POST /api/vault/grant` | Grant an account access to encrypted data |
| `POST /api/vault/revoke` | Revoke access (triggers key rotation) |

---

## Deployed Accounts

| Account | Network | Purpose |
|---------|---------|---------|
| `proof-of-pulse.testnet` | Testnet | Main attestation contract |
| `oracle.proof-of-pulse.testnet` | Testnet | Primary oracle (v1) |
| `pop-oracle.testnet` | Testnet | Shade Agent TEE account |
| `mock-sweatcoin.testnet` | Testnet | Consumer reward contract |
| `narasimteja.nova-sdk.near` | **Mainnet** | NOVA Privacy Vault |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun (backend), Node.js (shade-agent) |
| Frontend | Next.js 16, React 19, Tailwind CSS, shadcn/ui, Recharts |
| Blockchain | NEAR Protocol (near-sdk-js v2, near-api-js v7) |
| Privacy | NOVA Privacy Vaults (AES-256-GCM, IPFS, NEAR mainnet) |
| TEE | Shade Agent Framework (Phala Cloud) |
| Wallet | NEAR Wallet Selector (My NEAR Wallet, Meteor Wallet) |

## Testing

```bash
# Smart contract (10 tests)
cd contract && pnpm run test

# Consumer contract (3 tests)
cd consumer-contract && pnpm run test

# Shade Agent — engine, parser, NOVA vault (20 tests)
cd shade-agent && npm test

# Live NOVA mainnet integration
NOVA_ACCOUNT_ID=your.nova-sdk.near NOVA_API_KEY=nova_sk_... \
NOVA_INTEGRATION_TEST=1 npm test
```

---

## Use Cases

**Move-to-Earn Verification** — Sweatcoin, STEPN, and similar apps on NEAR can gate token rewards on biometric proof instead of easily-spoofed step counts.

**Health Insurance Compliance** — Insurers verify exercise requirements without accessing raw health data. On-chain attestation = summary. NOVA vault = detailed data (paid access, user-controlled).

**Research Data Marketplace** — Users monetize their biometric data. Researchers pay for access to encrypted workout data via NOVA vaults. The user controls who sees what and gets paid for it.

---

*Built with real workout data. The heart rate curve in the demo (93 → 177 bpm) is from an actual treadmill session.*