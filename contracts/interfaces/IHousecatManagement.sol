// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;


interface IHousecatManagement {
  function treasury() external view returns (address);

  function weth() external view returns (address);

  function emergencyPause() external;

  function emergencyUnpause() external;

  function updateTreasury(address _treasury) external;

  function updateWETH(address _weth) external;
}
