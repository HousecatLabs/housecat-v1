// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import '../interfaces/IWETH.sol';
import '../HousecatPool.sol';
import '../HousecatManagement.sol';

contract WithdrawAdapter {
  using SafeERC20 for IERC20;

  function tradeOnUniswapV2(
    address _router,
    address[] memory _path,
    uint _amountIn,
    uint _amountOutMin
  ) external {
    HousecatManagement mgmt = _getMgmt();
    require(mgmt.isIntegration(_router), 'tradeOnUniswapV2: unsupported router');
    require(mgmt.isTokenSupported(_path[0]), 'tradeOnUniswapV2: unsupported token from');
    require(mgmt.isTokenSupported(_path[_path.length - 1]), 'tradeOnUniswapV2: unsupported token to');
    IERC20(_path[0]).approve(_router, _amountIn);
    IUniswapV2Router02(_router).swapExactTokensForTokens(
      _amountIn,
      _amountOutMin,
      _path,
      address(this),
      block.timestamp
    );
  }

  function withdrawWETH(uint _amount) external {
    HousecatManagement mgmt = _getMgmt();
    IWETH(mgmt.weth()).withdraw(_amount);
  }

  function sendToken(address _token, address _to, uint _amount) external {
    HousecatManagement mgmt = _getMgmt();
    require(mgmt.isTokenSupported(_token), 'sendToken: unsupported token');
    IERC20(_token).transfer(_to, _amount);
  }

  function sendETH(address _to, uint _amount) external {
    (bool sent, ) = _to.call{value: _amount}('');
    require(sent, 'sendETH: send ETH failed');
  }

  function _getMgmt() internal view returns (HousecatManagement) {
    HousecatPool pool = HousecatPool(payable(address(this)));
    return HousecatManagement(pool.management());
  }
}
