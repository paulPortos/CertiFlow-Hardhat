# CertiFlow - Certificate Registry Smart Contract

## 📋 Overview

CertificateRegistry is a Solidity smart contract that stores certificate metadata and IPFS links on the blockchain. It implements a **Split Storage** strategy for security and efficiency:

- **RAW Storage**: IPFS CID (Accessibility), Recipient Hash (Ownership), Certificate ID (Link)
- **HASHED Storage**: Metadata Hash (Integrity)

---

## ✅ Prerequisites

Before running, ensure you have:
- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)
- **Hardhat** (installed via npm)

Check versions:
```powershell
node --version
npm --version
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```powershell
cd C:\Users\eshav\CertiFlow-Hardhat
npm install
```

---

## 🔧 Running & Testing

### **Option A: Test Without Local Blockchain (Quick)**

Run all unit tests:
```powershell
npx hardhat test
```

✅ **Output**: 7 passing tests with detailed logging showing:
- Certificate registration data
- Revocation status
- Ownership verification
- Version tracking
- Validation results

---

### **Option B: Deploy & Test on Local Blockchain (Recommended)**

#### **Terminal 1: Start Local Blockchain**
```powershell
npx hardhat node
```

Expected output:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
Accounts:
(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cFfb92266
(1) 0x70997970C51812e339D9B73b0245ad59c36d573A
...
```

**⚠️ Keep this terminal running!**

---

#### **Terminal 2: Deploy Contract**
```powershell
npx hardhat run scripts/deployAndTest.ts --network localhost
```

**✅ This will:**
1. Deploy CertificateRegistry to localhost
2. Register a certificate
3. Verify ownership
4. Create a new version
5. Revoke the certificate
6. Validate all data

**Expected Output:**
```
========================================
  CERTIFICATE REGISTRY DEPLOYMENT TEST
========================================

📝 Deploying CertificateRegistry...
✅ Deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3

========================================

TEST 1: Register Certificate
-----------------------------
Input Data:
  Metadata Hash: 0x5189eebabb32ae4304731fff85a734d12a7d0f98269845cd0505293d4a880b40  
  Certificate ID: 101
  IPFS CID: QmTestIPFS123456
  Recipient Hash: 0xcfb15ca7270395d72219fd758f75a0c95e3f0a61d959222402f24051d08e9b32

✅ Registered!
   TX Hash: 0x79eedc64edd06f61bcfd19ec9e7ba716980b23e2d791a348c0cb0708b25afaf3

📊 Stored Certificate Data:
  Certificate ID: 101
  IPFS CID: QmTestIPFS123456
  Version: 1
  Timestamp: 1770027950
  Exists: true
  Revoked: false
  
... (more tests)
```

---

## 📊 Test Coverage

### **Unit Tests (7 tests)**
```
✅ Should register and retrieve a certificate
✅ Should revoke a certificate
✅ Should verify certificate ownership
✅ Should track certificate versions
✅ Should validate latest certificate
✅ Should not register duplicate hash
✅ Should allow authorized registrar to register
```

Run tests with:
```powershell
npx hardhat test
```

### **Integration Tests (Deployment Test)**
Tests the full lifecycle:
1. **Register Certificate** - Store certificate with metadata hash
2. **Verify Ownership** - Check if user owns certificate
3. **Register New Version** - Create v2 of same certificate
4. **Revoke Certificate** - Mark certificate as revoked
5. **Validate** - Verify old versions become invalid

Run integration test with:
```powershell
npx hardhat run scripts/deployAndTest.ts --network localhost
```

---

## 🔑 Contract Functions

### **Registration**
```solidity
registerCertificate(
    bytes32 metadataHash,
    uint256 certificateId,
    string ipfsCid,
    bytes32 recipientHash
) → bool
```

### **Verification**
```solidity
verifyCertificate(bytes32 metadataHash) → (exists, id, ipfs, hash, version, timestamp, revoked)

verifyOwnership(bytes32 metadataHash, bytes32 userEmailHash) → bool

isValidCertificate(bytes32 metadataHash) → bool
```

