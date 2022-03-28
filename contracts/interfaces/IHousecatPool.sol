// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import '../HousecatFactory.sol';
import '../HousecatManagement.sol';

interface IHousecatPool is IERC20, IERC20Metadata {
  receive() external payable;

  function initialize(address _owner, address _factory, address _management) external;

  function factory() external view returns (HousecatFactory);

  function management() external view returns (HousecatManagement);

  function deposit() external payable;

  function withdraw(uint _amount, uint _minOutputAmount) external;
}
