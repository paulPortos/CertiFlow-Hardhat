import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { keccak256, toBytes } from "viem";

describe("AttachmentRegistry", async () => {
    const { viem } = await network.connect();

    it("Should register and retrieve an attachment", async () => {
        const registry = await viem.deployContract("AttachmentRegistry");

        const fileHash = keccak256(toBytes("attachment-pdf-data"));
        const entityType = 1; // Business
        const entityId = 10n;
        const attachmentType = 2; // BusinessPermit

        await registry.write.registerAttachment([
            fileHash,
            entityType,
            entityId,
            attachmentType
        ]);

        const attData = await registry.read.attachments([fileHash]);
        const [retEntityType, retEntityId, retAttType, timestamp, version] = attData;

        assert.equal(retEntityType, entityType, "Entity type should match");
        assert.equal(retEntityId, entityId, "Entity ID should match");
        assert.equal(retAttType, attachmentType, "Attachment type should match");
        assert.equal(version, 1n, "Initial version should be 1");
        assert.ok(timestamp > 0n, "Timestamp should be recorded");

        const verification = await registry.read.verifyAttachment([fileHash]);
        const [exists, vType, vId, vAttType, vTimestamp, vVersion] = verification;
        assert.equal(exists, true);
        assert.equal(vVersion, 1n);
    });

    it("Should prevent duplicate hash registration", async () => {
        const registry = await viem.deployContract("AttachmentRegistry");

        const fileHash = keccak256(toBytes("attachment-dup"));
        await registry.write.registerAttachment([fileHash, 0, 1n, 0]);

        try {
            await registry.write.registerAttachment([fileHash, 0, 1n, 0]);
            assert.fail("Should not allow duplicate hash registration");
        } catch (err) {
            assert.ok(err, "Should throw error on duplicate hashing");
        }
    });

    it("Should track attachment versions and latest pointer", async () => {
        const registry = await viem.deployContract("AttachmentRegistry");

        const entityType = 0; // Org
        const entityId = 3n;
        const attachmentType = 0; // SecRegistration

        // Version 1
        const hashV1 = keccak256(toBytes("sec-doc-v1"));
        await registry.write.registerAttachment([hashV1, entityType, entityId, attachmentType]);

        // Version 2
        const hashV2 = keccak256(toBytes("sec-doc-v2"));
        await registry.write.registerAttachment([hashV2, entityType, entityId, attachmentType]);

        // Verify V2 version number
        const v2Data = await registry.read.attachments([hashV2]);
        assert.equal(v2Data[4], 2n, "Second registration should be version 2");

        // Verify Latest
        const latest = await registry.read.getLatestAttachment([entityType, entityId, attachmentType]);
        assert.equal(latest, hashV2, "Latest should point to V2");

        // Verify isLatestAttachment
        assert.equal(await registry.read.isLatestAttachment([hashV1]), false, "V1 is not latest");
        assert.equal(await registry.read.isLatestAttachment([hashV2]), true, "V2 is latest");

        // Verify hasRegisteredAttachment
        const hasReg = await registry.read.hasRegisteredAttachment([entityType, entityId, attachmentType]);
        assert.equal(hasReg, true, "Should report having an attachment");

        // Check unregistered slot
        const hasUnreg = await registry.read.hasRegisteredAttachment([entityType, entityId, 1]); // AccreditationCert
        assert.equal(hasUnreg, false, "Should not report having unregistered attachment");
    });

    it("Should allow authorized registrars to register attachments", async () => {
        const [owner, registrar] = await viem.getWalletClients();
        const registry = await viem.deployContract("AttachmentRegistry");

        await registry.write.addRegistrar([registrar.account.address]);

        const registryAsRegistrar = await viem.getContractAt(
            "AttachmentRegistry",
            registry.address,
            { client: { wallet: registrar } }
        );

        const hash = keccak256(toBytes("attachment-auth"));
        await registryAsRegistrar.write.registerAttachment([hash, 0, 4n, 0]);

        const verification = await registry.read.verifyAttachment([hash]);
        assert.equal(verification[0], true, "Registrar should successfully register attachment");
    });
});
