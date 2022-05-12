// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../BaseAdapter.sol';
import {IAugustusSwapper, SimpleData, SellData} from './interfaces/IParaswap.sol';

contract ParaswapV5Adapter is BaseAdapter {
  function simpleSwap(address _router, bytes calldata _data) external payable {
    HousecatManagement mgmt = _getMgmt();
    require(mgmt.isIntegrationSupported(_router), 'ParaswapV5Adapter: unsupported router');
    SimpleData memory data = abi.decode(_data[4:], (SimpleData));
    require(mgmt.isAssetSupported(data.toToken), 'ParaswapV5Adapter: unsupported token to');
    data.partner = payable(address(0));
    data.deadline = block.timestamp;
    address tokenTransferProxy = IAugustusSwapper(_router).getTokenTransferProxy();
    IERC20(data.fromToken).approve(tokenTransferProxy, data.fromAmount);
    IAugustusSwapper(_router).protectedSimpleSwap(data);
  }

  function multiSwap(address _router, bytes calldata _data) external payable {
    HousecatManagement mgmt = _getMgmt();
    require(mgmt.isIntegrationSupported(_router), 'ParaswapV5Adapter: unsupported router');
    SellData memory data = abi.decode(_data[4:], (SellData));
    address toToken = data.path[data.path.length - 1].to;
    require(mgmt.isAssetSupported(toToken), 'ParaswapV5Adapter: unsupported token to');
    data.partner = payable(address(0));
    data.deadline = block.timestamp;
    address tokenTransferProxy = IAugustusSwapper(_router).getTokenTransferProxy();
    IERC20(data.fromToken).approve(tokenTransferProxy, data.fromAmount);
    IAugustusSwapper(_router).protectedMultiSwap(data);
  }
}
