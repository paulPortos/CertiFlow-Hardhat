# CertiFlow - Smart Contract Registries

## 📋 Overview

The Hardhat environment for CertiFlow contains three core registries that store credential metadata hashes and IPFS links on the blockchain. 

- **CertificateRegistry:** Stores certificate metadata hashes (Split Storage: IPFS CID + Recipient Hash + Metadata Hash).
- **EntityRegistry:** Stores verification status hashes for Organizations and Businesses.
- **AttachmentRegistry:** Stores file hashes for SEC registrations, permits, and other documents uploaded by entities.

All contracts support **versioning** and **duplicate hash prevention**, and they are restricted to **authorized registrars** (the API backend).

---

## ✅ Prerequisites

Ensure you have:
- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)
- **Hardhat** (installed via npm)

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

---

## 🔧 Running & Testing

### **Run All Unit Tests**
This will test all three smart contracts on an ephemeral in-memory network.

```bash
npx hardhat test
```

✅ **Output**: 15 passing tests detailing:
- Registration, ownership verification, and revocation across all 3 contracts
- Version tracking and `latestPointer` logic

---

## 🌍 Local Deployment (Ganache/Hardhat Node)

To deploy the contracts so the CertiFlow API can interact with them locally:

#### **Terminal 1: Start Local Blockchain**
```bash
npx hardhat node
```

*Or start your Ganache UI app.*

#### **Terminal 2: Deploy Contracts**
Deploy all three contracts using the unified deployment script:
```bash
npx hardhat run scripts/deploy.ts --network localhost
```

**✅ This will:**
1. Deploy `CertificateRegistry`
2. Deploy `EntityRegistry`
3. Deploy `AttachmentRegistry`
4. Output the exact `.env` variables needed for your Django API backend.

**Expected Output:**
```
CERTIFICATE_REGISTRY_CONTRACT_ADDRESS=0x123...
ENTITY_REGISTRY_CONTRACT_ADDRESS=0x456...
ATTACHMENT_REGISTRY_CONTRACT_ADDRESS=0x789...
```
Copy these into your backend `.env` file.

---

## 📁 Project Structure

```
CertiFlow-Hardhat/
├── contracts/
│   ├── CertificateRegistry.sol          # Stores certificates
│   ├── EntityRegistry.sol               # Stores Org/Business verification status
│   └── AttachmentRegistry.sol           # Stores SEC/DTI documents
├── scripts/
│   └── deploy.ts                        # Unified local deployment script
├── test/
│   ├── CertificateRegistry.ts           # Tests for Certificates
│   ├── EntityRegistry.ts                # Tests for Entities
│   └── AttachmentRegistry.ts            # Tests for Attachments
├── artifacts/                           # Compiled contract ABIs
├── hardhat.config.ts                    # Hardhat configuration
├── package.json                         # Dependencies
└── RUN_AND_TEST.md                      # This file
```

---

## 🛠️ Hardhat Commands

| Command | Purpose |
|---------|---------|
| `npx hardhat node` | Start local blockchain |
| `npx hardhat test` | Run all unit tests (15 tests) |
| `npx hardhat run scripts/deploy.ts --network localhost` | Deploy locally & output API env vars |
| `npx hardhat compile` | Compile contracts |
| `npx hardhat clean` | Remove build artifacts |

---

## � Troubleshooting

### **Port 8545 already in use**
If you get a port conflict, kill the existing node process or close Ganache.

### **Contract not found during test**
If Hardhat complains about missing artifacts, explicitly recompile:
```bash
npx hardhat clean
npx hardhat compile
```
