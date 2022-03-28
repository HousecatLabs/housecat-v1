// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

interface IHousecatFactory {
  receive() external payable;

  function createPool() external payable;

  function getPool(uint _index) external view returns (address);

  function getNPools() external view returns (uint);
}
