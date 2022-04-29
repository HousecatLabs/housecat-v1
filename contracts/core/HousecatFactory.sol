// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/proxy/Clones.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import './HousecatManagement.sol';
import './HousecatPool.sol';
import './structs/PoolTransaction.sol';

contract HousecatFactory {
  using SafeMath for uint;

  address private managementContract;
  address private poolTemplateContract;
  address[] private pools;

  modifier whenNotPaused() {
    HousecatManagement housecatManagement = HousecatManagement(managementContract);
    require(!housecatManagement.paused(), 'HousecatFactory: paused');
    _;
  }

  constructor(address _managementContract, address _poolTemplateContract) {
    managementContract = _managementContract;
    poolTemplateContract = _poolTemplateContract;
  }

  receive() external payable {}

  function createPool(address _mirrored, PoolTransaction[] calldata _transactions) external payable whenNotPaused {
    address poolAddress = Clones.clone(poolTemplateContract);
    HousecatPool pool = HousecatPool(payable(poolAddress));
    pool.initialize(msg.sender, address(this), managementContract, _mirrored);
    pools.push(poolAddress);
    if (msg.value > 0) {
      pool.deposit{value: msg.value}(_transactions);
      pool.transfer(msg.sender, pool.balanceOf(address(this)));
    }
  }

  function getPool(uint _index) external view returns (address) {
    return pools[_index];
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
}
