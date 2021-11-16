pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract LockableERC20WithRoles is ERC20Burnable, AccessControl {
    struct TokenLock {
        uint256 amount;
        uint32 readyTime;
    }

    bytes32 public constant SUPER_USER_ROLE = keccak256("SUPER_USER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant LOCKER_ROLE = keccak256("LOCKER_ROLE");

    mapping(address => bool) private minters;
    mapping(address => bool) private lockers;

    mapping(address => TokenLock) public ownerToLock;

    modifier checkLock(address from, uint256 amount) {
        if (address(0) == from) {
            _;
            return;
        }

        TokenLock memory userLock = ownerToLock[msg.sender];

        uint256 lockAmount = userLock.amount;
        uint256 userBalance = balanceOf(msg.sender);
        uint256 availableBalance = userBalance - lockAmount;
        require(
            availableBalance >= amount || userLock.readyTime <= block.timestamp,
            "Amount greater then available balance"
        );
        _;
    }

    constructor() ERC20("ERC20WithRoles", "EWR") {
        _setupRole(SUPER_USER_ROLE, msg.sender);
        _setRoleAdmin(SUPER_USER_ROLE, SUPER_USER_ROLE);

        _setupRole(MINTER_ROLE, msg.sender);
        _setRoleAdmin(MINTER_ROLE, SUPER_USER_ROLE);

        _setupRole(LOCKER_ROLE, msg.sender);
        _setRoleAdmin(LOCKER_ROLE, SUPER_USER_ROLE);
    }

    function decimals() public pure override returns (uint8) {
        return 10;
    }

    function getLockValue(address _who) public view returns (uint256) {
        require(address(0) != _who, "Lock for zero address");

        TokenLock memory userLock = ownerToLock[_who];
        if (userLock.readyTime > block.timestamp) {
            return userLock.amount;
        }
        return 0;
    }

    function lock(
        address _who,
        uint256 _amount,
        uint256 _time
    ) public onlyRole(LOCKER_ROLE) {
        require(address(0) != _who, "Lock for zero address");
        require(_amount > 0, "Lock for zero amount");

        uint256 userBalance = balanceOf(_who);
        require(userBalance >= _amount, "lock amount exceeds balance");

        TokenLock memory tokenLock = TokenLock(
            _amount,
            uint32(block.timestamp + _time)
        );

        ownerToLock[_who] = tokenLock;
    }

    function mint(address account, uint256 amount)
        public
        onlyRole(MINTER_ROLE)
    {
        _mint(account, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override checkLock(from, amount) {}
}
