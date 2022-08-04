// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

contract Constants {
  uint internal constant PERCENT_100 = 1e8;
  uint internal constant PRICE_DECIMALS = 18;
  uint internal constant ONE_USD = 10**PRICE_DECIMALS;

  function getPercent100() external pure returns (uint) {
    return PERCENT_100;
  }

  function getPriceDecimals() external pure returns (uint) {
    return PRICE_DECIMALS;
  }

  function getOneUSD() external pure returns (uint) {
    return ONE_USD;
  }
}
