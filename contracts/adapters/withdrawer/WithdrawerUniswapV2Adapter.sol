// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import '../../HousecatPool.sol';
import '../../HousecatManagement.sol';

contract WithdrawerUniswapV2Adapter {
  function sell(
    address _router,
    address[] memory _path,
    uint _amountIn,
    uint _amountOutMin
  ) external {
    HousecatPool pool = HousecatPool(payable(address(this)));
    HousecatManagement mgmt = HousecatManagement(pool.management());
    address weth = mgmt.weth();
    _validateParams(mgmt, weth, _router, _path);
    IERC20(_path[0]).approve(_router, _amountIn);
    uint[] memory amounts = IUniswapV2Router02(_router).swapExactTokensForTokens(
      _amountIn,
      _amountOutMin,
      _path,
      address(this),
      block.timestamp
    );
    uint amountWeth = amounts[amounts.length - 1];
    IWETH(weth).withdraw(amountWeth);
  }

  function _validateParams(HousecatManagement _mgmt, address _weth, address _router, address[] memory _path) internal view {
    require(_mgmt.isIntegration(_router), 'WithdrawerUniswapV2Adapter: unsupported integration');
    require(_mgmt.isTokenSupported(_path[0]), 'WithdrawerUniswapV2Adapter: unsupported token from');
    require(_path[_path.length - 1] == _weth, 'WithdrawerUniswapV2Adapter: invalid token to');
  }
}
