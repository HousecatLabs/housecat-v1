// SPDX-License-Identifier: UNLISENCED
pragma solidity ^0.8.4;

struct TokenData {
  address priceFeed;
  uint32 maxSlippage;
  uint8 decimals;
}
