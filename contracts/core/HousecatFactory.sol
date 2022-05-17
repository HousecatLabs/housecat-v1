// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {SafeMath} from '@openzeppelin/contracts/utils/math/SafeMath.sol';
import {HousecatManagement} from './HousecatManagement.sol';
import {HousecatPool} from './HousecatPool.sol';
import {UserSettings, PoolTransaction} from './structs.sol';

contract HousecatFactory {
  using SafeMath for uint;

  address private managementContract;
  address private poolTemplateContract;
  address[] private pools;
  mapping(address => address) private mirroredPool;
  mapping(address => bool) public isPool;
  mapping(address => UserSettings) private userSettings;
  mapping(address => bool) private userSettingsCreated;

  modifier whenNotPaused() {
    HousecatManagement housecatManagement = HousecatManagement(managementContract);
    require(!housecatManagement.paused(), 'HousecatFactory: paused');
    _;
  }

  event UpdateUserSettings(UserSettings userSettings);

  constructor(address _managementContract, address _poolTemplateContract) {
    managementContract = _managementContract;
    poolTemplateContract = _poolTemplateContract;
  }

  receive() external payable {}

  function createPool(address _mirrored, PoolTransaction[] calldata _transactions) external payable whenNotPaused {
    require(mirroredPool[_mirrored] == address(0), 'HousecatFactory: already mirrored');
    require(!isPool[_mirrored], 'HousecatFactory: mirrored is pool');
    address poolAddress = Clones.clone(poolTemplateContract);
    HousecatPool pool = HousecatPool(payable(poolAddress));
    HousecatManagement mgmt = HousecatManagement(managementContract);
    pool.initialize(mgmt.owner(), address(this), managementContract, _mirrored); // in the future make pools ownerless
    pools.push(poolAddress);
    mirroredPool[_mirrored] = poolAddress;
    isPool[poolAddress] = true;
    if (!userSettingsCreated[_mirrored]) {
      userSettings[_mirrored] = _getDefaultUserSettings();
    }
    if (msg.value > 0) {
      pool.deposit{value: msg.value}(msg.sender, _transactions);
    }
  }

  function updateUserSettings(UserSettings memory _userSettings) external whenNotPaused {
    _validateUserSettings(_userSettings);
    if (mirroredPool[msg.sender] != address(0)) {
      HousecatPool pool = HousecatPool(payable(mirroredPool[msg.sender]));
      pool.settleManagementFee();
      pool.settlePerformanceFee();
    }
    userSettings[msg.sender] = _userSettings;
    userSettingsCreated[msg.sender] = true;
    emit UpdateUserSettings(_userSettings);
  }

  function getPoolByMirrored(address _mirrored) external view returns (address) {
    return mirroredPool[_mirrored];
  }

  function getNPools() external view returns (uint) {
    return pools.length;
  }

  function getPools(uint _fromIdx, uint _toIdx) external view returns (address[] memory) {
    address[] memory pools_ = new address[](_toIdx.sub(_fromIdx));
    for (uint i = 0; i < pools_.length; i++) {
      pools_[i] = pools[i];
    }
    return pools_;
  }

  function getUserSettings(address _mirrored) external view returns (UserSettings memory) {
    return userSettings[_mirrored];
  }

  function _getDefaultUserSettings() internal view returns (UserSettings memory) {
    HousecatManagement management = HousecatManagement(managementContract);
    return
      UserSettings({
        managementFee: management.getManagementFee().defaultFee,
        performanceFee: management.getPerformanceFee().defaultFee
      });
  }

  function _validateUserSettings(UserSettings memory _userSettings) private view {
    HousecatManagement management = HousecatManagement(managementContract);
    require(
      _userSettings.managementFee <= management.getManagementFee().maxFee,
      'HousecatFactory: managementFee too high'
    );
    require(
      _userSettings.performanceFee <= management.getPerformanceFee().maxFee,
      'HousecatFactory: performanceFee too high'
    );
  }
}
