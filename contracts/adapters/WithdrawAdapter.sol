// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import '../HousecatPool.sol';
import '../HousecatManagement.sol';

contract WithdrawAdapter {
  function uniswapV2(
    address _router,
    address[] memory _path,
    uint _amountIn,
    uint _amountOutMin
  ) external {
    HousecatPool pool = HousecatPool(payable(address(this)));
    HousecatManagement mgmt = HousecatManagement(pool.management());
    require(mgmt.isIntegration(_router), 'WithdrawAdapter: unsupported integration');
    require(mgmt.isTokenSupported(_path[_path.length - 1]), 'WithdrawAdapter: unsupported token to');
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
