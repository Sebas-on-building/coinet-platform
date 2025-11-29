// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract VerifiedNews is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    struct NewsItem {
        string title;
        string content;
        uint256 timestamp;
        address signer;
        address project;
        string signature;
        bool isValid;
        uint256 version;
    }

    struct Project {
        address owner;
        string name;
        bool isVerified;
        uint256 lastUpdate;
        mapping(address => bool) authorizedSigners;
    }

    Counters.Counter private _newsIds;
    mapping(uint256 => NewsItem) private _news;
    mapping(address => Project) private _projects;
    mapping(string => bool) private _usedSignatures;
    mapping(address => uint256[]) private _projectNews;

    event NewsPublished(uint256 indexed newsId, address indexed project, address indexed signer);
    event ProjectRegistered(address indexed project, string name);
    event SignerAuthorized(address indexed project, address indexed signer);
    event SignerRevoked(address indexed project, address indexed signer);
    event NewsUpdated(uint256 indexed newsId, uint256 version);

    modifier onlyProjectOwner(address project) {
        require(_projects[project].owner == msg.sender, "Not project owner");
        _;
    }

    modifier onlyAuthorizedSigner(address project) {
        require(_projects[project].authorizedSigners[msg.sender], "Not authorized signer");
        _;
    }

    modifier onlyVerifiedProject(address project) {
        require(_projects[project].isVerified, "Project not verified");
        _;
    }

    function registerProject(string memory name) external {
        require(_projects[msg.sender].owner == address(0), "Project already registered");
        
        Project storage project = _projects[msg.sender];
        project.owner = msg.sender;
        project.name = name;
        project.isVerified = false;
        project.lastUpdate = block.timestamp;
        project.authorizedSigners[msg.sender] = true;

        emit ProjectRegistered(msg.sender, name);
    }

    function verifyProject(address project) external onlyOwner {
        require(_projects[project].owner != address(0), "Project not registered");
        _projects[project].isVerified = true;
        _projects[project].lastUpdate = block.timestamp;
    }

    function authorizeSigner(address signer) external onlyProjectOwner(msg.sender) {
        _projects[msg.sender].authorizedSigners[signer] = true;
        emit SignerAuthorized(msg.sender, signer);
    }

    function revokeSigner(address signer) external onlyProjectOwner(msg.sender) {
        _projects[msg.sender].authorizedSigners[signer] = false;
        emit SignerRevoked(msg.sender, signer);
    }

    function publishNews(
        string memory title,
        string memory content,
        string memory signature
    ) external nonReentrant onlyAuthorizedSigner(msg.sender) onlyVerifiedProject(msg.sender) {
        require(!_usedSignatures[signature], "Signature already used");
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(content).length > 0, "Content cannot be empty");

        _newsIds.increment();
        uint256 newsId = _newsIds.current();

        NewsItem storage news = _news[newsId];
        news.title = title;
        news.content = content;
        news.timestamp = block.timestamp;
        news.signer = msg.sender;
        news.project = msg.sender;
        news.signature = signature;
        news.isValid = true;
        news.version = 1;

        _usedSignatures[signature] = true;
        _projectNews[msg.sender].push(newsId);

        emit NewsPublished(newsId, msg.sender, msg.sender);
    }

    function updateNews(
        uint256 newsId,
        string memory newContent,
        string memory newSignature
    ) external nonReentrant onlyAuthorizedSigner(msg.sender) {
        require(_news[newsId].project == msg.sender, "Not news owner");
        require(!_usedSignatures[newSignature], "Signature already used");
        require(bytes(newContent).length > 0, "Content cannot be empty");

        NewsItem storage news = _news[newsId];
        news.content = newContent;
        news.signature = newSignature;
        news.version += 1;
        news.timestamp = block.timestamp;

        _usedSignatures[newSignature] = true;

        emit NewsUpdated(newsId, news.version);
    }

    function getNews(uint256 newsId) external view returns (
        string memory title,
        string memory content,
        uint256 timestamp,
        address signer,
        address project,
        string memory signature,
        bool isValid,
        uint256 version
    ) {
        NewsItem storage news = _news[newsId];
        return (
            news.title,
            news.content,
            news.timestamp,
            news.signer,
            news.project,
            news.signature,
            news.isValid,
            news.version
        );
    }

    function getProjectNews(address project) external view returns (uint256[] memory) {
        return _projectNews[project];
    }

    function isAuthorizedSigner(address project, address signer) external view returns (bool) {
        return _projects[project].authorizedSigners[signer];
    }

    function getProjectInfo(address project) external view returns (
        address owner,
        string memory name,
        bool isVerified,
        uint256 lastUpdate
    ) {
        Project storage p = _projects[project];
        return (p.owner, p.name, p.isVerified, p.lastUpdate);
    }
} 