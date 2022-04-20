// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import '../interfaces/IWETH.sol';
import '../core/HousecatPool.sol';
import '../core/HousecatManagement.sol';

contract WithdrawAdapter {
  using SafeERC20 for IERC20;

  function uniswapV2__sellTokenForETH(
    address _router,
    address[] memory _path,
    uint _amountIn,
    uint _amountOutMin
  ) external {
    HousecatPool pool = HousecatPool(payable(address(this)));
    HousecatManagement mgmt = HousecatManagement(pool.management());
    address weth = mgmt.weth();
    require(mgmt.isIntegration(_router), 'WithdrawAdapter: unsupported router');
    require(mgmt.isTokenSupported(_path[0]), 'WithdrawAdapter: unsupported token from');
    require(_path[_path.length - 1] == weth, 'WithdrawAdapter: token to must be weth');
    uint amountWeth = _amountIn;
    if (_path[0] != weth) {
      IERC20(_path[0]).approve(_router, _amountIn);
      amountWeth = IUniswapV2Router02(_router).swapExactTokensForTokens(
        _amountIn,
        _amountOutMin,
        _path,
        address(this),
        block.timestamp
      )[_path.length - 1];
    }
    IWETH(weth).withdraw(amountWeth);
  }
}
