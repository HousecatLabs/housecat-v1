// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import '../core/HousecatPool.sol';
import '../core/HousecatManagement.sol';

// NOTE: all functions must be payable as they are called from a payable function

contract DepositAdapter {
  function uniswapV2__swapWETHToToken(
    address _router,
    address[] memory _path,
    uint _amountIn,
    uint _amountOutMin
  ) external payable {
    HousecatPool pool = HousecatPool(payable(address(this)));
    HousecatManagement mgmt = HousecatManagement(pool.management());
    require(mgmt.isIntegration(_router), 'DepositAdapter: unsupported router');
    require(_path[0] == mgmt.weth(), 'DepositAdapter: token from must be weth');
    require(mgmt.isTokenSupported(_path[_path.length - 1]), 'DepositAdapter: unsupported token to');
    IERC20(_path[0]).approve(_router, _amountIn);
    IUniswapV2Router02(_router).swapExactTokensForTokens(
      _amountIn,
      _amountOutMin,
      _path,
      address(this),
      block.timestamp
    );
  }
}
