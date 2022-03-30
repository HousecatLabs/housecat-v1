// SPDX-License-Identifier: UNLISENCED
pragma solidity ^0.8.4;

struct TokenMeta {
  address priceFeed;
  uint32 maxSlippage;
  uint8 decimals;
}