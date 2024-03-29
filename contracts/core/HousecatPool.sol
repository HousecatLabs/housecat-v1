// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import {SafeMath} from '@openzeppelin/contracts/utils/math/SafeMath.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import {Strings} from '@openzeppelin/contracts/utils/Strings.sol';
import {UserSettings, PoolTransaction, MirrorSettings, RebalanceSettings, WalletContent, TokenData, TokenMeta, PoolState} from './structs.sol';
import {HousecatQueries} from './HousecatQueries.sol';
import {HousecatFactory} from './HousecatFactory.sol';
import {HousecatManagement} from './HousecatManagement.sol';

contract HousecatPool is HousecatQueries, ERC20, ReentrancyGuard {
  using SafeMath for uint;

  HousecatFactory public factory;
  HousecatManagement public management;
  address public mirrored;
  bool public suspended;
  uint public rebalanceCheckpoint;
  uint public cumulativeSlippage;
  uint public managementFeeCheckpoint;
  uint public performanceFeeHighWatermark;
  string private tokenName;
  string private tokenSymbol;
  bool private initialized;

  modifier whenNotPaused() {
    require(!management.paused(), 'HousecatPool: paused');
    _;
  }

  modifier onlyOwner() {
    require(msg.sender == management.owner(), 'HousecatPool: only owner');
    _;
  }

  event TransferPoolToken(address indexed from, address indexed to, uint amount, uint value);
  event RebalancePool();
  event ManagementFeeCheckpointUpdated(uint secondsPassed);
  event ManagementFeeSettled(uint amountToMirrored, uint amountToTreasury);
  event PerformanceFeeHighWatermarkUpdated(uint newValue);
  event PerformanceFeeSettled(uint amountToMirrored, uint amountToTreasury);
  event RebalanceRewardCollected(uint amountToBeneficiary, uint amountToTreasury);

  constructor() ERC20('Housecat Pool Base', 'HCAT-Base') {}

  receive() external payable {}

  function initialize(
    address _factory,
    address _management,
    address _mirrored,
    uint _poolIdx
  ) external {
    require(!initialized, 'HousecatPool: already initialized');
    factory = HousecatFactory(payable(_factory));
    management = HousecatManagement(_management);
    mirrored = _mirrored;
    suspended = false;
    tokenName = string(abi.encodePacked('Housecat Pool ', Strings.toString(_poolIdx)));
    tokenSymbol = 'HCAT-PP';
    rebalanceCheckpoint = 0;
    cumulativeSlippage = 0;
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
    return _getContent(address(this), assets, loans, false);
  }

  function getMirroredContent() external view returns (WalletContent memory) {
    TokenData memory assets = _getAssetData();
    TokenData memory loans = _getLoanData();
    return _getContent(mirrored, assets, loans, true);
  }

  function getWeightDifference() external view returns (uint) {
    TokenData memory assets = _getAssetData();
    TokenData memory loans = _getLoanData();
    return
      _getWeightDifference(
        _getContent(address(this), assets, loans, false),
        _getContent(mirrored, assets, loans, true)
      );
  }

  function getCumulativeSlippage() external view returns (uint, uint) {
    uint secondsSincePreviousRebalance = block.timestamp.sub(rebalanceCheckpoint);
    return (cumulativeSlippage, secondsSincePreviousRebalance);
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

  function isRebalanceLocked() external view returns (bool) {
    RebalanceSettings memory settings = management.getRebalanceSettings();
    return _isRebalanceLocked(settings);
  }

  function deposit(address _to, PoolTransaction[] calldata _transactions) external payable whenNotPaused nonReentrant {
    require(!suspended, 'HousecatPool: suspended');

    MirrorSettings memory mirrorSettings = management.getMirrorSettings();

    // execute transactions and get pool states before and after
    (PoolState memory poolStateBefore, PoolState memory poolStateAfter) = _executeTransactions(
      _transactions,
      mirrorSettings
    );

    // require eth balance did not change
    require(poolStateAfter.ethBalance == poolStateBefore.ethBalance, 'HousecatPool: ETH balance changed');

    // require weight difference did not increase
    _validateWeightDifference(mirrorSettings, poolStateBefore, poolStateAfter);

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
      require(poolStateBefore.netValue > 0, 'HousecatPool: pool netValue 0');
      amountMint = totalSupply().mul(depositValue).div(poolStateBefore.netValue);
    }
    _mint(_to, amountMint);
    emit TransferPoolToken(address(0), _to, amountMint, depositValue);
  }

  function withdraw(address _to, PoolTransaction[] calldata _transactions) external whenNotPaused nonReentrant {
    MirrorSettings memory mirrorSettings = management.getMirrorSettings();

    // execute transactions and get pool states before and after
    (PoolState memory poolStateBefore, PoolState memory poolStateAfter) = _executeTransactions(
      _transactions,
      mirrorSettings
    );

    // require eth balance did not decrease
    require(poolStateAfter.ethBalance >= poolStateBefore.ethBalance, 'HousecatPool: ETH balance decreased');

    // require weight difference did not increase
    _validateWeightDifference(mirrorSettings, poolStateBefore, poolStateAfter);

    // settle accrued fees
    _settleFees(poolStateBefore.netValue);

    uint withdrawValue = poolStateBefore.netValue.sub(poolStateAfter.netValue);

    // require withdraw value does not exceed what the withdtawer owns
    uint shareInPool = this.balanceOf(msg.sender).mul(PERCENT_100).div(totalSupply());
    uint maxWithdrawValue = poolStateBefore.netValue.mul(shareInPool).div(PERCENT_100);
    require(maxWithdrawValue >= withdrawValue, 'HousecatPool: balance exceeded');

    // reduce withdraw value from performance fee high watermark
    _updatePerformanceFeeHighWatermark(performanceFeeHighWatermark.sub(withdrawValue));

    // burn pool tokens an amount based on the withdrawn value
    uint amountBurn = totalSupply().mul(withdrawValue).div(poolStateBefore.netValue);
    if (maxWithdrawValue.sub(withdrawValue) < ONE_USD.div(20)) {
      // if the remaining value is less than 0.05 USD burn the rest
      amountBurn = this.balanceOf(msg.sender);
    }
    _burn(msg.sender, amountBurn);
    emit TransferPoolToken(msg.sender, address(0), amountBurn, withdrawValue);

    // send the received ETH to the withdrawer
    uint amountEthToSend = poolStateAfter.ethBalance.sub(poolStateBefore.ethBalance);
    (bool sent, ) = _to.call{value: amountEthToSend}('');
    require(sent, 'HousecatPool: sending ETH failed');
  }

  function rebalance(address _rewardsTo, PoolTransaction[] calldata _transactions) external whenNotPaused nonReentrant {
    require(!suspended, 'HousecatPool: suspended');

    RebalanceSettings memory rebalanceSettings = management.getRebalanceSettings();
    require(!_isRebalanceLocked(rebalanceSettings), 'HousecatPool: rebalance locked');
    if (rebalanceSettings.rebalancers.length > 0) {
      require(management.isRebalancer(msg.sender), 'HousecatPool: only rebalancer');
    }

    MirrorSettings memory mirrorSettings = management.getMirrorSettings();

    // execute transactions and get pool states before and after
    (PoolState memory poolStateBefore, PoolState memory poolStateAfter) = _executeTransactions(
      _transactions,
      mirrorSettings
    );

    // require eth balance did not change
    require(poolStateAfter.ethBalance == poolStateBefore.ethBalance, 'HousecatPool: ETH balance changed');

    // require pool value did not decrease more than slippage limit
    uint slippage = poolStateAfter.netValue >= poolStateBefore.netValue
      ? 0
      : poolStateBefore.netValue.sub(poolStateAfter.netValue).mul(PERCENT_100).div(poolStateBefore.netValue);

    _updateCumulativeSlippage(rebalanceSettings, slippage);

    _validateSlippage(rebalanceSettings, mirrorSettings, poolStateBefore.weightDifference, slippage);

    // require weight difference did not increase
    _validateWeightDifference(mirrorSettings, poolStateBefore, poolStateAfter);

    // mint trade tax based on how much the weight difference reduced
    _collectRebalanceReward(rebalanceSettings, poolStateBefore, poolStateAfter, _rewardsTo);

    rebalanceCheckpoint = block.timestamp;
    emit RebalancePool();
  }

  function settleManagementFee() external whenNotPaused nonReentrant {
    uint feePercentage = factory.getUserSettings(mirrored).managementFee;
    address treasury = management.treasury();
    _settleManagementFee(feePercentage, treasury);
  }

  function settlePerformanceFee() external whenNotPaused nonReentrant {
    uint poolValue = getPoolContent().netValue;
    uint feePercentage = factory.getUserSettings(mirrored).performanceFee;
    address treasury = management.treasury();
    _settlePerformanceFee(poolValue, feePercentage, treasury);
  }

  function setSuspended(bool _value) external onlyOwner {
    suspended = _value;
  }

  function _transfer(
    address _from,
    address _to,
    uint256 _amount
  ) internal virtual override {
    super._transfer(_from, _to, _amount);
    uint poolValue = getPoolContent().netValue;
    uint transferValue = poolValue.mul(_amount).div(totalSupply());
    emit TransferPoolToken(_from, _to, _amount, transferValue);
  }

  function _getAssetData() private view returns (TokenData memory) {
    (address[] memory assets, TokenMeta[] memory assetsMeta) = management.getAssetsWithMeta();
    return _getTokenData(assets, assetsMeta);
  }

  function _getLoanData() private view returns (TokenData memory) {
    (address[] memory loans, TokenMeta[] memory loansMeta) = management.getLoansWithMeta();
    return _getTokenData(loans, loansMeta);
  }

  function _executeTransactions(PoolTransaction[] calldata _transactions, MirrorSettings memory _mirrorSettings)
    private
    returns (PoolState memory, PoolState memory)
  {
    TokenData memory assets = _getAssetData();
    TokenData memory loans = _getLoanData();

    // get state before
    WalletContent memory poolContentBefore = _getContent(address(this), assets, loans, false);
    WalletContent memory targetContent = _getContent(mirrored, assets, loans, true);
    if (targetContent.totalValue < _mirrorSettings.minMirroredValue) {
      targetContent = poolContentBefore;
    }
    uint weightDifferenceBefore = _getWeightDifference(poolContentBefore, targetContent);
    PoolState memory poolStateBefore = PoolState({
      ethBalance: address(this).balance.sub(msg.value),
      totalValue: poolContentBefore.totalValue,
      netValue: poolContentBefore.netValue,
      weightDifference: weightDifferenceBefore
    });

    // execute transactions
    for (uint i = 0; i < _transactions.length; i++) {
      require(management.isAdapter(_transactions[i].adapter), 'HousecatPool: unsupported adapter');
      (bool success, bytes memory result) = _transactions[i].adapter.delegatecall(_transactions[i].data);
      require(success, string(result));
    }

    // get state after
    WalletContent memory poolContentAfter = _getContent(address(this), assets, loans, false);
    uint weightDifferenceAfter = _getWeightDifference(poolContentAfter, targetContent);
    PoolState memory poolStateAfter = PoolState({
      ethBalance: address(this).balance,
      totalValue: poolContentAfter.totalValue,
      netValue: poolContentAfter.netValue,
      weightDifference: weightDifferenceAfter
    });

    return (poolStateBefore, poolStateAfter);
  }

  function _combineWeights(WalletContent memory _content) private pure returns (uint[] memory) {
    uint[] memory combinedWeights = new uint[](_content.assetWeights.length + _content.loanWeights.length);
    if (_content.totalValue != 0) {
      for (uint i = 0; i < _content.assetWeights.length; i++) {
        combinedWeights[i] = _content.assetWeights[i].mul(_content.assetValue).div(_content.totalValue);
      }
      for (uint i = 0; i < _content.loanWeights.length; i++) {
        combinedWeights[i + _content.assetWeights.length] = _content.loanWeights[i].mul(_content.loanValue).div(
          _content.totalValue
        );
      }
    }
    return combinedWeights;
  }

  function _getWeightDifference(WalletContent memory _poolContent, WalletContent memory _targetContent)
    private
    pure
    returns (uint)
  {
    uint[] memory poolWeights = _combineWeights(_poolContent);
    uint[] memory targetWeights = _combineWeights(_targetContent);
    uint totalDiff;
    for (uint i; i < poolWeights.length; i++) {
      totalDiff += poolWeights[i] > targetWeights[i]
        ? poolWeights[i].sub(targetWeights[i])
        : targetWeights[i].sub(poolWeights[i]);
    }
    return totalDiff;
  }

  function _isRebalanceLocked(RebalanceSettings memory _rebalanceSettings) internal view returns (bool) {
    uint secondsSincePreviousRebalance = block.timestamp.sub(rebalanceCheckpoint);
    return secondsSincePreviousRebalance < _rebalanceSettings.minSecondsBetweenRebalances;
  }

  function _validateWeightDifference(
    MirrorSettings memory _mirrorSettings,
    PoolState memory _before,
    PoolState memory _after
  ) private pure {
    if (
      _after.weightDifference > _mirrorSettings.maxWeightDifference && _after.totalValue > _mirrorSettings.minPoolValue
    ) {
      require(_after.weightDifference <= _before.weightDifference, 'HousecatPool: weight diff increased');
    }
  }

  function _validateSlippage(
    RebalanceSettings memory _rebalanceSettings,
    MirrorSettings memory _mirrorSettings,
    uint _initialWeightDifference,
    uint _slippage
  ) private view {
    if (_slippage > 0) {
      require(_initialWeightDifference > _mirrorSettings.maxWeightDifference, 'HousecatPool: already balanced');
    }
    require(_slippage <= _rebalanceSettings.maxSlippage, 'HousecatPool: slippage exceeded');
    require(cumulativeSlippage <= _rebalanceSettings.maxCumulativeSlippage, 'HousecatPool: cum. slippage exceeded');
  }

  function _getAccruedManagementFee(uint _annualFeePercentage) private view returns (uint) {
    uint secondsSinceLastSettlement = block.timestamp.sub(managementFeeCheckpoint);
    return _annualFeePercentage.mul(totalSupply()).mul(secondsSinceLastSettlement).div(365 days).div(PERCENT_100);
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

  function _updateCumulativeSlippage(RebalanceSettings memory _rebalanceSettings, uint _slippage) private {
    if (_rebalanceSettings.cumulativeSlippagePeriodSeconds == 0) {
      cumulativeSlippage = 0;
    } else {
      uint secondsSincePreviousRebalance = block.timestamp.sub(rebalanceCheckpoint);
      uint reduction = secondsSincePreviousRebalance.mul(_rebalanceSettings.maxCumulativeSlippage).div(
        _rebalanceSettings.cumulativeSlippagePeriodSeconds
      );
      if (reduction > cumulativeSlippage) {
        cumulativeSlippage = 0;
      } else {
        cumulativeSlippage = cumulativeSlippage.sub(reduction);
      }
    }
    cumulativeSlippage = cumulativeSlippage.add(_slippage);
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
    uint feeAmount = _getAccruedManagementFee(_managementFeePercentage);
    if (feeAmount > 0) {
      (uint amountToMirrored, uint amountToTreasury) = _mintFee(
        feeAmount,
        management.getManagementFee().protocolTax,
        _treasury
      );
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
    }
    if (_poolValue > performanceFeeHighWatermark) {
      _updatePerformanceFeeHighWatermark(_poolValue);
    }
  }

  function _settleFees(uint _poolValue) internal {
    address treasury = management.treasury();
    UserSettings memory userSettings = factory.getUserSettings(mirrored);
    _settleManagementFee(userSettings.managementFee, treasury);
    _settlePerformanceFee(_poolValue, userSettings.performanceFee, treasury);
  }

  function _collectRebalanceReward(
    RebalanceSettings memory _settings,
    PoolState memory _before,
    PoolState memory _after,
    address _beneficiary
  ) private {
    if (_after.weightDifference < _before.weightDifference) {
      uint change = _before.weightDifference.sub(_after.weightDifference);
      uint rewardAmount = totalSupply().mul(change).mul(_settings.reward).div(PERCENT_100**2);
      if (rewardAmount > 0) {
        uint amountToTreasury = rewardAmount.mul(_settings.protocolTax).div(PERCENT_100);
        uint amountToBeneficiary = rewardAmount.sub(amountToTreasury);
        _mint(management.treasury(), amountToTreasury);
        _mint(_beneficiary, amountToBeneficiary);
        emit RebalanceRewardCollected(amountToBeneficiary, amountToTreasury);
      }
    }
  }
}
