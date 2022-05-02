// SPDX-License-Identifier: UNLISENCED
pragma solidity ^0.8.4;

struct Portfolio {
  uint[] assetBalances;
  uint[] loanBalances;
  uint[] assetWeights;
  uint[] loanWeights;
  uint assetValue;
  uint loanValue;
  uint netValue;
}
