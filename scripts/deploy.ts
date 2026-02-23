import { network } from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("\n=======================================================");
    console.log("  CERTIFLOW SMART CONTRACT DEPLOYMENT (LOCAL / GANACHE)");
    console.log("=======================================================\n");

    const { viem } = await network.connect();

    const networkName = (network as any).name || "hardhat";
    console.log(`📡 Connecting to network: ${networkName}`);

    // 1. Deploy CertificateRegistry
    console.log("\n📝 Deploying CertificateRegistry...");
    const certRegistry = await viem.deployContract("CertificateRegistry");
    console.log("✅ CertificateRegistry deployed at:", certRegistry.address);

    // 2. Deploy EntityRegistry
    console.log("\n📝 Deploying EntityRegistry...");
    const entityRegistry = await viem.deployContract("EntityRegistry");
    console.log("✅ EntityRegistry deployed at:", entityRegistry.address);

    // 3. Deploy AttachmentRegistry
    console.log("\n📝 Deploying AttachmentRegistry...");
    const attachmentRegistry = await viem.deployContract("AttachmentRegistry");
    console.log("✅ AttachmentRegistry deployed at:", attachmentRegistry.address);

    console.log("\n=======================================================");
    console.log("               🎉 DEPLOYMENT COMPLETE 🎉               ");
    console.log("=======================================================\n");

    console.log("Copy and paste the following into your API's .env file:\n");

    console.log(`CERTIFICATE_REGISTRY_CONTRACT_ADDRESS=${certRegistry.address}`);
    console.log(`ENTITY_REGISTRY_CONTRACT_ADDRESS=${entityRegistry.address}`);
    console.log(`ATTACHMENT_REGISTRY_CONTRACT_ADDRESS=${attachmentRegistry.address}`);
    console.log("");

    // Also save it to a local JSON file for easy reference
    const deployData = {
        network: networkName,
        timestamp: new Date().toISOString(),
        contracts: {
            CertificateRegistry: certRegistry.address,
            EntityRegistry: entityRegistry.address,
            AttachmentRegistry: attachmentRegistry.address,
        }
    };

    const outputDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    fs.writeFileSync(
        path.join(outputDir, `${networkName}.json`),
        JSON.stringify(deployData, null, 2)
    );

    console.log(`💾 Saved addresses to deployments/${networkName}.json\n`);
}

main().catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exitCode = 1;
});
