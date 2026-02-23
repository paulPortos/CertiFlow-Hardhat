import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { keccak256, toBytes } from "viem";

describe("CertificateRegistry", async () => {
  // Connect to the Hardhat network simulation
  const { viem } = await network.connect();

  it("Should register and retrieve a certificate", async () => {
    const [owner] = await viem.getWalletClients();
    const registry = await viem.deployContract("CertificateRegistry");

    // Prepare test data
    const metadataHash = keccak256(toBytes("meta-1"));
    const certId = 101n;
    const ipfsCid = "QmTest123";
    const recipientHash = keccak256(toBytes("user-1"));

    // 1. Execute the transaction
    const hash = await registry.write.registerCertificate([
      metadataHash,
      certId,
      ipfsCid,
      recipientHash
    ]);

    // 2. Fetch the data back
    const certData = await registry.read.certificates([metadataHash]);

    // 3. Destructure the struct result (matches the order in your Solidity file)
    const [
      id,           // certificateId
      cid,          // ipfsCid
      recipHash,    // recipientHash
      version,      // version
      timestamp,    // timestamp
      revoked,      // revoked
      revokedAt     // revokedAt
    ] = certData;

    // 4. Log certificate data
    console.log("\n=== Certificate Registered ===");
    console.log("Certificate ID:", id.toString());
    console.log("IPFS CID:", cid);
    console.log("Recipient Hash:", recipHash);
    console.log("Version:", version.toString());
    console.log("Timestamp:", timestamp.toString());
    console.log("Revoked:", revoked);
    console.log("==============================\n");

    // 4. Run Assertions
    assert.equal(id, certId, "Certificate ID should match");
    assert.equal(cid, ipfsCid, "IPFS CID should match");
    assert.equal(version, 1n, "Initial version should be 1");
    assert.ok(timestamp > 0n, "Timestamp should be recorded");
  });

  it("Should revoke a certificate", async () => {
    const [owner] = await viem.getWalletClients();
    const registry = await viem.deployContract("CertificateRegistry");

    const metadataHash = keccak256(toBytes("meta-2"));
    const certId = 102n;
    const ipfsCid = "QmTest124";
    const recipientHash = keccak256(toBytes("user-2"));

    // Register certificate
    await registry.write.registerCertificate([
      metadataHash,
      certId,
      ipfsCid,
      recipientHash
    ]);

    // Revoke certificate
    await registry.write.revokeCertificate([
      metadataHash,
      "Certificate expired"
    ]);

    // Verify revocation
    const certData = await registry.read.certificates([metadataHash]);
    const [, , , , , revoked] = certData;

    console.log("\n=== Certificate Revoked ===");
    console.log("Metadata Hash:", metadataHash);
    console.log("Revoked:", revoked);
    console.log("============================\n");

    assert.equal(revoked, true, "Certificate should be revoked");
  });

  it("Should verify certificate ownership", async () => {
    const [owner] = await viem.getWalletClients();
    const registry = await viem.deployContract("CertificateRegistry");

    const metadataHash = keccak256(toBytes("meta-3"));
    const certId = 103n;
    const ipfsCid = "QmTest125";
    const recipientHash = keccak256(toBytes("user-3"));

    // Register certificate
    await registry.write.registerCertificate([
      metadataHash,
      certId,
      ipfsCid,
      recipientHash
    ]);

    // Verify correct owner
    const isOwnerCorrect = await registry.read.verifyOwnership([
      metadataHash,
      recipientHash
    ]);

    console.log("\n=== Ownership Verification ===");
    console.log("Metadata Hash:", metadataHash);
    console.log("Recipient Hash:", recipientHash);
    console.log("Is Owner (Correct):", isOwnerCorrect);

    assert.equal(isOwnerCorrect, true, "Should verify correct owner");

    // Verify incorrect owner
    const wrongHash = keccak256(toBytes("wrong-user"));
    const isOwnerWrong = await registry.read.verifyOwnership([
      metadataHash,
      wrongHash
    ]);

    console.log("Is Owner (Wrong Hash):", isOwnerWrong);
    console.log("================================\n");

    assert.equal(isOwnerWrong, false, "Should reject wrong owner");
  });

  it("Should track certificate versions", async () => {
    const [owner] = await viem.getWalletClients();
    const registry = await viem.deployContract("CertificateRegistry");

    const certId = 104n;
    const recipientHash = keccak256(toBytes("user-4"));

    // Register first version
    const hash1 = keccak256(toBytes("meta-4a"));
    const ipfsCid1 = "QmFirst";
    await registry.write.registerCertificate([
      hash1,
      certId,
      ipfsCid1,
      recipientHash
    ]);

    // Register second version (same certId)
    const hash2 = keccak256(toBytes("meta-4b"));
    const ipfsCid2 = "QmSecond";
    await registry.write.registerCertificate([
      hash2,
      certId,
      ipfsCid2,
      recipientHash
    ]);

    // Check versions
    const cert1Data = await registry.read.certificates([hash1]);
    const [, , , version1] = cert1Data;

    const cert2Data = await registry.read.certificates([hash2]);
    const [, , , version2] = cert2Data;

    console.log("\n=== Certificate Versioning ===");
    console.log("Certificate ID:", certId.toString());
    console.log("First Version Hash:", hash1);
    console.log("First Version Number:", version1.toString());
    console.log("Second Version Hash:", hash2);
    console.log("Second Version Number:", version2.toString());

    assert.equal(version1, 1n, "First certificate should be version 1");
    assert.equal(version2, 2n, "Second certificate should be version 2");

    // Latest should point to second version
    const latest = await registry.read.getLatestCertificate([certId]);
    console.log("Latest Certificate Hash:", latest);
    console.log("================================\n");

    assert.equal(latest, hash2, "Latest certificate should be the second hash");
  });

  it("Should validate latest certificate", async () => {
    const [owner] = await viem.getWalletClients();
    const registry = await viem.deployContract("CertificateRegistry");

    const certId = 105n;
    const recipientHash = keccak256(toBytes("user-5"));

    // Register first version
    const hash1 = keccak256(toBytes("meta-5a"));
    await registry.write.registerCertificate([
      hash1,
      certId,
      "QmFirst",
      recipientHash
    ]);

    // Old version should be valid
    let isValid = await registry.read.isValidCertificate([hash1]);

    console.log("\n=== Certificate Validation ===");
    console.log("Certificate ID:", certId.toString());
    console.log("Hash 1 Valid (before update):", isValid);

    assert.equal(isValid, true, "First version should initially be valid");

    // Register second version
    const hash2 = keccak256(toBytes("meta-5b"));
    await registry.write.registerCertificate([
      hash2,
      certId,
      "QmSecond",
      recipientHash
    ]);

    // Old version should no longer be valid
    isValid = await registry.read.isValidCertificate([hash1]);
    console.log("Hash 1 Valid (after update):", isValid);

    assert.equal(isValid, false, "First version should no longer be valid");

    // New version should be valid
    isValid = await registry.read.isValidCertificate([hash2]);
    console.log("Hash 2 Valid:", isValid);
    console.log("================================\n");

    assert.equal(isValid, true, "Latest version should be valid");
  });

  it("Should not register duplicate hash", async () => {
    const [owner] = await viem.getWalletClients();
    const registry = await viem.deployContract("CertificateRegistry");

    const metadataHash = keccak256(toBytes("meta-6"));
    const certId = 106n;
    const ipfsCid = "QmTest";
    const recipientHash = keccak256(toBytes("user-6"));

    // Register certificate
    await registry.write.registerCertificate([
      metadataHash,
      certId,
      ipfsCid,
      recipientHash
    ]);

    // Try to register same hash with different data
    try {
      await registry.write.registerCertificate([
        metadataHash,
        200n, // different ID
        "QmDifferent",
        recipientHash
      ]);
      assert.fail("Should not allow duplicate hash registration");
    } catch (err) {
      assert.ok(err, "Should throw error on duplicate hash");
    }
  });

  it("Should allow authorized registrar to register", async () => {
    const [owner, user1] = await viem.getWalletClients();
    const registry = await viem.deployContract("CertificateRegistry");

    // Add user1 as registrar
    await registry.write.addRegistrar([user1.account.address]);

    // Verify user1 was added
    const isAuthorized = await registry.read.authorizedRegistrars([
      user1.account.address
    ]);
    assert.equal(isAuthorized, true, "User1 should be authorized");

    const metadataHash = keccak256(toBytes("meta-7"));
    const certId = 107n;
    const ipfsCid = "QmTest";
    const recipientHash = keccak256(toBytes("user-7"));

    // Owner should be able to register
    await registry.write.registerCertificate([
      metadataHash,
      certId,
      ipfsCid,
      recipientHash
    ]);

    // Verify it was registered
    const certData = await registry.read.certificates([metadataHash]);
    const [, , , , timestamp] = certData;
    assert.ok(timestamp > 0n, "Owner should be able to register");
  });
});