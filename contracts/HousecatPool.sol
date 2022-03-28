// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './interfaces/IHousecatPool.sol';
import './HousecatFactory.sol';
import './HousecatManagement.sol';

contract HousecatPool is IHousecatPool, ERC20, Ownable {
  using SafeMath for uint;
  using SafeERC20 for IERC20;

  bool private initialized;
  HousecatFactory public override factory;
  HousecatManagement public override management;
  string private tokenName;
  string private tokenSymbol;

  modifier whenNotPaused() {
    require(!management.paused(), 'HousecatPool: paused');
    _;
  }

  constructor() ERC20('Housecat Pool Base', 'HCAT-Base') {}

  receive() external payable override {}

  function initialize(address _owner, address _factory, address _management) external override {
    require(!initialized, 'HousecatPool: already initialized');
    _transferOwnership(_owner);
    factory = HousecatFactory(payable(_factory));
    management = HousecatManagement(_management);
    tokenName = 'Housecat Pool Position';
    tokenSymbol = 'HCAT-PP';
    initialized = true;
  }

  function name() public view override(ERC20, IERC20Metadata) returns (string memory) {
    return tokenName;
  }

  function symbol() public view override(ERC20, IERC20Metadata) returns (string memory) {
    return tokenSymbol;
  }

  function deposit() external payable override whenNotPaused {
    // receives matic and trades it to wmatic
    // mints pool tokens and sends to the depositor
  }

  function withdraw(uint _amount, uint _minOutputAmount) external override {
    // receives pool tokens and burns them
    // sells assets pro rata the burned amount
    // sends bought matic to the withdrawer
  }

  function updateBalances() external {
    // only manager
    // caller passes trade paths and amounts
    // trade pairs and routers are validated from management settings
    // prices are validated on chain from ChainLink
  }
}