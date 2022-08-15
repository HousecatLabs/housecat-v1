// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import {AggregatorV3Interface} from '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';

struct RoundParams {
  uint80 roundId;
  address priceFeed;
}

struct RoundData {
  uint80 roundId;
  int256 answer;
  uint256 startedAt;
  uint256 updatedAt;
  uint80 answeredInRound;
}

contract ChainlinkMulticall {
  function getRoundData(RoundParams[] memory _params) external view returns (RoundData[] memory) {
    RoundData[] memory result = new RoundData[](_params.length);
    for (uint i; i < _params.length; i++) {
      AggregatorV3Interface priceFeed = AggregatorV3Interface(_params[i].priceFeed);
      (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) = priceFeed
        .getRoundData(_params[i].roundId);
      result[i] = RoundData(roundId, answer, startedAt, updatedAt, answeredInRound);
    }
    return result;
  }

  function latestRoundData(address[] memory _priceFeeds) external view returns (RoundData[] memory) {
    RoundData[] memory result = new RoundData[](_priceFeeds.length);
    for (uint i; i < _priceFeeds.length; i++) {
      AggregatorV3Interface priceFeed = AggregatorV3Interface(_priceFeeds[i]);
      (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) = priceFeed
        .latestRoundData();
      result[i] = RoundData(roundId, answer, startedAt, updatedAt, answeredInRound);
    }
    return result;
  }
}
