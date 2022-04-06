// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './interfaces/IWETH.sol';
import './HousecatQueries.sol';
import './HousecatFactory.sol';
import './HousecatManagement.sol';
import './structs/PoolAction.sol';

contract HousecatPool is HousecatQueries, ERC20, Ownable {
  using SafeMath for uint;

  bool private initialized;
  HousecatFactory public factory;
  HousecatManagement public management;
  string private tokenName;
  string private tokenSymbol;

  modifier whenNotPaused() {
    require(!management.paused(), 'HousecatPool: paused');
    _;
  }

  constructor() ERC20('Housecat Pool Base', 'HCAT-Base') {}

  receive() external payable {}

  function initialize(
    address _owner,
    address _factory,
    address _management
  ) external {
    require(!initialized, 'HousecatPool: already initialized');
    _transferOwnership(_owner);
    factory = HousecatFactory(payable(_factory));
    management = HousecatManagement(_management);
    tokenName = 'Housecat Pool Position'; // TODO: let manager set name and symbol
    tokenSymbol = 'HCAT-PP';
    initialized = true;
  }

  function name() public view override(ERC20) returns (string memory) {
    return tokenName;
  }

  function symbol() public view override(ERC20) returns (string memory) {
    return tokenSymbol;
  }

  function getBalances() external view returns (uint[] memory) {
    address[] memory tokens = management.getSupportedTokens();
    return _getTokenBalances(address(this), tokens);
  }

  function deposit() external payable whenNotPaused {
    uint poolValueStart = _getPoolValue();
    address weth = management.weth();
    uint amountWethBought = _buyWETH(weth, msg.value);
    TokenMeta memory wethMeta = management.getTokenMeta(weth);
    uint wethPrice = _getTokenPrice(wethMeta.priceFeed);
    uint depositValue = _getTokenValue(amountWethBought, wethPrice, wethMeta.decimals);
    if (totalSupply() == 0) {
      _mint(msg.sender, depositValue);
    } else {
      uint amountMint = totalSupply().mul(depositValue).div(poolValueStart);
      _mint(msg.sender, amountMint);
    }
  }

  function withdraw(
    uint _amount,
    PoolAction[] memory _actions,
    address _to
  ) external {
    require(this.balanceOf(msg.sender) >= _amount, 'HousecatPool: withdrawal exceeds balance');
    uint shareInPool = _amount.mul(PERCENT_100).div(totalSupply());
    uint poolValueBefore = _getPoolValue();
    uint maxWithdrawValue = poolValueBefore.mul(shareInPool).div(PERCENT_100);
    // TODO: check weights before ~ after
    uint balanceETHBefore = address(this).balance;
    for (uint i = 0; i < _actions.length; i++) {
      require(management.isWithdrawerAdapter(_actions[i].adapter), 'HousecatPool: unsupported adapter');
      (bool success, bytes memory message) = _actions[i].adapter.delegatecall(_actions[i].data);
      require(success, string(message));
    }
    uint actualWithdrawValue = poolValueBefore.sub(_getPoolValue());
    require(maxWithdrawValue >= actualWithdrawValue, 'HousecatPool: withdraw value too high');
    _burn(msg.sender, _amount); // TODO: burn tokens only for the amount corresponding to the actual withdrawn value
    uint balanceETHReceived = address(this).balance.sub(balanceETHBefore);
    (bool sent, ) = _to.call{value: balanceETHReceived}('');
    require(sent, 'HousecatPool: send ETH failed');
  }

  function manageAssets(PoolAction[] memory _actions) external onlyOwner {
    for (uint i = 0; i < _actions.length; i++) {
      require(management.isManagerAdapter(_actions[i].adapter), 'HousecatPool: unsupported adapter');
      (bool success, bytes memory message) = _actions[i].adapter.delegatecall(_actions[i].data);
      require(success, string(message));
    }
    // TODO: require pool value doesn't drop more than a specified % slippage limit
    // TODO: validate cumulative value drop over N days period is less than a specified % limit
  }

  function _buyWETH(address _weth, uint _amount) internal returns (uint) {
    uint amountBeforeDeposit = IWETH(_weth).balanceOf(address(this));
    IWETH(_weth).deposit{value: _amount}();
    return IWETH(_weth).balanceOf(address(this)).sub(amountBeforeDeposit);
  }

  function _getTokenPrice(address _priceFeed) internal view returns (uint) {
    address[] memory priceFeeds = new address[](1);
    priceFeeds[0] = _priceFeed;
    return _getTokenPrices(priceFeeds)[0];
  }

  function _mapTokensMeta(TokenMeta[] memory _tokensMeta) internal pure returns (address[] memory, uint[] memory) {
    address[] memory priceFeeds = new address[](_tokensMeta.length);
    uint[] memory decimals = new uint[](_tokensMeta.length);
    for (uint i; i < _tokensMeta.length; i++) {
      priceFeeds[i] = _tokensMeta[i].priceFeed;
      decimals[i] = _tokensMeta[i].decimals;
    }
    return (priceFeeds, decimals);
  }

  function _getPoolValue() internal view returns (uint) {
    return _getPoolGrossValue().sub(_getPoolLoanValue());
  }

  function _getPoolGrossValue() internal view returns (uint) {
    (address[] memory tokens, TokenMeta[] memory tokensMeta) = management.getTokensWithMeta();
    uint[] memory tokenBalances = _getTokenBalances(address(this), tokens);
    (address[] memory priceFeeds, uint[] memory decimals) = _mapTokensMeta(tokensMeta);
    uint[] memory tokenPrices = _getTokenPrices(priceFeeds);
    return _getTotalValue(tokenBalances, tokenPrices, decimals);
  }

  function _getPoolLoanValue() internal pure returns (uint) {
    // TODO: resolve total value of loan positions
    return 0;
  }
}
