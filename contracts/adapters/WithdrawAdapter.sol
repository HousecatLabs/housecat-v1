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
    uint _minAmountETH,
    bool _asManager
  ) external payable {
    HousecatPool pool = _getPool();
    HousecatManagement mgmt = _getMgmt();
    address weth = mgmt.weth();
    uint percent100 = pool.getPercent100();
    uint sellPercentage = _getSellPercentage(pool, mgmt, _percentage, percent100, _asManager);
    uint existingBalanceWETH = IERC20(weth).balanceOf(address(this));
    uint amountWETHReceived = _sellAssetsForWETH(sellPercentage, _trades, percent100, weth);
    uint amountETH = (existingBalanceWETH * sellPercentage) / percent100 + amountWETHReceived;
    require(amountETH >= _minAmountETH, 'WithdrawAdapter: insuff. amount out');
    IWETH(weth).withdraw(amountETH);
  }

  function _getSellPercentage(
    HousecatPool _pool,
    HousecatManagement _mgmt,
    uint _percentage,
    uint _percent100,
    bool _asManager
  ) private view returns (uint) {
    uint accruedMgmtFee = _pool.getAccruedManagementFee();
    uint accruedPerfFee = _pool.getAccruedPerformanceFee();
    uint totalSupply = _pool.totalSupply() + accruedMgmtFee + accruedPerfFee;
    uint myBalance = _pool.balanceOf(msg.sender);
    if (_asManager) {
      uint mgmtFeeTax = _mgmt.getManagementFee().protocolTax;
      uint perfFeeTax = _mgmt.getPerformanceFee().protocolTax;
      myBalance += (accruedMgmtFee * (_percent100 - mgmtFeeTax)) / _percent100;
      myBalance += (accruedPerfFee * (_percent100 - perfFeeTax)) / _percent100;
    }
    return (myBalance * _percentage) / totalSupply;
  }

  function _sellAssetsForWETH(
    uint _sellPercentage,
    ExchangeData[] memory _trades,
    uint _percent100,
    address _weth
  ) private returns (uint) {
    uint amountWETHReceived = 0;
    for (uint i = 0; i < _trades.length; i++) {
      ExchangeData memory d = _trades[i];
      uint totalBalanceOfToken = IERC20(d.path[0]).balanceOf(address(this));
      if (totalBalanceOfToken >= 0) {
        uint amountSell = (totalBalanceOfToken * _sellPercentage) / _percent100;
        uint[] memory amountsOut = _swapTokens(d.router, _weth, d.path, amountSell, 1);
        amountWETHReceived += amountsOut[amountsOut.length - 1];
      }
    }
    return amountWETHReceived;
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
