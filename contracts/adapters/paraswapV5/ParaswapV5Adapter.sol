// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../BaseAdapter.sol';
import {IAugustusSwapper, SimpleData, SellData} from './interfaces/IParaswap.sol';

contract ParaswapV5Adapter is BaseAdapter {
  function simpleSwap(address _router, bytes calldata _data) external payable {
    HousecatManagement mgmt = _getMgmt();
    require(mgmt.isIntegrationSupported(_router), 'ParaswapV5Adapter: unsupported router');
    SimpleData memory data = abi.decode(_data[4:], (SimpleData));
    IERC20 fromToken = IERC20(data.fromToken);
    IERC20 toToken = IERC20(data.toToken);
    require(mgmt.isAssetSupported(address(fromToken), false), 'ParaswapV5Adapter: unsupported token from');
    require(mgmt.isAssetSupported(address(toToken), true), 'ParaswapV5Adapter: unsupported token to');
    data.partner = payable(address(0));
    data.beneficiary = payable(address(0));
    data.deadline = block.timestamp;
    address tokenTransferProxy = IAugustusSwapper(_router).getTokenTransferProxy();
    uint balanceOfFromTokenBefore = fromToken.balanceOf(address(this));
    fromToken.approve(tokenTransferProxy, data.fromAmount);
    IAugustusSwapper(_router).protectedSimpleSwap(data);
    uint balanceOfFromTokenAfter = fromToken.balanceOf(address(this));
    require(
      balanceOfFromTokenBefore - balanceOfFromTokenAfter == data.fromAmount,
      'ParaswapV5Adapter: amount mismatch'
    );
  }

  function multiSwap(address _router, bytes calldata _data) external payable {
    HousecatManagement mgmt = _getMgmt();
    require(mgmt.isIntegrationSupported(_router), 'ParaswapV5Adapter: unsupported router');
    SellData memory data = abi.decode(_data[4:], (SellData));
    IERC20 fromToken = IERC20(data.path[0].to);
    IERC20 toToken = IERC20(data.path[data.path.length - 1].to);
    require(mgmt.isAssetSupported(address(fromToken), false), 'ParaswapV5Adapter: unsupported token from');
    require(mgmt.isAssetSupported(address(toToken), true), 'ParaswapV5Adapter: unsupported token to');
    data.partner = payable(address(0));
    data.beneficiary = payable(address(0));
    data.deadline = block.timestamp;
    address tokenTransferProxy = IAugustusSwapper(_router).getTokenTransferProxy();
    //uint balanceOfFromTokenBefore = fromToken.balanceOf(address(this));
    fromToken.approve(tokenTransferProxy, data.fromAmount);
    IAugustusSwapper(_router).protectedMultiSwap(data);
    //uint balanceOfFromTokenAfter = fromToken.balanceOf(address(this));
    /*
    require(
      balanceOfFromTokenBefore - balanceOfFromTokenAfter == data.fromAmount,
      'ParaswapV5Adapter: amount mismatch'
    );
    */
  }
}
