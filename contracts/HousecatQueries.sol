// SPDX-License-Identifier: UNLISENCED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/utils/math/SafeCast.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';
import './interfaces/IHousecatQueries.sol';
import './common/Constants.sol';

contract HousecatQueries is IHousecatQueries, Constants {
  using SafeMath for uint;

  function getTokenPrices(address[] memory _priceFeeds) external view override returns (uint[] memory) {
    return _getTokenPrices(_priceFeeds);
  }

  function getTokenBalances(address _account, address[] memory _tokens) external view override returns (uint[] memory) {
    return _getTokenBalances(_account, _tokens);
  }

  function getTokenWeights(
    uint[] memory _balances,
    uint[] memory _tokenPrices,
    uint[] memory _tokenDecimals
  ) external pure override returns (uint[] memory, uint) {
    return _getTokenWeights(_balances, _tokenPrices, _tokenDecimals);
  }

  function getTokenValue(
    uint _balance,
    uint _price,
    uint _decimals
  ) external pure override returns (uint) {
    return _getTokenValue(_balance, _price, _decimals);
  }

  function getTotalValue(
    uint[] memory _balances,
    uint[] memory _tokenPrices,
    uint[] memory _tokenDecimals
  ) external pure override returns (uint) {
    return _getTotalValue(_balances, _tokenPrices, _tokenDecimals);
  }

  function _getTokenPrices(address[] memory _priceFeeds) internal view returns (uint[] memory) {
    uint[] memory prices = new uint[](_priceFeeds.length);
    for (uint i; i < _priceFeeds.length; i++) {
      AggregatorV3Interface priceFeed = AggregatorV3Interface(_priceFeeds[i]);
      (, int price, , , ) = priceFeed.latestRoundData();
      prices[i] = SafeCast.toUint256(price).mul(ONE_USD).div(10**priceFeed.decimals());
    }
    return prices;
  }

  function _getTokenBalances(address _account, address[] memory _tokens) internal view returns (uint[] memory) {
    uint[] memory balances = new uint[](_tokens.length);
    for (uint i = 0; i < _tokens.length; i++) {
      balances[i] = IERC20(_tokens[i]).balanceOf(_account);
    }
    return balances;
  }

  function _getTokenValue(
    uint _balance,
    uint _price,
    uint _decimals
  ) internal pure returns (uint) {
    return _balance.mul(_price).div(10**_decimals);
  }

  function _getTotalValue(
    uint[] memory _balances,
    uint[] memory _tokenPrices,
    uint[] memory _tokenDecimals
  ) internal pure returns (uint) {
    uint totalValue;
    for (uint i = 0; i < _balances.length; i++) {
      uint value = _getTokenValue(_balances[i], _tokenPrices[i], _tokenDecimals[i]);
      totalValue = totalValue.add(value);
    }
    return totalValue;
  }

  function _getTokenWeights(
    uint[] memory _balances,
    uint[] memory _tokenPrices,
    uint[] memory _tokenDecimals
  ) internal pure returns (uint[] memory, uint) {
    uint totalValue = _getTotalValue(_balances, _tokenPrices, _tokenDecimals);
    uint[] memory weights = new uint[](_balances.length);
    if (totalValue > 0) {
      for (uint i = 0; i < _balances.length; i++) {
        uint value = _getTokenValue(_balances[i], _tokenPrices[i], _tokenDecimals[i]);
        weights[i] = value.mul(PERCENT_100).div(totalValue);
      }
    }
    return (weights, totalValue);
  }
}
