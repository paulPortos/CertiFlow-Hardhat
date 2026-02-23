// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CertificateRegistry
 * @dev Contract to store certificate metadata and IPFS links.
 * 
 * Implements "Split Storage" strategy:
 * - RAW: IPFS CID (Accessibility), Recipient Hash (Ownership), Cert ID (Link)
 * - HASHED: Metadata Hash (Integrity)
 */
contract CertificateRegistry {
    
    // ==========================================================================
    // EVENTS
    // ==========================================================================
    
    /// @notice Emitted when a new certificate is registered
    event CertificateRegistered(
        bytes32 indexed metadataHash,
        uint256 indexed certificateId,
        string ipfsCid,
        uint256 version,
        uint256 timestamp
    );
    
    /// @notice Emitted when a certificate is updated (new version)
    event CertificateUpdated(
        bytes32 indexed oldHash,
        bytes32 indexed newHash,
        uint256 indexed certificateId,
        uint256 version,
        uint256 timestamp
    );
    
    /// @notice Emitted when a certificate is revoked
    event CertificateRevoked(
        bytes32 indexed metadataHash,
        uint256 indexed certificateId,
        uint256 timestamp,
        string reason
    );
    
    /// @notice Emitted when ownership transfer is initiated
    event OwnershipTransferStarted(
        address indexed previousOwner,
        address indexed newOwner
    );
    
    // ==========================================================================
    // STORAGE
    // ==========================================================================
    
    /// @dev Certificate data structure
    struct Certificate {
        uint256 certificateId;  // Database ID
        string ipfsCid;         // IPFS Content/File ID
        bytes32 recipientHash;  // SHA-256(email + salt)
        uint256 version;        // Version number
        uint256 timestamp;      // Registration time
        bool revoked;           // Revocation flag
        uint256 revokedAt;      // Revocation time
    }
    
    /// @dev Mapping from Metadata Hash -> Certificate Data
    mapping(bytes32 => Certificate) public certificates;
    
    /// @dev Mapping from DB Certificate ID -> Latest Metadata Hash
    mapping(uint256 => bytes32) public latestCertificate;
    
    /// @dev Contract owner
    address public owner;
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
    
    /// @notice Register a certificate
    /// @param metadataHash SHA-256 hash of the JSON metadata
    /// @param certificateId ID of the certificate in the database
    /// @param ipfsCid IPFS Content Identifier
    /// @param recipientHash SHA-256 hash of recipient email
    /// @return success Whether the registration was successful
    function registerCertificate(
        bytes32 metadataHash,
        uint256 certificateId,
        string calldata ipfsCid,
        bytes32 recipientHash
    ) external onlyAuthorized returns (bool success) {
        require(certificates[metadataHash].timestamp == 0, "Hash already registered");
        require(bytes(ipfsCid).length > 0, "IPFS CID required");
        
        // Get current version logic
        bytes32 previousHash = latestCertificate[certificateId];
        uint256 newVersion = 1;
        
        if (previousHash != bytes32(0)) {
            newVersion = certificates[previousHash].version + 1;
        }
        
        // Store certificate
        certificates[metadataHash] = Certificate({
            certificateId: certificateId,
            ipfsCid: ipfsCid,
            recipientHash: recipientHash,
            version: newVersion,
            timestamp: block.timestamp,
            revoked: false,
            revokedAt: 0
        });
        
        // Update latest certificate hash for this ID
        latestCertificate[certificateId] = metadataHash;
        
        // Emit events
        if (previousHash != bytes32(0)) {
            emit CertificateUpdated(
                previousHash,
                metadataHash,
                certificateId,
                newVersion,
                block.timestamp
            );
        } else {
            emit CertificateRegistered(
                metadataHash,
                certificateId,
                ipfsCid,
                newVersion,
                block.timestamp
            );
        }
        
        return true;
    }
    
    /// @notice Revoke a certificate
    /// @param metadataHash Hash of the certificate to revoke
    /// @param reason Reason for revocation (logged in event only)
    function revokeCertificate(
        bytes32 metadataHash,
        string calldata reason
    ) external onlyAuthorized returns (bool success) {
        require(certificates[metadataHash].timestamp != 0, "Certificate not found");
        require(!certificates[metadataHash].revoked, "Already revoked");
        
        certificates[metadataHash].revoked = true;
        certificates[metadataHash].revokedAt = block.timestamp;
        
        emit CertificateRevoked(
            metadataHash,
            certificates[metadataHash].certificateId,
            block.timestamp,
            reason
        );
        
        return true;
    }
    
    // ==========================================================================
    // VERIFICATION FUNCTIONS
    // ==========================================================================
    
    /// @notice Verify a certificate by hash
    function verifyCertificate(bytes32 metadataHash) 
        external 
        view 
        returns (
            bool exists,
            uint256 certificateId,
            string memory ipfsCid,
            bytes32 recipientHash,
            uint256 version,
            uint256 timestamp,
            bool revoked
        ) 
    {
        Certificate memory cert = certificates[metadataHash];
        return (
            cert.timestamp != 0,
            cert.certificateId,
            cert.ipfsCid,
            cert.recipientHash,
            cert.version,
            cert.timestamp,
            cert.revoked
        );
    }
    
    /// @notice Check if a certificate belongs to a user (Proof of Ownership)
    /// @param metadataHash The certificate hash
    /// @param userEmailHash Hash of the user's email to match against
    function verifyOwnership(bytes32 metadataHash, bytes32 userEmailHash)
        external
        view
        returns (bool isOwner)
    {
        if (certificates[metadataHash].timestamp == 0) return false;
        return certificates[metadataHash].recipientHash == userEmailHash;
    }
    
    /// @notice Get latest hash for a certificate ID
    function getLatestCertificate(uint256 certificateId) 
        external 
        view 
        returns (bytes32 latestHash) 
    {
        return latestCertificate[certificateId];
    }
    
    /// @notice Check if hash is latest and valid
    function isValidCertificate(bytes32 metadataHash) 
        external 
        view 
        returns (bool isValid) 
    {
        Certificate memory cert = certificates[metadataHash];
        if (cert.timestamp == 0 || cert.revoked) {
            return false;
        }
        return latestCertificate[cert.certificateId] == metadataHash;
    }
}
