import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { keccak256, toBytes } from "viem";

describe("EntityRegistry", async () => {
    const { viem } = await network.connect();

    it("Should register and retrieve an entity", async () => {
        const registry = await viem.deployContract("EntityRegistry");

        const entityHash = keccak256(toBytes("entity-data-1"));
        const entityType = 0; // Organization
        const entityId = 1n;

        await registry.write.registerEntity([entityHash, entityType, entityId]);

        const entityData = await registry.read.entities([entityHash]);
        const [retType, retId, version, timestamp] = entityData;

        assert.equal(retType, entityType, "Entity type should match");
        assert.equal(retId, entityId, "Entity ID should match");
        assert.equal(version, 1n, "Initial version should be 1");
        assert.ok(timestamp > 0n, "Timestamp should be recorded");

        const verification = await registry.read.verifyEntity([entityHash]);
        const [exists, vType, vId, vVersion, vTimestamp] = verification;
        assert.equal(exists, true);
        assert.equal(vType, entityType);
        assert.equal(vId, entityId);
    });

    it("Should prevent duplicate hash registration", async () => {
        const registry = await viem.deployContract("EntityRegistry");

        const entityHash = keccak256(toBytes("entity-data-2"));
        await registry.write.registerEntity([entityHash, 1, 2n]); // Business, ID 2

        try {
            await registry.write.registerEntity([entityHash, 1, 2n]);
            assert.fail("Should not allow duplicate hash registration");
        } catch (err) {
            assert.ok(err, "Should throw error on duplicate hash");
        }
    });

    it("Should track entity versions and latest pointer", async () => {
        const registry = await viem.deployContract("EntityRegistry");

        const entityType = 0; // Org
        const entityId = 3n;

        // Version 1
        const hashV1 = keccak256(toBytes("org-3-data-v1"));
        await registry.write.registerEntity([hashV1, entityType, entityId]);

        // Version 2
        const hashV2 = keccak256(toBytes("org-3-data-v2"));
        await registry.write.registerEntity([hashV2, entityType, entityId]);

        // Verify V2 version number
        const v2Data = await registry.read.entities([hashV2]);
        assert.equal(v2Data[2], 2n, "Second registration should be version 2");

        // Verify Latest
        const latest = await registry.read.getLatestEntity([entityType, entityId]);
        assert.equal(latest, hashV2, "Latest should point to V2");

        // Verify isLatestVersion
        assert.equal(await registry.read.isLatestVersion([hashV1]), false, "V1 is not latest");
        assert.equal(await registry.read.isLatestVersion([hashV2]), true, "V2 is latest");
    });

    it("Should allow authorized registrars to register", async () => {
        const [owner, registrar] = await viem.getWalletClients();
        const registry = await viem.deployContract("EntityRegistry");

        await registry.write.addRegistrar([registrar.account.address]);

        // Connect as registrar (using the viem object correctly is important in viem / hardhat)
        const registryAsRegistrar = await viem.getContractAt(
            "EntityRegistry",
            registry.address,
            { client: { wallet: registrar } }
        );

        const hash = keccak256(toBytes("entity-auth"));
        await registryAsRegistrar.write.registerEntity([hash, 0, 4n]);

        const verification = await registry.read.verifyEntity([hash]);
        assert.equal(verification[0], true, "Registrar should successfully register entity");
    });
});
