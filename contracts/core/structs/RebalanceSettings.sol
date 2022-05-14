// SPDX-License-Identifier: UNLISENCED
pragma solidity ^0.8.4;

struct RebalanceSettings {
  uint minPoolValue;
  uint minMirroredValue;
  uint32 maxWeightDifference;
  uint32 tradeTax;
  uint16 minSecondsBetweenRebalances;
}
