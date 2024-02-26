// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts v4.4.1 (utils/Strings.sol)

pragma solidity ^0.8.0;

interface INameWrapper {
    function ownerOf(uint256 id) external view returns(address owner);
}

interface ENS {
function owner(bytes32 node) external view returns(address);
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _transferOwnership(_msgSender());
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _checkOwner() internal view virtual {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

interface ISupportsInterface {
    function supportsInterface(bytes4 interfaceID) external pure returns(bool);
}


interface IExtendedResolver {
    function resolve(bytes memory name, bytes memory data) external view returns(bytes memory);
}

abstract contract SupportsInterface is ISupportsInterface {
    function supportsInterface(bytes4 interfaceID) virtual override public pure returns(bool) {
        return interfaceID == type(ISupportsInterface).interfaceId;
    }
}

interface IResolverService {
    function resolve(bytes calldata name, bytes calldata data) external view returns(bytes memory result, uint64 expires, bytes memory sig);
}

/**
 * Implements an ENS resolver that directs all queries to a CCIP read gateway.
 * Callers must implement EIP 3668 and ENSIP 10.
 */
contract OptimismResolver is IExtendedResolver, SupportsInterface, Ownable {
    string public url;
    error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData);

    ENS immutable ens = ENS(0x......................); //ENS registry address
    INameWrapper immutable nameWrapper = INameWrapper(0x.........................); //ENS namewrapper address

    constructor(string memory _url) {
        url = _url;
    }
    
    function setGateway(string memory _url) external onlyOwner{
        url = _url;
    }

    function decodeData(bytes memory callData) public pure returns(bytes32 node) {
        bytes4 functionSelector;
        uint256 coinType;
        string memory key;
        assembly {
            functionSelector:= mload(add(callData, 0x20))
        }
        bytes memory callDataWithoutSelector = new bytes(callData.length - 4);
        for (uint256 i = 0; i < callData.length - 4; i++) {
            callDataWithoutSelector[i] = callData[i + 4];
        }
        if (functionSelector == bytes4(keccak256("addr(bytes32)"))) {
            (node) = abi.decode(callDataWithoutSelector, (bytes32));
        } if (functionSelector == bytes4(keccak256("addr(bytes32,uint256)"))) {
            (node,coinType) = abi.decode(callDataWithoutSelector, (bytes32, uint256));
        } if (functionSelector == bytes4(keccak256("contenthash(bytes32)"))) {
            (node) = abi.decode(callDataWithoutSelector, (bytes32));
        } if (functionSelector == bytes4(keccak256("text(bytes32,string)"))) {
            (node, key) = abi.decode(callDataWithoutSelector, (bytes32, string));
        }
    }
    
    function resolve(bytes calldata name, bytes calldata data) external view returns(bytes memory) {
        bytes32 node = decodeData(data);
        address owner = ens.owner(node);
        if (owner == address(nameWrapper)) { owner = nameWrapper.ownerOf(uint256(node)); }
        bytes memory callData = abi.encode(name, data, owner);
        string[] memory urls = new string[](1);
        urls[0] = url;
        revert OffchainLookup(
            address(this),
            urls,
            callData,
            OptimismResolver.ccip.selector,
            callData
        );
    }

    /**
     * Callback used by CCIP read compatible clients to parse the response.
     */
    function ccip(bytes calldata response, bytes calldata extraData) external pure returns(bytes memory) {
        return response;
    }

    function supportsInterface(bytes4 interfaceID) public pure override returns(bool) {
        return interfaceID == type(IExtendedResolver).interfaceId || super.supportsInterface(interfaceID);
    }
}
