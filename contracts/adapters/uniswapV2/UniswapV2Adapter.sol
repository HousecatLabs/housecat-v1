// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import '../BaseAdapter.sol';

contract UniswapV2Adapter is BaseAdapter {
  function swapTokens(
    address _router,
    address[] memory _path,
    uint _amountIn,
    uint _amountOutMin
  ) external payable {
    HousecatManagement mgmt = _getMgmt();
    require(mgmt.isIntegrationSupported(_router), 'UniswapV2Adapter: unsupported router');
    require(mgmt.isAssetSupported(_path[0], false), 'UniswapV2Adapter: unsupported token from');
    require(mgmt.isAssetSupported(_path[_path.length - 1], true), 'UniswapV2Adapter: unsupported token to');
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
