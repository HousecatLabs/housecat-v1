// SPDX-License-Identifier: UNLICENSED
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
  ) external {
    HousecatManagement mgmt = _getMgmt();
    require(mgmt.isIntegrationSupported(_router), 'UniswapV2Adapter: unsupported router');
    require(mgmt.isAssetSupported(_path[_path.length - 1]), 'UniswapV2Adapter: unsupported token to');
    IERC20(_path[0]).approve(_router, _amountIn);
    IUniswapV2Router02(_router).swapExactTokensForTokens(
      _amountIn,
      _amountOutMin,
      _path,
      address(this),
      block.timestamp
    );
  }

  function swapTokenToETH(
    address _router,
    address[] memory _path,
    uint _amountIn,
    uint _amountOutMin
  ) external {
    HousecatManagement mgmt = _getMgmt();
    address weth = mgmt.weth();
    require(mgmt.isIntegrationSupported(_router), 'WAUniswapV2: unsupported router');
    require(mgmt.isAssetSupported(_path[0]), 'WAUniswapV2: unsupported token from');
    require(_path[_path.length - 1] == weth, 'WAUniswapV2: token to must be weth');
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

  function swapWETHToToken(
    address _router,
    address[] memory _path,
    uint _amountIn,
    uint _amountOutMin
  ) external payable {
    HousecatPool pool = HousecatPool(payable(address(this)));
    HousecatManagement mgmt = HousecatManagement(pool.management());
    require(mgmt.isIntegrationSupported(_router), 'DAUniswapV2: unsupported router');
    require(_path[0] == mgmt.weth(), 'DAUniswapV2: token from must be weth');
    require(mgmt.isAssetSupported(_path[_path.length - 1]), 'DAUniswapV2: unsupported token to');
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
