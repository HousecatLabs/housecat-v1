// SPDX-License-Identifier: UNLISENCED
pragma solidity ^0.8.4;

interface IHousecatQueries {
  function getTokenPrices(address[] memory _priceFeeds) external view returns (uint[] memory);

  function getTokenBalances(address _account, address[] memory _tokens) external view returns (uint[] memory);

  function getTokenWeights(
    uint[] memory _balances,
    uint[] memory _tokenPrices,
    uint[] memory _tokenDecimals
  ) external pure returns (uint[] memory, uint);

  function getTokenValue(
    uint _balance,
    uint _price,
    uint _decimals
  ) external pure returns (uint);

  function getTotalValue(
    uint[] memory _balances,
    uint[] memory _tokenPrices,
    uint[] memory _tokenDecimals
  ) external pure returns (uint);
}
