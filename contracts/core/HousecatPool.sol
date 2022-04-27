// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '../interfaces/IWETH.sol';
import './structs/PoolTransaction.sol';
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

  function getAssetBalances() public view returns (uint[] memory) {
    address[] memory tokens = management.getSupportedAssets();
    return _getTokenBalances(address(this), tokens);
  }

  function getLoanBalances() public view returns (uint[] memory) {
    address[] memory tokens = management.getSupportedLoans();
    return _getTokenBalances(address(this), tokens);
  }

  function getAssetWeights() public view returns (uint[] memory, uint) {
    (address[] memory tokens, TokenMeta[] memory meta) = management.getAssetsWithMeta();
    return _getWeights(tokens, meta);
  }

  function getLoanWeights() public view returns (uint[] memory, uint) {
    (address[] memory tokens, TokenMeta[] memory meta) = management.getLoansWithMeta();
    return _getWeights(tokens, meta);
  }

  function getAllWeights() public view returns (uint[] memory, uint) {
    (address[] memory tokens, TokenMeta[] memory meta) = management.getAllTokensWithMeta();
    return _getWeights(tokens, meta);
  }

  function getAssetValue() public view returns (uint) {
    (address[] memory tokens, TokenMeta[] memory meta) = management.getAssetsWithMeta();
    return _getValue(tokens, meta);
  }

  function getLoanValue() public view returns (uint) {
    (address[] memory tokens, TokenMeta[] memory meta) = management.getLoansWithMeta();
    return _getValue(tokens, meta);
  }

  function getNetValue() public view returns (uint) {
    uint assetValue = getAssetValue();
    uint loanValue = getLoanValue();
    return assetValue.sub(loanValue);
  }

  function deposit(PoolTransaction[] calldata _transactions) external payable whenNotPaused {
    // check balances before deposit
    uint ethBalanceBefore = address(this).balance.sub(msg.value);
    (uint[] memory weightsBefore, uint absValueBefore) = getAllWeights();
    uint netValueBefore = getNetValue();

    // swap the sent eth to weth
    _buyWETH(management.weth(), msg.value);

    _executeTransactions(_transactions);

    // check balances after deposit
    uint ethBalanceAfter = address(this).balance;
    require(ethBalanceAfter >= ethBalanceBefore, 'HousecatPool: ETH balance reduced');

    (uint[] memory weightsAfter, ) = getAllWeights();
    uint netValueAfter = getNetValue();

    require(netValueAfter >= netValueBefore, 'HousecatPool: pool value reduced');

    if (absValueBefore > ONE_USD) {
      // TODO: define threshold value in mgmt settings
      bool weightsChanged = _didWeightsChange(weightsBefore, weightsAfter);
      require(!weightsChanged, 'HousecatPool: weights changed');
    }

    // mint pool tokens corresponding the deposit value
    uint depositValue = netValueAfter.sub(netValueBefore);
    uint amountMint = depositValue;
    if (totalSupply() > 0) {
      amountMint = totalSupply().mul(depositValue).div(netValueBefore);
    }
    _mint(msg.sender, amountMint);
  }

  function withdraw(PoolTransaction[] calldata _transactions) external whenNotPaused {
    // check balances before withdrawal
    uint ethBalanceBefore = address(this).balance;
    (uint[] memory weightsBefore, ) = getAllWeights();
    uint netValueBefore = getNetValue();
    uint shareInPool = this.balanceOf(msg.sender).mul(PERCENT_100).div(totalSupply());

    _executeTransactions(_transactions);

    // check balances after withdrawal
    uint ethBalanceAfter = address(this).balance;
    require(ethBalanceAfter >= ethBalanceBefore, 'HousecatPool: ETH balance reduced');

    (uint[] memory weightsAfter, uint absValueAfter) = getAllWeights();
    uint netValueAfter = getNetValue();

    if (absValueAfter > ONE_USD) {
      // TODO: define threshold value in mgmt settings
      bool weightsChanged = _didWeightsChange(weightsBefore, weightsAfter);
      require(!weightsChanged, 'HousecatPool: weights changed');
    }

    // burn pool tokens in accordance with the withdrawn value
    {
      uint withdrawValue = netValueBefore.sub(netValueAfter);
      uint maxWithdrawValue = netValueBefore.mul(shareInPool).div(PERCENT_100);
      require(maxWithdrawValue >= withdrawValue, 'HousecatPool: withdraw balance exceeded');
      uint amountBurn = totalSupply().mul(withdrawValue).div(netValueBefore);
      _burn(msg.sender, amountBurn);
    }

    // send the received ETH to the withdrawer
    uint amountEthToSend = ethBalanceAfter.sub(ethBalanceBefore);
    (bool sent, ) = msg.sender.call{value: amountEthToSend}('');
    require(sent, 'HousecatPool: sending ETH failed');
  }

  function manage(PoolTransaction[] calldata _transactions) external onlyOwner whenNotPaused {
    uint ethBalanceBefore = address(this).balance;
    uint netValueBefore = getNetValue();

    _executeTransactions(_transactions);

    uint ethBalanceAfter = address(this).balance;
    require(ethBalanceAfter >= ethBalanceBefore, 'HousecatPool: ETH balance reduced');

    uint netValueAfter = getNetValue();
    if (netValueAfter < netValueBefore) {
      uint valueReduced = netValueBefore.sub(netValueAfter);
      uint percentsValueReduced = valueReduced.mul(PERCENT_100).div(netValueBefore);
      require(percentsValueReduced < PERCENT_100.div(100), 'HousecatPool: pool value reduced'); // TODO: define slippage limit in mgmt settings
    }
    // TODO: validate cumulative value drop over N days period is less than a specified % limit
  }

  function _executeTransactions(PoolTransaction[] calldata _transactions) private {
    for (uint i = 0; i < _transactions.length; i++) {
      require(management.isAdapter(_transactions[i].adapter), 'HousecatPool: unsupported adapter');
      (bool success, bytes memory result) = _transactions[i].adapter.delegatecall(_transactions[i].data);
      require(success, string(result));
    }
  }

  function _didWeightsChange(uint[] memory _weightsBefore, uint[] memory _weightsAfter) private pure returns (bool) {
    for (uint i; i < _weightsBefore.length; i++) {
      uint diff = _weightsBefore[i] > _weightsAfter[i]
        ? _weightsBefore[i].sub(_weightsAfter[i])
        : _weightsAfter[i].sub(_weightsBefore[i]);
      if (diff > PERCENT_100.div(100)) {
        // TODO: define max diff in mgmt settings
        return true;
      }
    }
    return false;
  }

  function _buyWETH(address _weth, uint _amount) private returns (uint) {
    uint amountBeforeDeposit = IWETH(_weth).balanceOf(address(this));
    IWETH(_weth).deposit{value: _amount}();
    return IWETH(_weth).balanceOf(address(this)).sub(amountBeforeDeposit);
  }

  function _getTokenPrice(address _priceFeed) private view returns (uint) {
    address[] memory priceFeeds = new address[](1);
    priceFeeds[0] = _priceFeed;
    return _getTokenPrices(priceFeeds)[0];
  }

  function _mapTokensMeta(TokenMeta[] memory _tokensMeta) private pure returns (address[] memory, uint[] memory) {
    address[] memory priceFeeds = new address[](_tokensMeta.length);
    uint[] memory decimals = new uint[](_tokensMeta.length);
    for (uint i; i < _tokensMeta.length; i++) {
      priceFeeds[i] = _tokensMeta[i].priceFeed;
      decimals[i] = _tokensMeta[i].decimals;
    }
    return (priceFeeds, decimals);
  }

  function _getValue(address[] memory _tokens, TokenMeta[] memory _tokensMeta) private view returns (uint) {
    uint[] memory tokenBalances = _getTokenBalances(address(this), _tokens);
    (address[] memory priceFeeds, uint[] memory decimals) = _mapTokensMeta(_tokensMeta);
    uint[] memory tokenPrices = _getTokenPrices(priceFeeds);
    return _getTotalValue(tokenBalances, tokenPrices, decimals);
  }

  function _getWeights(address[] memory _tokens, TokenMeta[] memory _tokensMeta)
    private
    view
    returns (uint[] memory, uint)
  {
    uint[] memory tokenBalances = _getTokenBalances(address(this), _tokens);
    (address[] memory priceFeeds, uint[] memory decimals) = _mapTokensMeta(_tokensMeta);
    uint[] memory tokenPrices = _getTokenPrices(priceFeeds);
    return _getTokenWeights(tokenBalances, tokenPrices, decimals);
  }
}
