// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract AggregatorV3Mock {
  uint80 private roundId;
  int256 private answer;
  uint8 private decimals_;
  uint256 private startedAt;
  uint256 private updatedAt;
  uint80 private answeredInRound;

  constructor(int256 _answer, uint8 _decimals) {
    answer = _answer;
    decimals_ = _decimals;
  }

  function decimals() public view returns (uint8) {
    return decimals_;
  }

  function description() public view returns (string memory) {
    return 'Mock price feed';
  }

  function version() public view returns (uint256) {
    return 0;
  }

  function getRoundData(uint80 _roundId)
    public
    view
    returns (
      uint80,
      int256,
      uint256,
      uint256,
      uint80
    )
  {
    return (_roundId, answer, startedAt, updatedAt, answeredInRound);
  }

  function latestRoundData()
    public
    view
    returns (
      uint80,
      int256,
      uint256,
      uint256,
      uint80
    )
  {
    return (roundId, answer, startedAt, updatedAt, answeredInRound);
  }
}
