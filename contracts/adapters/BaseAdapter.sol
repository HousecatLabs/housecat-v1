// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '../core/HousecatPool.sol';
import '../core/HousecatManagement.sol';

contract BaseAdapter {
  function _getPool() internal view returns (HousecatPool) {
    return HousecatPool(payable(address(this)));
  }

  function _getMgmt() internal view returns (HousecatManagement) {
    HousecatPool pool = _getPool();
    return HousecatManagement(pool.management());
  }
}
