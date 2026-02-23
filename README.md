# CertiFlow Hardhat — Smart Contract Registries

Blockchain layer for **CertiFlow**. Contains three Solidity smart contracts that store tamper-proof credential hashes on-chain, plus Hardhat tooling to compile, test, and deploy them.

## Contracts

| Contract | Purpose |
|---|---|
| `CertificateRegistry` | Stores certificate metadata hashes, IPFS CIDs, recipient hashes. Supports versioning and revocation. |
| `EntityRegistry` | Stores verification hashes for Organizations and Businesses. Supports versioning. |
| `AttachmentRegistry` | Stores file hashes for SEC registrations, business permits, and other documents. Supports versioning. |

All contracts enforce **authorized registrar access** — only the deployer (owner) or explicitly added registrar addresses can write data.

---

## Prerequisites

- **Node.js** ≥ v16
- **npm**

```bash
# Install dependencies
npm install
```

---

## Quick Start: Run Tests

This runs **15 unit tests** on an ephemeral in-memory blockchain — no external node required.

```bash
npx hardhat test
```

---

## Deploying Locally (For API Integration)

The Django API needs a running blockchain node with deployed contracts to write/read hashes. There are two options:

### Option A: Hardhat Node (Recommended for Dev)

**Terminal 1** — Start the node:
```bash
npx hardhat node
```
This starts a local EVM at `http://127.0.0.1:8545` with 20 funded test accounts.

**Terminal 2** — Deploy contracts:
```bash
npx hardhat run scripts/deploy.ts --network localhost
```

You'll see output like:
```
CERTIFICATE_REGISTRY_CONTRACT_ADDRESS=0x5FbDB...
ENTITY_REGISTRY_CONTRACT_ADDRESS=0xe7f17...
ATTACHMENT_REGISTRY_CONTRACT_ADDRESS=0x9fE46...
```

Copy those into your API's `.env` file along with the private key from the Hardhat node output:

```env
# Blockchain (Local Hardhat Node)
BLOCKCHAIN_RPC_URL=http://host.docker.internal:8545
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CERTIFICATE_REGISTRY_CONTRACT_ADDRESS=<paste address>
ENTITY_REGISTRY_CONTRACT_ADDRESS=<paste address>
ATTACHMENT_REGISTRY_CONTRACT_ADDRESS=<paste address>
```

> **Why `host.docker.internal`?** The Django API runs inside Docker, so `localhost` inside the container doesn't reach your host machine. `host.docker.internal` bridges Docker to your host's network where the Hardhat node is running.

> **Private key:** The key above (`0xac09...`) is the default Account #0 from `npx hardhat node`. It's a well-known test key — never use it on a real network.

Then restart your API container:
```bash
docker compose restart api
```

---

### Option B: Ganache (Desktop App)

If you prefer Ganache's GUI, the config already has a `ganache` network defined.

1. Open Ganache and start a workspace (default RPC: `http://127.0.0.1:7545`, Chain ID: `1337`).
2. Deploy:
   ```bash
   npx hardhat run scripts/deploy.ts --network ganache
   ```
3. Copy the output addresses + a private key from Ganache into your API `.env`:
   ```env
   BLOCKCHAIN_RPC_URL=http://host.docker.internal:7545
   BLOCKCHAIN_PRIVATE_KEY=<copy from Ganache>
   CERTIFICATE_REGISTRY_CONTRACT_ADDRESS=<paste>
   ENTITY_REGISTRY_CONTRACT_ADDRESS=<paste>
   ATTACHMENT_REGISTRY_CONTRACT_ADDRESS=<paste>
   ```

---

## ⚠️ Important: Ganache is NOT in Docker

Ganache / Hardhat Node is **not** included in `docker-compose.yml`. You must run it on your host machine separately (either `npx hardhat node` or Ganache Desktop). The API container reaches your host via `host.docker.internal`.

If you want to add Ganache to Docker in the future, you can add this to `docker-compose.yml`:

```yaml
  ganache:
    image: trufflesuite/ganache:latest
    container_name: certiflow_ganache
    restart: unless-stopped
    ports:
      - "8545:8545"
    command: >
      --chain.chainId 1337
      --wallet.deterministic
      --wallet.totalAccounts 10
      --hardfork paris
```

Then change your API `.env` to:
```env
BLOCKCHAIN_RPC_URL=http://ganache:8545
```

---

## Project Structure

```
CertiFlow-Hardhat/
├── contracts/
│   ├── CertificateRegistry.sol
│   ├── EntityRegistry.sol
│   └── AttachmentRegistry.sol
├── scripts/
│   └── deploy.ts                  # Deploys all 3 contracts, outputs .env vars
├── test/
│   ├── CertificateRegistry.ts     # 7 tests
│   ├── EntityRegistry.ts          # 4 tests
│   └── AttachmentRegistry.ts      # 4 tests
├── hardhat.config.ts              # Network configs (hardhat, ganache, sepolia)
├── package.json
└── RUN_AND_TEST.md                # Quick reference
```

## Commands

| Command | What it does |
|---|---|
| `npx hardhat test` | Run all 15 unit tests (no external node needed) |
| `npx hardhat node` | Start a local EVM node at `:8545` |
| `npx hardhat run scripts/deploy.ts --network localhost` | Deploy to Hardhat node |
| `npx hardhat run scripts/deploy.ts --network ganache` | Deploy to Ganache |
| `npx hardhat compile` | Compile all `.sol` files |
| `npx hardhat clean` | Delete compiled artifacts |

## API Environment Variables

These are the env vars the Django API reads to connect to the blockchain:

| Variable | Description | Default |
|---|---|---|
| `BLOCKCHAIN_RPC_URL` | RPC endpoint of the EVM node | `http://localhost:8545` |
| `BLOCKCHAIN_PRIVATE_KEY` | Private key for signing transactions | *(empty — blockchain disabled)* |
| `CERTIFICATE_REGISTRY_CONTRACT_ADDRESS` | Deployed CertificateRegistry address | *(empty)* |
| `ENTITY_REGISTRY_CONTRACT_ADDRESS` | Deployed EntityRegistry address | *(empty)* |
| `ATTACHMENT_REGISTRY_CONTRACT_ADDRESS` | Deployed AttachmentRegistry address | *(empty)* |

> When any of the address or private key variables are empty, the API gracefully skips blockchain calls. This means you can run the API without a blockchain node during development — the blockchain features simply won't be active.
