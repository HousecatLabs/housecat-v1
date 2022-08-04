// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import './BaseAdapter.sol';
import '../interfaces/IWETH.sol';

struct ExchangeData {
  address router;
  address[] path;
}

contract WithdrawAdapter is BaseAdapter {
  function withdrawPercentage(
    uint _percentage,
    ExchangeData[] memory _trades,
    uint _minAmountETH
  ) external payable {
    HousecatPool pool = _getPool();
    HousecatManagement mgmt = _getMgmt();
    address weth = mgmt.weth();
    uint percent100 = pool.getPercent100();
    uint totalSupply = pool.totalSupply() + pool.getAccruedManagementFee() + pool.getAccruedPerformanceFee();
    uint myShareOfPool = (pool.balanceOf(msg.sender) * percent100) / totalSupply;
    uint existingBalanceWETH = IERC20(weth).balanceOf(address(this));
    uint addedAmountWETH = 0;

    // swap a percentage of each asset for WETH
    for (uint i = 0; i < _trades.length; i++) {
      ExchangeData memory d = _trades[i];
      uint totalBalanceOfToken = IERC20(d.path[0]).balanceOf(address(this));
      if (totalBalanceOfToken > 0) {
        uint amountSell = (totalBalanceOfToken * myShareOfPool * _percentage) / (percent100**2);
        uint[] memory amountsOut = _swapTokens(d.router, weth, d.path, amountSell, 1);
        addedAmountWETH += amountsOut[amountsOut.length - 1];
      }
    }

    // swap WETH for ETH
    uint amountETH = (existingBalanceWETH * myShareOfPool * _percentage) / (percent100**2) + addedAmountWETH;
    require(amountETH >= _minAmountETH, 'WithdrawAdapter: insuff. amount out');
    IWETH(weth).withdraw(amountETH);
  }

  function _swapTokens(
    address _router,
    address _weth,
    address[] memory _path,
    uint _amountIn,
    uint _amountOutMin
  ) private returns (uint[] memory) {
    HousecatManagement mgmt = _getMgmt();
    require(mgmt.isIntegrationSupported(_router), 'WithdrawAdapter: unsupported router');
    require(mgmt.isAssetSupported(_path[0], false), 'WithdrawAdapter: unsupported token from');
    require(_path[_path.length - 1] == _weth, 'WithdrawAdapter: token to !== WETH');
    IERC20(_path[0]).approve(_router, _amountIn);
    return
      IUniswapV2Router02(_router).swapExactTokensForTokens(
        _amountIn,
        _amountOutMin,
        _path,
        address(this),
        block.timestamp
      );
  }
}