### **Revocation**
```solidity
revokeCertificate(bytes32 metadataHash, string reason) → bool
```

### **Admin**
```solidity
addRegistrar(address registrar)
removeRegistrar(address registrar)
transferOwnership(address newOwner)
```

---

## 📁 Project Structure

```
CertiFlow-Hardhat/
├── contracts/
│   └── CertificateRegistry.sol          # Main smart contract
├── scripts/
│   ├── deployAndTest.ts                 # Deploy & test locally
│   └── send-op-tx.ts                    # Additional utilities
├── test/
│   └── CertificateRegistry.ts           # Unit tests (7 tests)
├── ignition/
│   ├── modules/
│   │   └── CertificateModule.ts         # Deployment module
│   └── deployments/
│       ├── chain-1337/                  # Ganache deployments
│       └── chain-31337/                 # Hardhat deployments
├── artifacts/                            # Compiled contract ABIs
├── hardhat.config.ts                    # Hardhat configuration
├── package.json                         # Dependencies
└── RUN_AND_TEST.md                      # This file
```

---

## 🛠️ Hardhat Commands

| Command | Purpose |
|---------|---------|
| `npx hardhat node` | Start local blockchain |
| `npx hardhat test` | Run all unit tests |
| `npx hardhat run scripts/deployAndTest.ts --network localhost` | Deploy & test locally |
| `npx hardhat compile` | Compile contracts |
| `npx hardhat clean` | Remove build artifacts |

---

## 📝 Data Storage Details

### **Certificate Structure**
```solidity
struct Certificate {
    uint256 certificateId;      // Database ID
    string ipfsCid;             // IPFS Content/File ID
    bytes32 recipientHash;      // SHA-256(email + salt)
    uint256 version;            // Version number
    uint256 timestamp;          // Registration time
    bool exists;                // Existence flag
    bool revoked;               // Revocation flag
    uint256 revokedAt;          // Revocation time
}
```

### **Storage Mappings**
```solidity
mapping(bytes32 => Certificate) public certificates;      // Hash → Certificate
mapping(uint256 => bytes32) public latestCertificate;     // ID → Latest Hash
mapping(address => bool) public authorizedRegistrars;     // Address → Authorized
```

---

## 🔐 Security Features

✅ **Only authorized registrars** can register/revoke certificates  
✅ **Duplicate hash prevention** - Same hash can't be registered twice  
✅ **Version tracking** - Old versions invalidate when new ones exist  
✅ **Ownership verification** - Only intended recipients can claim ownership  
✅ **Immutable records** - Blockchain provides permanent audit trail  

---

## 🚨 Troubleshooting

### **Port 8545 already in use**
```powershell
Get-Process | Where-Object {$_.Name -eq "node"} | Stop-Process -Force
```

### **Contract not found during test**
```powershell
npx hardhat compile
```

### **Tests failing**
Make sure you have:
- Hardhat node running in Terminal 1
- Latest dependencies installed: `npm install`

---

## 📞 Example Usage

### Register a Certificate
```typescript
const metadataHash = keccak256(toBytes("certificate-data"));
const certId = 101n;
const ipfsCid = "QmYourIPFSHash";
const recipientHash = keccak256(toBytes("user@example.com"));

const tx = await registry.write.registerCertificate([
  metadataHash,
  certId,
  ipfsCid,
  recipientHash
]);
```

### Verify Ownership
```typescript
const isOwner = await registry.read.verifyOwnership([
  metadataHash,
  userEmailHash
]);
```

### Revoke Certificate
```typescript
const tx = await registry.write.revokeCertificate([
  metadataHash,
  "Reason for revocation"
]);
```

---

## ✨ Summary

| Task | Command |
|------|---------|
| **Quick test** | `npx hardhat test` |
| **Full deployment test** | `npx hardhat node` + `npx hardhat run scripts/deployAndTest.ts --network localhost` |
| **Compile** | `npx hardhat compile` |
| **View contract** | [CertificateRegistry.sol](contracts/CertificateRegistry.sol) |

---

**Happy testing! 🎉**
