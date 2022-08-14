// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import {SafeMath} from '@openzeppelin/contracts/utils/math/SafeMath.sol';
import {SafeCast} from '@openzeppelin/contracts/utils/math/SafeCast.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {Pausable} from '@openzeppelin/contracts/security/Pausable.sol';
import {Constants} from './Constants.sol';
import {TokenMeta, FeeSettings, MirrorSettings, RebalanceSettings} from './structs.sol';

contract HousecatManagement is Constants, Ownable, Pausable {
  using SafeMath for uint;

  address public treasury;
  address public weth;
  uint public minInitialDepositAmount = 1 ether;
  uint public userSettingsTimeLockSeconds = 60 * 60 * 24;
  mapping(address => bool) private adapters;
  mapping(address => bool) private supportedIntegrations;
  address[] private supportedAssets;
  address[] private supportedLoans;
  mapping(address => TokenMeta) private tokenMeta;

  MirrorSettings private mirrorSettings =
    MirrorSettings({
      minPoolValue: ONE_USD.mul(100),
      minMirroredValue: ONE_USD.mul(100),
      maxWeightDifference: SafeCast.toUint32(PERCENT_100.div(20))
    });

  RebalanceSettings private rebalanceSettings =
    RebalanceSettings({
      reward: SafeCast.toUint32(PERCENT_100.mul(25).div(10000)),
      protocolTax: SafeCast.toUint32(PERCENT_100.mul(25).div(100)),
      maxSlippage: SafeCast.toUint32(PERCENT_100.div(100)),
      maxCumulativeSlippage: SafeCast.toUint32(PERCENT_100.mul(3).div(100)),
      cumulativeSlippagePeriodSeconds: 60 * 60 * 24 * 7,
      minSecondsBetweenRebalances: 60 * 15,
      rebalancers: new address[](0)
    });

  FeeSettings private managementFee =
    FeeSettings({
      maxFee: SafeCast.toUint32(PERCENT_100.mul(25).div(100)),
      defaultFee: SafeCast.toUint32(PERCENT_100.div(100)),
      protocolTax: SafeCast.toUint32(PERCENT_100.mul(25).div(100))
    });

  FeeSettings private performanceFee =
    FeeSettings({
      maxFee: SafeCast.toUint32(PERCENT_100.mul(25).div(100)),
      defaultFee: SafeCast.toUint32(PERCENT_100.div(10)),
      protocolTax: SafeCast.toUint32(PERCENT_100.mul(25).div(100))
    });

  event UpdateTreasury(address treasury);
  event UpdateWETH(address weth);
  event UpdateMinInitialDeposit(uint minInitialDepositAmount);
  event UpdateUserSettingsTimeLock(uint userSettingsTimeLockSeconds);
  event SetAdapter(address adapter, bool enabled);
  event SetIntegration(address integration, bool enabled);
  event SetSupportedAssets(address[] _tokens);
  event SetSupportedLoans(address[] _tokens);
  event UpdateMirrorSettings(MirrorSettings mirrorSettings);
  event UpdateRebalanceSettings(RebalanceSettings rebalanceSettings);
  event UpdateManagementFee(FeeSettings managementFee);
  event UpdatePerformanceFee(FeeSettings performanceFee);
  event SetTokenMeta(address token, TokenMeta _tokenMeta);

  constructor(address _treasury, address _weth) {
    treasury = _treasury;
    weth = _weth;
  }

  function emergencyPause() external onlyOwner {
    _pause();
  }

  function emergencyUnpause() external onlyOwner {
    _unpause();
  }

  function updateTreasury(address _treasury) external onlyOwner {
    treasury = _treasury;
    emit UpdateTreasury(_treasury);
  }

  function updateWETH(address _weth) external onlyOwner {
    weth = _weth;
    emit UpdateWETH(_weth);
  }

  function updateMinInitialDepositAmount(uint _minInitialDepositAmount) external onlyOwner {
    minInitialDepositAmount = _minInitialDepositAmount;
    emit UpdateMinInitialDeposit(_minInitialDepositAmount);
  }

  function updateUserSettingsTimeLock(uint _userSettingsTimeLockSeconds) external onlyOwner {
    userSettingsTimeLockSeconds = _userSettingsTimeLockSeconds;
    emit UpdateUserSettingsTimeLock(_userSettingsTimeLockSeconds);
  }

  function isAdapter(address _adapter) external view returns (bool) {
    return adapters[_adapter];
  }

  function setAdapter(address _adapter, bool _enabled) external onlyOwner {
    adapters[_adapter] = _enabled;
    emit SetAdapter(_adapter, _enabled);
  }

  function getSupportedAssets() external view returns (address[] memory) {
    return supportedAssets;
  }

  function getSupportedLoans() external view returns (address[] memory) {
    return supportedLoans;
  }

  function getTokenMeta(address _token) external view returns (TokenMeta memory) {
    return tokenMeta[_token];
  }

  function getAssetsWithMeta() external view returns (address[] memory, TokenMeta[] memory) {
    TokenMeta[] memory meta = new TokenMeta[](supportedAssets.length);
    for (uint i = 0; i < supportedAssets.length; i++) {
      meta[i] = tokenMeta[supportedAssets[i]];
    }
    return (supportedAssets, meta);
  }

  function getLoansWithMeta() external view returns (address[] memory, TokenMeta[] memory) {
    TokenMeta[] memory meta = new TokenMeta[](supportedLoans.length);
    for (uint i = 0; i < supportedLoans.length; i++) {
      meta[i] = tokenMeta[supportedLoans[i]];
    }
    return (supportedLoans, meta);
  }

  function isIntegrationSupported(address _integration) external view returns (bool) {
    return supportedIntegrations[_integration];
  }

  function isAssetSupported(address _token, bool _excludeDelisted) external view returns (bool) {
    return _isTokenSupported(_token, supportedAssets, _excludeDelisted);
  }

  function isLoanSupported(address _token, bool _excludeDelisted) external view returns (bool) {
    return _isTokenSupported(_token, supportedLoans, _excludeDelisted);
  }

  function getMirrorSettings() external view returns (MirrorSettings memory) {
    return mirrorSettings;
  }

  function getRebalanceSettings() external view returns (RebalanceSettings memory) {
    return rebalanceSettings;
  }

  function isRebalancer(address _account) external view returns (bool) {
    RebalanceSettings memory settings = rebalanceSettings;
    for (uint i = 0; i < settings.rebalancers.length; i++) {
      if (_account == settings.rebalancers[i]) {
        return true;
      }
    }
    return false;
  }

  function getManagementFee() external view returns (FeeSettings memory) {
    return managementFee;
  }

  function getPerformanceFee() external view returns (FeeSettings memory) {
    return performanceFee;
  }

  function setSupportedAssets(address[] memory _tokens) external onlyOwner {
    supportedAssets = _tokens;
    emit SetSupportedAssets(_tokens);
  }

  function setSupportedLoans(address[] memory _tokens) external onlyOwner {
    supportedLoans = _tokens;
    emit SetSupportedLoans(_tokens);
  }

  function setTokenMeta(address _token, TokenMeta memory _tokenMeta) external onlyOwner {
    _setTokenMeta(_token, _tokenMeta);
  }

  function setTokenMetaMany(address[] memory _tokens, TokenMeta[] memory _tokensMeta) external onlyOwner {
    require(_tokens.length == _tokensMeta.length, 'HousecatManagement: array size mismatch');
    for (uint i = 0; i < _tokens.length; i++) {
      _setTokenMeta(_tokens[i], _tokensMeta[i]);
    }
  }

  function setSupportedIntegration(address _integration, bool _value) external onlyOwner {
    supportedIntegrations[_integration] = _value;
    emit SetIntegration(_integration, _value);
  }

  function updateMirrorSettings(MirrorSettings memory _mirrorSettings) external onlyOwner {
    _validateMirrorSettings(_mirrorSettings);
    mirrorSettings = _mirrorSettings;
    emit UpdateMirrorSettings(_mirrorSettings);
  }

  function updateRebalanceSettings(RebalanceSettings memory _rebalanceSettings) external onlyOwner {
    _validateRebalanceSettings(_rebalanceSettings);
    rebalanceSettings = _rebalanceSettings;
    emit UpdateRebalanceSettings(_rebalanceSettings);
  }

  function updateManagementFee(FeeSettings memory _managementFee) external onlyOwner {
    _validateFeeSettings(_managementFee);
    managementFee = _managementFee;
    emit UpdateManagementFee(_managementFee);
  }

  function updatePerformanceFee(FeeSettings memory _performanceFee) external onlyOwner {
    _validateFeeSettings(_performanceFee);
    performanceFee = _performanceFee;
    emit UpdatePerformanceFee(_performanceFee);
  }

  function _isTokenSupported(
    address _token,
    address[] memory _supportedTokens,
    bool _excludeDelisted
  ) private view returns (bool) {
    for (uint i = 0; i < _supportedTokens.length; i++) {
      if (_supportedTokens[i] == _token) {
        if (_excludeDelisted && tokenMeta[_token].delisted) {
          return false;
        }
        return true;
      }
    }
    return false;
  }

  function _setTokenMeta(address _token, TokenMeta memory _tokenMeta) private {
    require(_token != address(0), 'HousecatManagement: zero address');
    tokenMeta[_token] = _tokenMeta;
    emit SetTokenMeta(_token, _tokenMeta);
  }

  function _validateMirrorSettings(MirrorSettings memory _settings) private pure {
    require(_settings.maxWeightDifference <= PERCENT_100, 'maxWeightDifference > 100%');
  }

  function _validateRebalanceSettings(RebalanceSettings memory _settings) private pure {
    require(_settings.maxSlippage <= PERCENT_100.div(2), 'maxSlippage > 50%');
    require(_settings.reward <= PERCENT_100.mul(50).div(10000), 'reward > 0.50%');
    require(_settings.protocolTax <= PERCENT_100, 'protocolTax > 100%');
  }

  function _validateFeeSettings(FeeSettings memory _settings) private pure {
    require(_settings.maxFee <= PERCENT_100, 'maxFee too large');
    require(_settings.defaultFee <= _settings.maxFee, 'defaultFee > maxFee');
    require(_settings.protocolTax <= PERCENT_100.div(2), 'protocolTax > 50%');
  }
}
