// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './interfaces/Utils.sol';
import './interfaces/IAugustusSwapper.sol';
import './interfaces/IParaswap.sol';
import '../BaseAdapter.sol';

contract ParaswapV5Adapter is BaseAdapter {
  function simpleSwap(
    address _augustusSwapper,
    bytes calldata _data
  ) external payable {
    HousecatManagement mgmt = _getMgmt();
    require(mgmt.isIntegrationSupported(_augustusSwapper), 'ParaswapV5Adapter: unsupported router');
    Utils.SimpleData memory data = abi.decode(_data[4:], (Utils.SimpleData));
    require(mgmt.isAssetSupported(data.toToken), 'ParaswapV5Adapter: unsupported token to');
    data.partner = payable(address(0));
    address tokenTransferProxy = IAugustusSwapper(_augustusSwapper).getTokenTransferProxy();
    IERC20(data.fromToken).approve(tokenTransferProxy, data.fromAmount);
    IParaswap(_augustusSwapper).protectedSimpleSwap(data);
  }
  
  function multiSwap(
    address _augustusSwapper,
    bytes calldata _data
  ) external payable {
    HousecatManagement mgmt = _getMgmt();
    require(mgmt.isIntegrationSupported(_augustusSwapper), 'ParaswapV5Adapter: unsupported router');
    Utils.SellData memory data = abi.decode(_data[4:], (Utils.SellData));
    address toToken = data.path[data.path.length - 1].to;
    require(mgmt.isAssetSupported(toToken), 'ParaswapV5Adapter: unsupported token to');
    data.partner = payable(address(0));
    data.deadline = block.timestamp;
    address tokenTransferProxy = IAugustusSwapper(_augustusSwapper).getTokenTransferProxy();
    IERC20(data.fromToken).approve(tokenTransferProxy, data.fromAmount);
    IParaswap(_augustusSwapper).protectedMultiSwap(data);
  }
}
