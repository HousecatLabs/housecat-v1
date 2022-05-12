// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '../../interfaces/IWETH.sol';
import '../BaseAdapter.sol';

contract WETHAdapter is BaseAdapter {
  using SafeMath for uint;

  function deposit(uint _amount) external payable {
    HousecatManagement mgmt = _getMgmt();
    IWETH(mgmt.weth()).deposit{value: _amount}();
  }

  function withdraw(uint _amount) external payable {
    HousecatManagement mgmt = _getMgmt();
    IWETH(mgmt.weth()).withdraw(_amount);
  }

  function withdrawUntil(uint _targetBalance) external payable {
    HousecatManagement mgmt = _getMgmt();
    IWETH weth = IWETH(mgmt.weth());
    uint currentBalance = weth.balanceOf(address(this));
    require(_targetBalance <= currentBalance, 'WETHAdapter: no enough balance');
    uint amount = currentBalance.sub(_targetBalance);
    weth.withdraw(amount);
  }
}
