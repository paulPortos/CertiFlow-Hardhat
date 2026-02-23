// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AttachmentRegistry
 * @dev Unified contract to store attachment file hashes for Organizations and Businesses.
 *
 * Stores:
 * - File hash (SHA-256)
 * - Entity type (Organization or Business)
 * - Entity ID (database ID)
 * - Attachment type (sec_registration, business_permit, etc.)
 * - Version number (auto-incremented on re-registration)
 * - Timestamp
 *
 * Versioning strategy (mirrors CertificateRegistry):
 * - Each new file hash for the same (entityType, entityId, attachmentType) is a new version.
 * - Old hashes remain queryable on-chain for full audit history.
 * - `latestAttachment` always points to the most recently registered hash per slot.
 *
 * Gas cost: ~60,000 gas per registration
 */
contract AttachmentRegistry {

    // ==========================================================================
    // ENUMS
    // ==========================================================================

    /// @dev Types of entities that can have attachments
    enum EntityType { Organization, Business }

    /// @dev Types of attachments (saves gas vs string storage)
    enum AttachmentType {
        SecRegistration,        // 0
        AccreditationCert,      // 1
        BusinessPermit,         // 2
        TaxCertificate,         // 3
        GovernmentId,           // 4
        Other                   // 5
    }

    // ==========================================================================
    // EVENTS
    // ==========================================================================

    /// @notice Emitted when a new attachment is registered for the first time
    event AttachmentRegistered(
        bytes32 indexed fileHash,
        EntityType indexed entityType,
        uint256 indexed entityId,
        uint8 attachmentType,
        uint256 version,
        uint256 timestamp
    );

    /// @notice Emitted when an existing attachment slot is updated (new version)
    event AttachmentUpdated(
        bytes32 indexed oldHash,
        bytes32 indexed newHash,
        EntityType indexed entityType,
        uint256 entityId,
        uint8 attachmentType,
        uint256 version,
        uint256 timestamp
    );

    /// @notice Emitted when ownership transfer is initiated
    event OwnershipTransferStarted(
        address indexed previousOwner,
        address indexed newOwner
    );

    // ==========================================================================
    // STORAGE
    // ==========================================================================

    /// @dev Attachment data structure
    struct Attachment {
        EntityType entityType;
        uint256 entityId;
        uint8 attachmentType;
        uint256 timestamp;
        uint256 version;        // Version number (1-based, auto-incremented)
    }

    /// @dev Mapping from file hash -> attachment data
    mapping(bytes32 => Attachment) public attachments;

    /// @dev Mapping from slot key -> latest file hash for that slot
    /// Key: keccak256(abi.encodePacked(entityType, entityId, attachmentType))
    mapping(bytes32 => bytes32) public latestAttachment;

    /// @dev Contract owner
    address public owner;

    /// @dev Pending owner for two-step transfer
    address public pendingOwner;

    /// @dev Authorized registrars (backend addresses)
    mapping(address => bool) public authorizedRegistrars;

    // ==========================================================================
    // MODIFIERS
    // ==========================================================================

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedRegistrars[msg.sender] || msg.sender == owner, "Not authorized");
        _;
    }

    // ==========================================================================
    // CONSTRUCTOR
    // ==========================================================================

    constructor() {
        owner = msg.sender;
        authorizedRegistrars[msg.sender] = true;
    }

    // ==========================================================================
    // ADMIN FUNCTIONS
    // ==========================================================================

    /// @notice Add an authorized registrar address
    function addRegistrar(address registrar) external onlyOwner {
        authorizedRegistrars[registrar] = true;
    }

    /// @notice Remove an authorized registrar address
    function removeRegistrar(address registrar) external onlyOwner {
        authorizedRegistrars[registrar] = false;
    }

    /// @notice Start ownership transfer (two-step)
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    /// @notice Accept ownership transfer
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Not pending owner");
        owner = pendingOwner;
        pendingOwner = address(0);
    }

    // ==========================================================================
    // REGISTRATION FUNCTIONS
    // ==========================================================================

    /// @notice Register or update an attachment file hash.
    ///
    /// If this is the first registration for (entityType, entityId, attachmentType),
    /// it creates version 1 and emits `AttachmentRegistered`.
    ///
    /// If the slot already has a previous version, it creates a new version,
    /// updates the `latestAttachment` pointer, and emits `AttachmentUpdated`.
    /// The old hash entry is preserved for audit history.
    ///
    /// @param fileHash SHA-256 hash of the file content (must be unique — new file = new hash)
    /// @param entityType Type of entity (Organization or Business)
    /// @param entityId ID of the entity in the database
    /// @param attachmentType Type of attachment (uint8 enum value)
    /// @return success Whether the registration was successful
    function registerAttachment(
        bytes32 fileHash,
        EntityType entityType,
        uint256 entityId,
        uint8 attachmentType
    ) external onlyAuthorized returns (bool success) {
        require(attachments[fileHash].timestamp == 0, "Hash already registered");

        // Determine slot and previous version
        bytes32 slotKey = _getSlotKey(entityType, entityId, attachmentType);
        bytes32 previousHash = latestAttachment[slotKey];
        uint256 newVersion = 1;

        if (previousHash != bytes32(0)) {
            newVersion = attachments[previousHash].version + 1;
        }

        // Store new attachment entry
        attachments[fileHash] = Attachment({
            entityType: entityType,
            entityId: entityId,
            attachmentType: attachmentType,
            timestamp: block.timestamp,
            version: newVersion
        });

        // Update the latest pointer for this slot
        latestAttachment[slotKey] = fileHash;

        // Emit appropriate event
        if (previousHash != bytes32(0)) {
            emit AttachmentUpdated(
                previousHash,
                fileHash,
                entityType,
                entityId,
                attachmentType,
                newVersion,
                block.timestamp
            );
        } else {
            emit AttachmentRegistered(
                fileHash,
                entityType,
                entityId,
                attachmentType,
                newVersion,
                block.timestamp
            );
        }

        return true;
    }

    // ==========================================================================
    // VERIFICATION FUNCTIONS
    // ==========================================================================

    /// @notice Verify if an attachment file hash exists and get its data.
    /// @param fileHash Hash to verify
    /// @return exists Whether the hash exists
    /// @return entityType The entity type
    /// @return entityId The entity ID (0 if not found)
    /// @return attachmentType The type of attachment (0 if not found)
    /// @return timestamp When it was registered (0 if not found)
    /// @return version The version number of this entry (0 if not found)
    function verifyAttachment(bytes32 fileHash)
        external
        view
        returns (
            bool exists,
            EntityType entityType,
            uint256 entityId,
            uint8 attachmentType,
            uint256 timestamp,
            uint256 version
        )
    {
        Attachment memory att = attachments[fileHash];
        return (
            att.timestamp != 0,
            att.entityType,
            att.entityId,
            att.attachmentType,
            att.timestamp,
            att.version
        );
    }

    /// @notice Get the latest file hash for a given entity + attachment type slot.
    /// @param entityType The entity type
    /// @param entityId The entity ID
    /// @param attachmentType The attachment type
    /// @return fileHash The latest file hash (bytes32(0) if none registered)
    function getLatestAttachment(
        EntityType entityType,
        uint256 entityId,
        uint8 attachmentType
    )
        external
        view
        returns (bytes32 fileHash)
    {
        bytes32 slotKey = _getSlotKey(entityType, entityId, attachmentType);
        return latestAttachment[slotKey];
    }

    /// @notice Check if a given file hash is the latest version for its slot.
    /// @param fileHash Hash to check
    /// @return isLatest Whether this hash is the current latest for its slot
    function isLatestAttachment(bytes32 fileHash)
        external
        view
        returns (bool isLatest)
    {
        if (attachments[fileHash].timestamp == 0) {
            return false;
        }
        Attachment memory att = attachments[fileHash];
        bytes32 slotKey = _getSlotKey(att.entityType, att.entityId, att.attachmentType);
        return latestAttachment[slotKey] == fileHash;
    }

    /// @notice Get the file hash for an entity's attachment type (alias for getLatestAttachment)
    /// @param entityType The entity type
    /// @param entityId The entity ID
    /// @param attachmentType The attachment type
    /// @return fileHash The latest file hash (bytes32(0) if none)
    function getAttachmentHash(
        EntityType entityType,
        uint256 entityId,
        uint8 attachmentType
    )
        external
        view
        returns (bytes32 fileHash)
    {
        bytes32 slotKey = _getSlotKey(entityType, entityId, attachmentType);
        return latestAttachment[slotKey];
    }

    /// @notice Check if a specific entity+type combination has a registered attachment
    /// @param entityType The entity type
    /// @param entityId The entity ID
    /// @param attachmentType The attachment type
    /// @return hasAttachment Whether an attachment is registered
    function hasRegisteredAttachment(
        EntityType entityType,
        uint256 entityId,
        uint8 attachmentType
    )
        external
        view
        returns (bool hasAttachment)
    {
        bytes32 slotKey = _getSlotKey(entityType, entityId, attachmentType);
        return latestAttachment[slotKey] != bytes32(0);
    }

    // ==========================================================================
    // INTERNAL FUNCTIONS
    // ==========================================================================

    /// @dev Generate composite slot key for (entityType, entityId, attachmentType) lookup
    function _getSlotKey(
        EntityType entityType,
        uint256 entityId,
        uint8 attachmentType
    )
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(entityType, entityId, attachmentType));
    }
}
