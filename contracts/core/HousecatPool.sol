// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './structs/UserSettings.sol';
import './structs/PoolTransaction.sol';
import './HousecatQueries.sol';
import './HousecatFactory.sol';
import './HousecatManagement.sol';

struct PoolState {
  uint ethBalance;
  uint netValue;
  uint weightDifference;
}

contract HousecatPool is HousecatQueries, ERC20, Ownable {
  using SafeMath for uint;

  HousecatFactory public factory;
  HousecatManagement public management;
  address public mirrored;
  string private tokenName;
  string private tokenSymbol;
  bool private initialized;
  uint private managementFeeCheckpoint;
  uint private performanceFeeHighWatermark;

  modifier whenNotPaused() {
    require(!management.paused(), 'HousecatPool: paused');
    _;
  }

  event DepositToPool(uint poolTokenAmount, uint value, address indexed account);
  event WithdrawFromPool(uint poolTokenAmount, uint value, address indexed account);
  event ManagementFeeCheckpointUpdated(uint secondsPassed);
  event ManagementFeeSettled(uint amountToMirrored, uint amountToTreasury);
  event PerformanceFeeHighWatermarkUpdated(uint newValue);
  event PerformanceFeeSettled(uint amountToMirrored, uint amountToTreasury);

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
    managementFeeCheckpoint = block.timestamp;
    performanceFeeHighWatermark = 0;
    initialized = true;
  }

  function name() public view override(ERC20) returns (string memory) {
    return tokenName;
  }

  function symbol() public view override(ERC20) returns (string memory) {
    return tokenSymbol;
  }

  function getPoolContent() public view returns (WalletContent memory) {
    TokenData memory assets = _getAssetData();
    TokenData memory loans = _getLoanData();
    return _getContent(address(this), assets, loans);
  }

  function getMirroredContent() external view returns (WalletContent memory) {
    TokenData memory assets = _getAssetData();
    TokenData memory loans = _getLoanData();
    return _getContent(mirrored, assets, loans);
  }

  function getWeightDifference() external view returns (uint) {
    TokenData memory assets = _getAssetData();
    TokenData memory loans = _getLoanData();
    return _getWeightDifference(_getContent(address(this), assets, loans), _getContent(mirrored, assets, loans));
  }

  function getAccruedManagementFee() external view returns (uint) {
    uint feePercentage = factory.getUserSettings(mirrored).managementFee;
    return _getAccruedManagementFee(feePercentage);
  }

  function getAccruedPerformanceFee() external view returns (uint) {
    uint poolValue = getPoolContent().netValue;
    uint feePercentage = factory.getUserSettings(mirrored).performanceFee;
    return _getAccruedPerformanceFee(poolValue, feePercentage);
  }

  function settleManagementFee() external whenNotPaused {
    uint feePercentage = factory.getUserSettings(mirrored).managementFee;
    address treasury = management.treasury();
    _settleManagementFee(feePercentage, treasury);
  }

  function settlePerformanceFee() external whenNotPaused {
    uint poolValue = getPoolContent().netValue;
    uint feePercentage = factory.getUserSettings(mirrored).performanceFee;
    address treasury = management.treasury();
    _settlePerformanceFee(poolValue, feePercentage, treasury);
  }

  function deposit(address _to, PoolTransaction[] calldata _transactions) external payable whenNotPaused {
    // execute transactions and get pool states before and after
    (PoolState memory poolStateBefore, PoolState memory poolStateAfter) = _executeTransactions(_transactions);

    // require eth balance did not change
    require(poolStateAfter.ethBalance == poolStateBefore.ethBalance, 'HousecatPool: ETH balance changed');

    // require weight difference did not increase
    if (poolStateAfter.weightDifference > PERCENT_100.div(50)) {
      require(
        poolStateAfter.weightDifference <= poolStateBefore.weightDifference,
        'HousecatPool: weight diff increased'
      );
    }

    // require pool value did not decrease
    require(poolStateAfter.netValue >= poolStateBefore.netValue, 'HousecatPool: pool value reduced');

    uint depositValue = poolStateAfter.netValue.sub(poolStateBefore.netValue);

    // settle accrued fees
    _settleFees(poolStateBefore.netValue);

    // add deposit value to performance fee high watermark
    _updatePerformanceFeeHighWatermark(performanceFeeHighWatermark.add(depositValue));

    // mint pool tokens an amount based on the deposit value
    uint amountMint = depositValue;
    if (totalSupply() > 0) {
      amountMint = totalSupply().mul(depositValue).div(poolStateBefore.netValue);
    }
    _mint(_to, amountMint);
    emit DepositToPool(amountMint, depositValue, _to);
  }

  function withdraw(address _to, PoolTransaction[] calldata _transactions) external whenNotPaused {
    // execute transactions and get pool states before and after
    (PoolState memory poolStateBefore, PoolState memory poolStateAfter) = _executeTransactions(_transactions);

    // require eth balance did not decrease
    require(poolStateAfter.ethBalance >= poolStateBefore.ethBalance, 'HousecatPool: ETH balance decreased');

    // require weight difference did not increase
    if (poolStateAfter.weightDifference > PERCENT_100.div(50) && poolStateAfter.netValue > ONE_USD) {
      // TODO: set threshold value in mgmt
      require(
        poolStateAfter.weightDifference <= poolStateBefore.weightDifference,
        'HousecatPool: weight diff increased'
      );
    }

    uint withdrawValue = poolStateBefore.netValue.sub(poolStateAfter.netValue);

    // require withdraw value does not exceed what the withdtawer owns
    uint shareInPool = this.balanceOf(msg.sender).mul(PERCENT_100).div(totalSupply());
    uint maxWithdrawValue = poolStateBefore.netValue.mul(shareInPool).div(PERCENT_100);
    require(maxWithdrawValue >= withdrawValue, 'HousecatPool: withdraw balance exceeded');

    // settle accrued fees
    _settleFees(poolStateBefore.netValue);

    // reduce withdraw value from performance fee high watermark
    _updatePerformanceFeeHighWatermark(performanceFeeHighWatermark.sub(withdrawValue));

    // burn pool tokens an amount based on the withdrawn value
    uint amountBurn = totalSupply().mul(withdrawValue).div(poolStateBefore.netValue);
    if (maxWithdrawValue.sub(withdrawValue) < ONE_USD.div(20)) {
      // if the remaining value is less than 0.05 USD burn the rest
      amountBurn = this.balanceOf(msg.sender);
    }
    _burn(msg.sender, amountBurn);

    // send the received ETH to the withdrawer
    uint amountEthToSend = poolStateAfter.ethBalance.sub(poolStateBefore.ethBalance);
    (bool sent, ) = _to.call{value: amountEthToSend}('');
    require(sent, 'HousecatPool: sending ETH failed');
    emit WithdrawFromPool(amountBurn, withdrawValue, msg.sender);
  }

  function manage(PoolTransaction[] calldata _transactions) external onlyOwner whenNotPaused {
    // TODO: remove onlyOwner
    // execute transactions and get pool states before and after
    (PoolState memory poolStateBefore, PoolState memory poolStateAfter) = _executeTransactions(_transactions);

    // require eth balance did not change
    require(poolStateAfter.ethBalance == poolStateBefore.ethBalance, 'HousecatPool: ETH balance changed');

    // require pool value did not decrease more than slippage limit
    uint minNetValueAfter = poolStateBefore.netValue.mul(99).div(100); // TODO: define slippage limit in mgmt settings
    require(poolStateAfter.netValue >= minNetValueAfter, 'HousecatPool: pool value reduced');

    // require pool weights match the mirrored weights
    require(poolStateAfter.weightDifference < PERCENT_100.div(50), 'HousecatPool: weights mismatch');

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

  function _executeTransactions(PoolTransaction[] calldata _transactions)
    private
    returns (PoolState memory, PoolState memory)
  {
    TokenData memory assets = _getAssetData();
    TokenData memory loans = _getLoanData();

    // get pool state before
    WalletContent memory mirroredContent = _getContent(mirrored, assets, loans);
    WalletContent memory poolContentBefore = _getContent(address(this), assets, loans);
    uint weightDifferenceBefore = _getWeightDifference(poolContentBefore, mirroredContent);

    PoolState memory poolStateBefore = PoolState({
      ethBalance: address(this).balance.sub(msg.value),
      netValue: poolContentBefore.netValue,
      weightDifference: weightDifferenceBefore
    });

    // execute transactions
    for (uint i = 0; i < _transactions.length; i++) {
      require(management.isAdapter(_transactions[i].adapter), 'HousecatPool: unsupported adapter');
      (bool success, bytes memory result) = _transactions[i].adapter.delegatecall(_transactions[i].data);
      require(success, string(result));
    }

    // get pool state after
    WalletContent memory poolContentAfter = _getContent(address(this), assets, loans);
    uint weightDifferenceAfter = _getWeightDifference(poolContentAfter, mirroredContent);

    PoolState memory poolStateAfter = PoolState({
      ethBalance: address(this).balance,
      netValue: poolContentAfter.netValue,
      weightDifference: weightDifferenceAfter
    });

    return (poolStateBefore, poolStateAfter);
  }

  function _combineWeights(WalletContent memory _content) private pure returns (uint[] memory) {
    uint[] memory combined = new uint[](_content.assetWeights.length + _content.loanWeights.length);
    if (_content.netValue > 0) {
      for (uint i = 0; i < _content.assetWeights.length; i++) {
        combined[i] = _content.assetWeights[i].mul(_content.assetValue).div(_content.netValue);
      }
      for (uint i = 0; i < _content.loanWeights.length; i++) {
        combined[i + _content.assetWeights.length] = _content.loanWeights[i].mul(_content.loanValue).div(
          _content.netValue
        );
      }
    }
    return combined;
  }

  function _getWeightDifference(WalletContent memory _poolContent, WalletContent memory _mirroredContent)
    private
    pure
    returns (uint)
  {
    uint[] memory poolWeights = _combineWeights(_poolContent);
    uint[] memory mirroredWeights = _combineWeights(_mirroredContent);
    uint totalDiff;
    for (uint i; i < poolWeights.length; i++) {
      totalDiff += poolWeights[i] > mirroredWeights[i]
        ? poolWeights[i].sub(mirroredWeights[i])
        : mirroredWeights[i].sub(poolWeights[i]);
    }
    return totalDiff;
  }

  function _getAccruedManagementFee(uint _annualFeePercentage) private view returns (uint) {
    uint secondsSinceLastSettlement = block.timestamp.sub(managementFeeCheckpoint);
    if (secondsSinceLastSettlement > 0) {
      return _annualFeePercentage.mul(totalSupply()).mul(secondsSinceLastSettlement).div(365 days).div(PERCENT_100);
    }
    return 0;
  }

  function _getAccruedPerformanceFee(uint _poolValue, uint _performanceFeePercentage) private view returns (uint) {
    if (_poolValue > performanceFeeHighWatermark) {
      uint profitPercentage = _poolValue.sub(performanceFeeHighWatermark).mul(PERCENT_100).div(
        performanceFeeHighWatermark
      );
      uint accruedFeePercentage = profitPercentage.mul(_performanceFeePercentage).div(PERCENT_100);
      return totalSupply().mul(accruedFeePercentage).div(PERCENT_100);
    }
    return 0;
  }

  function _updateManagementFeeCheckpoint() private {
    uint secondsSinceLastSettlement = block.timestamp.sub(managementFeeCheckpoint);
    managementFeeCheckpoint = block.timestamp;
    emit ManagementFeeCheckpointUpdated(secondsSinceLastSettlement);
  }

  function _updatePerformanceFeeHighWatermark(uint _poolValue) private {
    performanceFeeHighWatermark = _poolValue;
    emit PerformanceFeeHighWatermarkUpdated(_poolValue);
  }

  function _mintFee(
    uint _feeAmount,
    uint _taxPercent,
    address _treasury
  ) private returns (uint, uint) {
    uint amountToTreasury = _feeAmount.mul(_taxPercent).div(PERCENT_100);
    uint amountToMirrored = _feeAmount.sub(amountToTreasury);
    _mint(mirrored, amountToMirrored);
    _mint(_treasury, amountToTreasury);
    return (amountToMirrored, amountToTreasury);
  }

  function _settleManagementFee(uint _managementFeePercentage, address _treasury) private {
    uint amountToMirrored;
    uint amountToTreasury;
    uint feeAmount = _getAccruedManagementFee(_managementFeePercentage);
    if (feeAmount > 0) {
      (amountToMirrored, amountToTreasury) = _mintFee(feeAmount, management.getManagementFee().protocolTax, _treasury);
      emit ManagementFeeSettled(amountToMirrored, amountToTreasury);
    }
    _updateManagementFeeCheckpoint();
  }

  function _settlePerformanceFee(
    uint _poolValue,
    uint _performanceFeePercentage,
    address _treasury
  ) private {
    uint feeAmount = _getAccruedPerformanceFee(_poolValue, _performanceFeePercentage);
    if (feeAmount > 0) {
      (uint amountToMirrored, uint amountToTreasury) = _mintFee(
        feeAmount,
        management.getPerformanceFee().protocolTax,
        _treasury
      );
      emit PerformanceFeeSettled(amountToMirrored, amountToTreasury);
      _updatePerformanceFeeHighWatermark(_poolValue);
    }
  }

  function _settleFees(uint _poolValue) internal {
    address treasury = management.treasury();
    UserSettings memory userSettings = factory.getUserSettings(mirrored);
    _settleManagementFee(userSettings.managementFee, treasury);
    _settlePerformanceFee(_poolValue, userSettings.performanceFee, treasury);
  }
}
