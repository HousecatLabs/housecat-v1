// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '../interfaces/IWETH.sol';
import './HousecatQueries.sol';
import './HousecatFactory.sol';
import './HousecatManagement.sol';

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

  function getWeights() external view returns (uint[] memory, uint) {
    return _getWeights();
  }

  function getValue() external view returns (uint) {
    return _getValue();
  }

  function deposit(bytes[] calldata _data) external payable whenNotPaused {
    // keep track of balances before deposit
    uint poolValueBefore = _getValue();
    uint ethBalanceBefore = address(this).balance.sub(msg.value);

    // swap the sent eth to weth
    _buyWETH(management.weth(), msg.value);

    // execute deposit transactions
    address adapter = management.depositAdapter();
    for (uint i = 0; i < _data.length; i++) {
      (bool success, bytes memory result) = adapter.delegatecall(_data[i]);
      require(success, string(result));
    }

    // TODO: validate that token weights haven't changed too much
    uint poolValueAfter = _getValue();
    uint depositValue = poolValueAfter.sub(poolValueBefore);
    uint ethBalanceAfter = address(this).balance;

    // validate balances after deposit
    require(ethBalanceAfter >= ethBalanceBefore, 'HousecatPool: ETH balance reduced on deposit');

    // mint pool tokens corresponding the deposit value
    uint amountMint = depositValue;
    if (totalSupply() > 0) {
      amountMint = totalSupply().mul(depositValue).div(poolValueBefore);
    }
    _mint(msg.sender, amountMint);
  }

  function withdraw(bytes[] calldata _data) external whenNotPaused {
    // keep track of balances before withdrawal
    uint shareInPool = this.balanceOf(msg.sender).mul(PERCENT_100).div(totalSupply());
    uint poolValueBefore = _getValue();
    uint ethBalanceBefore = address(this).balance;

    // execute withdrawal transactions
    address adapter = management.withdrawAdapter();
    for (uint i = 0; i < _data.length; i++) {
      (bool success, bytes memory result) = adapter.delegatecall(_data[i]);
      require(success, string(result));
    }

    // TODO: validate that token weights haven't changed too much

    // validate balances after withdrawal
    uint poolValueAfter = _getValue();
    uint withdrawValue = poolValueBefore.sub(poolValueAfter);
    uint ethBalanceAfter = address(this).balance;

    uint maxWithdrawValue = poolValueBefore.mul(shareInPool).div(PERCENT_100);
    require(maxWithdrawValue >= withdrawValue, 'HousecatPool: withdraw value too high');
    require(ethBalanceAfter >= ethBalanceBefore, 'HousecatPool: ETH balance reduced on withdraw');

    // burn pool tokens corresponding the withdrawn value
    uint amountBurn = totalSupply().mul(withdrawValue).div(poolValueBefore);
    _burn(msg.sender, amountBurn);

    // send the received ETH to the withdrawer
    uint amountEthToSend = ethBalanceAfter.sub(ethBalanceBefore);
    (bool sent, ) = msg.sender.call{value: amountEthToSend}('');
    require(sent, 'HousecatPool: sending ETH failed');
  }

  function manageAssets(bytes[] calldata _data) external onlyOwner whenNotPaused {
    address adapter = management.manageAssetsAdapter();
    for (uint i = 0; i < _data.length; i++) {
      (bool success, bytes memory result) = adapter.delegatecall(_data[i]);
      require(success, string(result));
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

  function _getValue() internal view returns (uint) {
    (address[] memory tokens, TokenMeta[] memory tokensMeta) = management.getTokensWithMeta();
    uint[] memory tokenBalances = _getTokenBalances(address(this), tokens);
    (address[] memory priceFeeds, uint[] memory decimals) = _mapTokensMeta(tokensMeta);
    uint[] memory tokenPrices = _getTokenPrices(priceFeeds);
    return _getTotalValue(tokenBalances, tokenPrices, decimals);
  }

  function _getWeights() internal view returns (uint[] memory, uint) {
    (address[] memory tokens, TokenMeta[] memory tokensMeta) = management.getTokensWithMeta();
    uint[] memory tokenBalances = _getTokenBalances(address(this), tokens);
    (address[] memory priceFeeds, uint[] memory decimals) = _mapTokensMeta(tokensMeta);
    uint[] memory tokenPrices = _getTokenPrices(priceFeeds);
    return _getTokenWeights(tokenBalances, tokenPrices, decimals);
  }
}
