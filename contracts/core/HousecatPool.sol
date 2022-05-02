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

struct TokenData {
  address[] tokens;
  uint[] decimals;
  uint[] prices;
}

struct Portfolio {
  uint[] assetBalances;
  uint[] loanBalances;
  uint[] assetWeights;
  uint[] loanWeights;
  uint assetValue;
  uint loanValue;
  uint netValue;
}

contract HousecatPool is HousecatQueries, ERC20, Ownable {
  using SafeMath for uint;

  bool private initialized;
  HousecatFactory public factory;
  HousecatManagement public management;
  address public mirrored;
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
    address _management,
    address _mirrored
  ) external {
    require(!initialized, 'HousecatPool: already initialized');
    _transferOwnership(_owner);
    factory = HousecatFactory(payable(_factory));
    management = HousecatManagement(_management);
    mirrored = _mirrored;
    tokenName = 'Housecat Pool Position';
    tokenSymbol = 'HCAT-PP';
    initialized = true;
  }

  function name() public view override(ERC20) returns (string memory) {
    return tokenName;
  }

  function symbol() public view override(ERC20) returns (string memory) {
    return tokenSymbol;
  }

  function getPortfolio(address _account) external view returns (Portfolio memory) {
    TokenData memory assets = _getAssetData();
    TokenData memory loans = _getLoanData();
    return _getPortfolio(_account, assets, loans);
  }

  function deposit(PoolTransaction[] calldata _transactions) external payable whenNotPaused {
    TokenData memory assets = _getAssetData();
    TokenData memory loans = _getLoanData();

    // check balances before deposit
    uint ethBalanceBefore = address(this).balance.sub(msg.value);
    Portfolio memory figuresBefore = _getPortfolio(address(this), assets, loans);

    // swap the sent eth to weth
    _buyWETH(management.weth(), msg.value);

    _executeTransactions(_transactions);

    // check balances after deposit
    uint ethBalanceAfter = address(this).balance;
    Portfolio memory figuresAfter = _getPortfolio(address(this), assets, loans);

    require(ethBalanceAfter >= ethBalanceBefore, 'HousecatPool: ETH balance reduced');
    require(figuresAfter.netValue >= figuresBefore.netValue, 'HousecatPool: pool value reduced');

    if (figuresBefore.assetValue > ONE_USD) {
      // TODO: define threshold value in mgmt settings
      bool weightsChanged = _didWeightsChange(figuresBefore, figuresAfter);
      require(!weightsChanged, 'HousecatPool: weights changed');
    }

    // mint pool tokens corresponding the deposit value
    uint depositValue = figuresAfter.netValue.sub(figuresBefore.netValue);
    uint amountMint = depositValue;
    if (totalSupply() > 0) {
      amountMint = totalSupply().mul(depositValue).div(figuresBefore.netValue);
    }
    _mint(msg.sender, amountMint);
  }

  function withdraw(PoolTransaction[] calldata _transactions) external whenNotPaused {
    TokenData memory assets = _getAssetData();
    TokenData memory loans = _getLoanData();

    // check balances before withdrawal
    uint ethBalanceBefore = address(this).balance;
    Portfolio memory figuresBefore = _getPortfolio(address(this), assets, loans);

    _executeTransactions(_transactions);

    // check balances after withdrawal
    uint ethBalanceAfter = address(this).balance;
    Portfolio memory figuresAfter = _getPortfolio(address(this), assets, loans);

    require(ethBalanceAfter >= ethBalanceBefore, 'HousecatPool: ETH balance reduced');

    if (figuresAfter.assetValue > ONE_USD) {
      // TODO: define threshold value in mgmt settings
      bool weightsChanged = _didWeightsChange(figuresBefore, figuresAfter);
      require(!weightsChanged, 'HousecatPool: weights changed');
    }

    // burn pool tokens in accordance with the withdrawn value
    {
      uint shareInPool = this.balanceOf(msg.sender).mul(PERCENT_100).div(totalSupply());
      uint withdrawValue = figuresBefore.netValue.sub(figuresAfter.netValue);
      uint maxWithdrawValue = figuresBefore.netValue.mul(shareInPool).div(PERCENT_100);
      require(maxWithdrawValue >= withdrawValue, 'HousecatPool: withdraw balance exceeded');
      uint amountBurn = totalSupply().mul(withdrawValue).div(figuresBefore.netValue);
      _burn(msg.sender, amountBurn);
    }

    // send the received ETH to the withdrawer
    uint amountEthToSend = ethBalanceAfter.sub(ethBalanceBefore);
    (bool sent, ) = msg.sender.call{value: amountEthToSend}('');
    require(sent, 'HousecatPool: sending ETH failed');
  }

  function manage(PoolTransaction[] calldata _transactions) external onlyOwner whenNotPaused {
    TokenData memory assets = _getAssetData();
    TokenData memory loans = _getLoanData();

    uint ethBalanceBefore = address(this).balance;
    Portfolio memory figuresBefore = _getPortfolio(address(this), assets, loans);

    _executeTransactions(_transactions);

    uint ethBalanceAfter = address(this).balance;
    Portfolio memory figuresAfter = _getPortfolio(address(this), assets, loans);

    require(ethBalanceAfter >= ethBalanceBefore, 'HousecatPool: ETH balance reduced');

    if (figuresAfter.netValue < figuresBefore.netValue) {
      uint valueReduced = figuresBefore.netValue.sub(figuresAfter.netValue);
      uint percentsValueReduced = valueReduced.mul(PERCENT_100).div(figuresBefore.netValue);
      require(percentsValueReduced < PERCENT_100.div(100), 'HousecatPool: pool value reduced'); // TODO: define slippage limit in mgmt settings
    }
    // TODO: validate cumulative value drop over N days period is less than a specified % limit
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

  function _getTokenData(address[] memory _tokens, TokenMeta[] memory _tokensMeta)
    private
    view
    returns (TokenData memory)
  {
    (address[] memory priceFeeds, uint[] memory decimals) = _mapTokensMeta(_tokensMeta);
    uint[] memory prices = _getTokenPrices(priceFeeds);
    return TokenData({tokens: _tokens, decimals: decimals, prices: prices});
  }

  function _getAssetData() private view returns (TokenData memory) {
    (address[] memory assets, TokenMeta[] memory assetsMeta) = management.getAssetsWithMeta();
    return _getTokenData(assets, assetsMeta);
  }

  function _getLoanData() private view returns (TokenData memory) {
    (address[] memory loans, TokenMeta[] memory loansMeta) = management.getLoansWithMeta();
    return _getTokenData(loans, loansMeta);
  }

  function _executeTransactions(PoolTransaction[] calldata _transactions) private {
    for (uint i = 0; i < _transactions.length; i++) {
      require(management.isAdapter(_transactions[i].adapter), 'HousecatPool: unsupported adapter');
      (bool success, bytes memory result) = _transactions[i].adapter.delegatecall(_transactions[i].data);
      require(success, string(result));
    }
  }

  function _combineWeights(Portfolio memory _pf) internal pure returns (uint[] memory) {
    uint[] memory combined = new uint[](_pf.assetWeights.length + _pf.loanWeights.length);
    for (uint i = 0; i < _pf.assetWeights.length; i++) {
      combined[i] = _pf.assetWeights[i].mul(_pf.assetValue).div(_pf.netValue);
    }
    for (uint i = 0; i < _pf.loanWeights.length; i++) {
      combined[i + _pf.assetWeights.length] = _pf.loanWeights[i].mul(_pf.loanValue).div(_pf.netValue);
    }
    return combined;
  }

  function _didWeightsChange(Portfolio memory _figuresBefore, Portfolio memory _figuresAfter)
    private
    pure
    returns (bool)
  {
    uint[] memory weightsBefore = _combineWeights(_figuresBefore);
    uint[] memory weightsAfter = _combineWeights(_figuresAfter);
    for (uint i; i < weightsBefore.length; i++) {
      uint diff = weightsBefore[i] > weightsAfter[i]
        ? weightsBefore[i].sub(weightsAfter[i])
        : weightsAfter[i].sub(weightsBefore[i]);
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

  function _getPortfolio(
    address _account,
    TokenData memory _assetData,
    TokenData memory _loanData
  ) private view returns (Portfolio memory) {
    uint[] memory assetBalances = _getTokenBalances(_account, _assetData.tokens);
    (uint[] memory assetWeights, uint assetValue) = _getTokenWeights(
      assetBalances,
      _assetData.prices,
      _assetData.decimals
    );
    uint[] memory loanBalances = _getTokenBalances(_account, _loanData.tokens);
    (uint[] memory loanWeights, uint loanValue) = _getTokenWeights(loanBalances, _loanData.prices, _loanData.decimals);
    return
      Portfolio({
        assetBalances: assetBalances,
        loanBalances: loanBalances,
        assetWeights: assetWeights,
        loanWeights: loanWeights,
        assetValue: assetValue,
        loanValue: loanValue,
        netValue: assetValue.sub(loanValue)
      });
  }
}
