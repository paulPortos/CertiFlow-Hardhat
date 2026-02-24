import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          // Add this to fix Ganache compatibility
          evmVersion: "paris"
        }
      },
      production: {
        version: "0.8.28",
        settings: {
          evmVersion: "paris", // Match it here too
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    ganache: {
      type: "http",            // Essential for external RPCs
      url: "http://127.0.0.1:7545",
      chainId: 1337,           // Default for Ganache; check your Ganache settings
      accounts: "remote",      // Tells Hardhat to use the accounts already in Ganache
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID",
      accounts: process.env.SEPOLIA_PRIVATE_KEY
        ? [process.env.SEPOLIA_PRIVATE_KEY]
        : [],
    },
    amoy: {
      type: "http",
      chainType: "l1",
      url: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/",
      chainId: 80002,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
});
