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

struct MirrorSettings {
  uint minPoolValue;
  uint32 maxWeightDifference;
}

struct RebalanceSettings {
  uint32 reward;
  uint32 protocolTax;
  uint32 maxSlippage;
  uint32 maxCumulativeSlippage;
  uint32 cumulativeSlippagePeriodSeconds;
  uint32 minSecondsBetweenRebalances;
  address[] rebalancers;
}

struct TokenData {
  address[] tokens;
  uint[] decimals;
  uint[] prices;
  bool[] delisted;
}

struct TokenMeta {
  address priceFeed;
  uint8 decimals;
  bool delisted;
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

struct PoolState {
  uint ethBalance;
  uint netValue;
  uint weightDifference;
}
