// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '../common/TokenData.sol';

interface IHousecatManagement {
  function treasury() external view returns (address);

  function weth() external view returns (address);

  function emergencyPause() external;

  function emergencyUnpause() external;

  function updateTreasury(address _treasury) external;

  function updateWETH(address _weth) external;

  function getSupportedTokens() external view returns (address[] memory);

  function setSupportedTokens(address[] memory) external;

  function getTokenData(address _token) external view returns (TokenData memory);

  function setTokenData(address _token, TokenData memory _tokenData) external;
}
