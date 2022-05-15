// SPDX-License-Identifier: UNLISENCED
pragma solidity ^0.8.4;

struct FeeSettings {
  uint32 maxFee;
  uint32 defaultFee;
  uint32 protocolTax;
}

struct PoolTransaction {
  address adapter;
  bytes data;
}

struct RebalanceSettings {
  uint minPoolValue;
  uint minMirroredValue;
  uint32 maxWeightDifference;
  uint32 tradeTax;
  uint16 minSecondsBetweenRebalances;
}

struct TokenData {
  address[] tokens;
  uint[] decimals;
  uint[] prices;
}

struct TokenMeta {
  address priceFeed;
  uint8 decimals;
}

struct UserSettings {
  uint32 managementFee;
  uint32 performanceFee;
}

struct WalletContent {
  uint[] assetBalances;
  uint[] loanBalances;
  uint[] assetWeights;
  uint[] loanWeights;
  uint assetValue;
  uint loanValue;
  uint netValue;
}
