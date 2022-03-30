// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/proxy/Clones.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import './HousecatManagement.sol';
import './HousecatPool.sol';

contract HousecatFactory {
  using SafeMath for uint;
  using SafeERC20 for IERC20;

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

  function createPool() external payable whenNotPaused {
    address poolAddress = Clones.clone(poolTemplateContract);
    HousecatPool pool = HousecatPool(payable(poolAddress));
    pool.initialize(msg.sender, address(this), managementContract);
    pools.push(poolAddress);
  }

  function getPool(uint _index) external view returns (address) {
    return pools[_index];
  }

  function getNPools() external view returns (uint) {
    return pools.length;
  }
}
