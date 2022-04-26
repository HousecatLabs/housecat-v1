// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '../core/HousecatPool.sol';
import '../core/HousecatManagement.sol';

contract BaseAdapter {
  function _getMgmt() internal view returns (HousecatManagement) {
    HousecatPool pool = HousecatPool(payable(address(this)));
    return HousecatManagement(pool.management());
  }
}
