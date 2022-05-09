// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '../../interfaces/IWETH.sol';
import '../BaseAdapter.sol';

contract WETHAdapter is BaseAdapter {
  function deposit(uint _amount) external payable {
    HousecatManagement mgmt = _getMgmt();
    IWETH(mgmt.weth()).deposit{value: _amount}();
  }

  function withdraw(uint _amount) external payable {
    HousecatManagement mgmt = _getMgmt();
    IWETH(mgmt.weth()).withdraw(_amount);
  }
}
