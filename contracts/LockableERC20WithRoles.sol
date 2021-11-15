pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LockableERC20WithRoles is ERC20Burnable {
    struct TokenLock {
        uint256 amount;
        uint32 readyTime;
    }

    mapping(address => bool) private superUsers;
    mapping(address => bool) private minters;
    mapping(address => bool) private lockers;

    mapping(address => TokenLock) public ownerToLock;

    modifier onlySuperUser() {
        require(superUsers[msg.sender], "Only for super user");
        _;
    }

    modifier onlyMinter() {
        require(minters[msg.sender], "Only for minter");
        _;
    }

    modifier onlyLocker() {
        require(lockers[msg.sender], "Only for locker");
        _;
    }

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
        superUsers[msg.sender] = true;
    }

    function isSuperUser(address _who) public view returns (bool) {
        require(address(0) != _who, "isSuperUser for zero address");
        return superUsers[_who];
    }

    function isMinter(address _who) public view returns (bool) {
        require(address(0) != _who, "isMinter for zero address");
        return minters[_who];
    }

    function isLocker(address _who) public view returns (bool) {
        require(address(0) != _who, "isLocker for zero address");
        return lockers[_who];
    }

    function decimals() public pure override returns (uint8) {
        return 10;
    }

    function setSuperUserRole(address _who, bool _value) public onlySuperUser {
        require(address(0) != _who, "Role superUser for zero address");
        require(superUsers[_who] != _value, "Same super user value in storage");
        superUsers[_who] = _value;
    }

    function setMinterRole(address _who, bool _value) public onlySuperUser {
        require(address(0) != _who, "Role minter for zero address");
        require(minters[_who] != _value, "Same minter value in storage");
        minters[_who] = _value;
    }

    function setLockerRole(address _who, bool _value) public onlySuperUser {
        require(address(0) != _who, "Role locker for zero address");
        require(lockers[_who] != _value, "Same locker value in storage");
        lockers[_who] = _value;
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
    ) public onlyLocker {
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

    function mint(address account, uint256 amount) public onlyMinter {
        _mint(account, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override checkLock(from, amount) {}
}
