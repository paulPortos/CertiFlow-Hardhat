// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title EntityRegistry
 * @dev Unified contract to store entity (Organization/Business) credential hashes.
 * 
 * Stores:
 * - Entity hash (SHA-256)
 * - Entity type (Organization or Business)
 * - Entity ID (database ID)
 * - Version number
 * - Timestamp
 * 
 * Gas cost: ~55,000 gas per registration
 */
contract EntityRegistry {
    
    // ==========================================================================
    // ENUMS
    // ==========================================================================
    
    /// @dev Types of entities that can be registered
    enum EntityType { Organization, Business }
    
    // ==========================================================================
    // EVENTS
    // ==========================================================================
    
    /// @notice Emitted when a new entity is registered
    event EntityRegistered(
        bytes32 indexed entityHash,
        EntityType indexed entityType,
        uint256 indexed entityId,
        uint256 version,
        uint256 timestamp
    );
    
    /// @notice Emitted when an entity is updated (new version)
    event EntityUpdated(
        bytes32 indexed oldHash,
        bytes32 indexed newHash,
        EntityType entityType,
        uint256 indexed entityId,
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
    
    /// @dev Entity data structure
    struct Entity {
        EntityType entityType;
        uint256 entityId;
        uint256 version;
        uint256 timestamp;
    }
    
    /// @dev Mapping from entity hash to entity data
    mapping(bytes32 => Entity) public entities;
    
    /// @dev Mapping from (entityType, entityId) to their latest hash
    /// Key: keccak256(abi.encodePacked(entityType, entityId))
    mapping(bytes32 => bytes32) public latestEntity;
    
    /// @dev Contract owner (for admin functions)
    address public owner;
    address public pendingOwner;

    /// @dev Authorized registrars(backend addresses)
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
    
    /// @notice Register a new entity hash
    /// @param entityHash SHA-256 hash of the entity data
    /// @param entityType Type of entity (Organization or Business)
    /// @param entityId ID of the entity in the database
    /// @return success Whether the registration was successful
    function registerEntity(
        bytes32 entityHash,
        EntityType entityType,
        uint256 entityId
    ) external onlyAuthorized returns (bool success) {
        require(entities[entityHash].timestamp == 0, "Hash already registered");
        
        // Get composite key for this entity
        bytes32 entityKey = _getEntityKey(entityType, entityId);
        
        // Get current version
        bytes32 previousHash = latestEntity[entityKey];
        uint256 newVersion = 1;
        
        if (previousHash != bytes32(0)) {
            newVersion = entities[previousHash].version + 1;
        }
        
        // Store entity
        entities[entityHash] = Entity({
            entityType: entityType,
            entityId: entityId,
            version: newVersion,
            timestamp: block.timestamp
        });
        
        // Update latest entity hash
        latestEntity[entityKey] = entityHash;
        
        // Emit event
        if (previousHash != bytes32(0)) {
            emit EntityUpdated(
                previousHash,
                entityHash,
                entityType,
                entityId,
                newVersion,
                block.timestamp
            );
        } else {
            emit EntityRegistered(
                entityHash,
                entityType,
                entityId,
                newVersion,
                block.timestamp
            );
        }
        
        return true;
    }
    
    // ==========================================================================
    // VERIFICATION FUNCTIONS
    // ==========================================================================
    
    /// @notice Verify if an entity hash exists
    /// @param entityHash Hash to verify
    /// @return exists Whether the hash exists
    /// @return entityType The entity type
    /// @return entityId The entity ID (0 if not found)
    /// @return version The version number (0 if not found)
    /// @return timestamp When it was registered (0 if not found)
    function verifyEntity(bytes32 entityHash) 
        external 
        view 
        returns (
            bool exists,
            EntityType entityType,
            uint256 entityId,
            uint256 version,
            uint256 timestamp
        ) 
    {
        Entity memory entity = entities[entityHash];
        return (
            entity.timestamp != 0,
            entity.entityType,
            entity.entityId,
            entity.version,
            entity.timestamp
        );
    }
    
    /// @notice Get the latest hash for an entity
    /// @param entityType The entity type
    /// @param entityId The entity ID
    /// @return latestHash The latest hash (bytes32(0) if none)
    function getLatestEntity(EntityType entityType, uint256 entityId) 
        external 
        view 
        returns (bytes32 latestHash) 
    {
        bytes32 entityKey = _getEntityKey(entityType, entityId);
        return latestEntity[entityKey];
    }
    
    /// @notice Check if a hash is the latest for its entity
    /// @param entityHash Hash to check
    /// @return isLatest Whether this is the latest version
    function isLatestVersion(bytes32 entityHash) 
        external 
        view 
        returns (bool isLatest) 
    {
        if (entities[entityHash].timestamp == 0) {
            return false;
        }
        Entity memory entity = entities[entityHash];
        bytes32 entityKey = _getEntityKey(entity.entityType, entity.entityId);
        return latestEntity[entityKey] == entityHash;
    }
    
    // ==========================================================================
    // INTERNAL FUNCTIONS
    // ==========================================================================
    
    /// @dev Generate composite key for entity lookup
    function _getEntityKey(EntityType entityType, uint256 entityId) 
        internal 
        pure 
        returns (bytes32) 
    {
        return keccak256(abi.encodePacked(entityType, entityId));
    }
}
