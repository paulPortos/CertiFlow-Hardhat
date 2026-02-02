import { network } from "hardhat";
import { keccak256, toBytes } from "viem";

async function main() {
  console.log("\n========================================");
  console.log("  CERTIFICATE REGISTRY DEPLOYMENT TEST");
  console.log("========================================\n");

  const { viem } = await network.connect();

  // Deploy contract
  console.log("📝 Deploying CertificateRegistry...");
  const registry = await viem.deployContract("CertificateRegistry");
  console.log("✅ Deployed at:", registry.address);
  console.log("\n========================================\n");

  // Test 1: Register a certificate
  console.log("TEST 1: Register Certificate");
  console.log("-----------------------------");
  
  const metadataHash = keccak256(toBytes("certificate-metadata-1"));
  const certId = 101n;
  const ipfsCid = "QmTestIPFS123456";
  const recipientEmail = "user@example.com";
  const recipientHash = keccak256(toBytes(recipientEmail));

  console.log("Input Data:");
  console.log("  Metadata Hash:", metadataHash);
  console.log("  Certificate ID:", certId.toString());
  console.log("  IPFS CID:", ipfsCid);
  console.log("  Recipient Email:", recipientEmail);
  console.log("  Recipient Hash:", recipientHash);

  const hash1 = await registry.write.registerCertificate([
    metadataHash,
    certId,
    ipfsCid,
    recipientHash
  ]);
  console.log("  Transaction Hash:", hash1);

  // Retrieve the certificate
  const cert = await registry.read.certificates([metadataHash]);
  const [id, cid, recipHash, version, timestamp, exists, revoked, revokedAt] = cert;
  
  console.log("\n📊 Stored Certificate Data:");
  console.log("  Certificate ID:", id.toString());
  console.log("  IPFS CID:", cid);
  console.log("  Recipient Hash:", recipHash);
  console.log("  Version:", version.toString());
  console.log("  Timestamp:", timestamp.toString());
  console.log("  Exists:", exists);
  console.log("  Revoked:", revoked);
  console.log("  Revoked At:", revokedAt.toString());

  console.log("\n========================================\n");

  // Test 2: Verify Ownership
  console.log("TEST 2: Verify Ownership");
  console.log("------------------------");
  
  const isOwner = await registry.read.verifyOwnership([metadataHash, recipientHash]);
  console.log("Is Owner (Correct Hash):", isOwner);

  const wrongHash = keccak256(toBytes("wrong@example.com"));
  const isNotOwner = await registry.read.verifyOwnership([metadataHash, wrongHash]);
  console.log("Is Owner (Wrong Hash):", isNotOwner);

  console.log("\n========================================\n");

  // Test 3: Register new version
  console.log("TEST 3: Register New Version");
  console.log("----------------------------");
  
  const metadataHash2 = keccak256(toBytes("certificate-metadata-1-v2"));
  const ipfsCid2 = "QmTestIPFS789012";

  console.log("New Version Input:");
  console.log("  Metadata Hash:", metadataHash2);
  console.log("  Certificate ID:", certId.toString(), "(same as v1)");
  console.log("  IPFS CID:", ipfsCid2);

  const hash2 = await registry.write.registerCertificate([
    metadataHash2,
    certId,
    ipfsCid2,
    recipientHash
  ]);
  console.log("  Transaction Hash:", hash2);

  // Retrieve both versions
  const cert1v2 = await registry.read.certificates([metadataHash]);
  const cert2v2 = await registry.read.certificates([metadataHash2]);
  
  const [, , , v1, , , , ] = cert1v2;
  const [, , , v2, , , , ] = cert2v2;
  
  console.log("\n📊 Version Comparison:");
  console.log("  Version 1 - Hash:", metadataHash);
  console.log("  Version 1 - Version Number:", v1.toString());
  console.log("  Version 2 - Hash:", metadataHash2);
  console.log("  Version 2 - Version Number:", v2.toString());

  const latestHash = await registry.read.getLatestCertificate([certId]);
  console.log("  Latest Hash:", latestHash);
  console.log("  Points to Version 2?", latestHash === metadataHash2);

  console.log("\n========================================\n");

  // Test 4: Revoke Certificate
  console.log("TEST 4: Revoke Certificate");
  console.log("---------------------------");
  
  const hash3 = await registry.write.revokeCertificate([metadataHash2, "Expired"]);
  console.log("  Revocation Reason: Expired");
  console.log("  Transaction Hash:", hash3);

  const revokedCert = await registry.read.certificates([metadataHash2]);
  const [revokedId, , , , , , revokedFlag, revokedAtTime] = revokedCert;
  
  console.log("\n📊 Revoked Certificate Data:");
  console.log("  Certificate ID:", revokedId.toString());
  console.log("  Revoked:", revokedFlag);
  console.log("  Revoked At:", new Date(Number(revokedAtTime) * 1000).toISOString());

  console.log("\n========================================\n");

  // Test 5: Validation
  console.log("TEST 5: Certificate Validation");
  console.log("------------------------------");
  
  const isValidV1 = await registry.read.isValidCertificate([metadataHash]);
  const isValidV2 = await registry.read.isValidCertificate([metadataHash2]);
  
  console.log("Version 1 Valid?", isValidV1, "(old version)");
  console.log("Version 2 Valid?", isValidV2, "(revoked)");

  console.log("\n========================================\n");

  // Summary
  console.log("📍 CONTRACT DEPLOYMENT SUMMARY");
  console.log("--------------------------------");
  console.log("Contract Address:", registry.address);
  console.log("\n✅ All tests completed successfully!");
  console.log("\n========================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
