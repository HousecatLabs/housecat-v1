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

  function deposit(PoolTransaction[] calldata _transactions) external payable whenNotPaused {
    TokenData memory assets = _getAssetData();
    TokenData memory loans = _getLoanData();

    // check balances before deposit
    uint ethBalanceBefore = address(this).balance.sub(msg.value);
    Portfolio memory portfolioBefore = _getPortfolio(address(this), assets, loans);

    // swap the sent eth to weth
    _buyWETH(management.weth(), msg.value);

    _executeTransactions(_transactions);

    // check balances after deposit
    uint ethBalanceAfter = address(this).balance;
    Portfolio memory portfolioAfter = _getPortfolio(address(this), assets, loans);

    require(ethBalanceAfter >= ethBalanceBefore, 'HousecatPool: ETH balance reduced');
    require(portfolioAfter.netValue >= portfolioBefore.netValue, 'HousecatPool: pool value reduced');

    if (portfolioBefore.assetValue > ONE_USD) {
      // TODO: define threshold value in mgmt settings
      bool weightsChanged = _didWeightsChange(portfolioBefore, portfolioAfter);
      require(!weightsChanged, 'HousecatPool: weights changed');
    }

    // mint pool tokens corresponding the deposit value
    uint depositValue = portfolioAfter.netValue.sub(portfolioBefore.netValue);
    uint amountMint = depositValue;
    if (totalSupply() > 0) {
      amountMint = totalSupply().mul(depositValue).div(portfolioBefore.netValue);
    }
    _mint(msg.sender, amountMint);
  }

  function withdraw(PoolTransaction[] calldata _transactions) external whenNotPaused {
    TokenData memory assets = _getAssetData();
    TokenData memory loans = _getLoanData();

    // check balances before withdrawal
    uint ethBalanceBefore = address(this).balance;
    Portfolio memory portfolioBefore = _getPortfolio(address(this), assets, loans);

    _executeTransactions(_transactions);

    // check balances after withdrawal
    uint ethBalanceAfter = address(this).balance;
    Portfolio memory portfolioAfter = _getPortfolio(address(this), assets, loans);

    require(ethBalanceAfter >= ethBalanceBefore, 'HousecatPool: ETH balance reduced');

    if (portfolioAfter.assetValue > ONE_USD) {
      // TODO: define threshold value in mgmt settings
      bool weightsChanged = _didWeightsChange(portfolioBefore, portfolioAfter);
      require(!weightsChanged, 'HousecatPool: weights changed');
    }

    // burn pool tokens in accordance with the withdrawn value
    {
      uint shareInPool = this.balanceOf(msg.sender).mul(PERCENT_100).div(totalSupply());
      uint withdrawValue = portfolioBefore.netValue.sub(portfolioAfter.netValue);
      uint maxWithdrawValue = portfolioBefore.netValue.mul(shareInPool).div(PERCENT_100);
      require(maxWithdrawValue >= withdrawValue, 'HousecatPool: withdraw balance exceeded');
      uint amountBurn = totalSupply().mul(withdrawValue).div(portfolioBefore.netValue);
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
    Portfolio memory portfolioBefore = _getPortfolio(address(this), assets, loans);

    _executeTransactions(_transactions);

    uint ethBalanceAfter = address(this).balance;
    Portfolio memory portfolioAfter = _getPortfolio(address(this), assets, loans);

    require(ethBalanceAfter >= ethBalanceBefore, 'HousecatPool: ETH balance reduced');

    if (portfolioAfter.netValue < portfolioBefore.netValue) {
      uint valueReduced = portfolioBefore.netValue.sub(portfolioAfter.netValue);
      uint percentsValueReduced = valueReduced.mul(PERCENT_100).div(portfolioBefore.netValue);
      require(percentsValueReduced < PERCENT_100.div(100), 'HousecatPool: pool value reduced'); // TODO: define slippage limit in mgmt settings
    }
    // TODO: validate cumulative value drop over N days period is less than a specified % limit
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

  function _didWeightsChange(Portfolio memory _portfolioBefore, Portfolio memory _portfolioAfter)
    private
    pure
    returns (bool)
  {
    uint[] memory weightsBefore = _combineWeights(_portfolioBefore);
    uint[] memory weightsAfter = _combineWeights(_portfolioAfter);
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
}
