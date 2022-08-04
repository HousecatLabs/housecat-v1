// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import './interfaces/ILendingPool.sol';
import './interfaces/DataTypes.sol';
import '../BaseAdapter.sol';

contract AaveV2Adapter is BaseAdapter {
  function deposit(
    address _pool,
    address _token,
    uint _amount
  ) external {
    HousecatManagement mgmt = _getMgmt();
    require(mgmt.isIntegrationSupported(_pool), 'AaveV2Adapter: unsupported integration');
    require(mgmt.isAssetSupported(_token, true), 'AaveV2Adapter: unsupported token');

    // require the A-token received on deposit is supported
    ILendingPool pool = ILendingPool(_pool);
    DataTypes.ReserveData memory reserveData = pool.getReserveData(_token);
    require(mgmt.isAssetSupported(reserveData.aTokenAddress, true), 'AaveV2Adapter: unsupported aToken');

    IERC20(_token).approve(_pool, _amount);
    pool.deposit(_token, _amount, address(this), 0);
  }

  function withdraw() external {
    // TODO
  }

  function borrow(
    address _pool,
    address _token,
    uint _amount
  ) external {
    HousecatManagement mgmt = _getMgmt();
    require(mgmt.isIntegrationSupported(_pool), 'AaveV2Adapter: unsupported integration');
    require(mgmt.isAssetSupported(_token, true), 'AaveV2Adapter: unsupported token');

    // require the loan token received on borrow is supported
    ILendingPool pool = ILendingPool(_pool);
    DataTypes.ReserveData memory reserveData = pool.getReserveData(_token);
    require(mgmt.isLoanSupported(reserveData.variableDebtTokenAddress, true), 'AaveV2Adapter: unsupported loan');

    pool.borrow(_token, _amount, 2, 0, address(this));
  }

  function repay() external {
    // TODO
  }
}
