// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {SafeMath} from '@openzeppelin/contracts/utils/math/SafeMath.sol';
import {SafeCast} from '@openzeppelin/contracts/utils/math/SafeCast.sol';
import {AggregatorV3Interface} from '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';
import {Constants} from './Constants.sol';
import {TokenMeta} from './structs.sol';
import {TokenData} from './structs.sol';
import {WalletContent} from './structs.sol';

contract HousecatQueries is Constants {
  using SafeMath for uint;

  function getTokenPrices(address[] memory _priceFeeds) external view returns (uint[] memory) {
    return _getTokenPrices(_priceFeeds);
  }

  function getTokenBalances(address _account, address[] memory _tokens) external view returns (uint[] memory) {
    return _getTokenBalances(_account, _tokens);
  }

  function getTokenWeights(
    uint[] memory _balances,
    uint[] memory _tokenPrices,
    uint[] memory _tokenDecimals
  ) external pure returns (uint[] memory, uint) {
    return _getTokenWeights(_balances, _tokenPrices, _tokenDecimals);
  }

  function getTokenValue(
    uint _balance,
    uint _price,
    uint _decimals
  ) external pure returns (uint) {
    return _getTokenValue(_balance, _price, _decimals);
  }

  function getTotalValue(
    uint[] memory _balances,
    uint[] memory _tokenPrices,
    uint[] memory _tokenDecimals
  ) external pure returns (uint) {
    return _getTotalValue(_balances, _tokenPrices, _tokenDecimals);
  }

  function getTokenAmounts(
    uint[] memory _weights,
    uint _totalValue,
    uint[] memory _tokenPrices,
    uint[] memory _tokenDecimals
  ) external pure returns (uint[] memory) {
    return _getTokenAmounts(_weights, _totalValue, _tokenPrices, _tokenDecimals);
  }

  function getTokenData(address[] memory _tokens, TokenMeta[] memory _tokensMeta)
    external
    view
    returns (TokenData memory)
  {
    return _getTokenData(_tokens, _tokensMeta);
  }

  function getContent(
    address _account,
    TokenData memory _assetData,
    TokenData memory _loanData,
    bool _excludeDelisted
  ) external view returns (WalletContent memory) {
    return _getContent(_account, _assetData, _loanData, _excludeDelisted);
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

  function _getTokenAmount(
    uint _value,
    uint _price,
    uint _decimals
  ) internal pure returns (uint) {
    return _value.mul(10**_decimals).div(_price);
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

  function _getTokenAmounts(
    uint[] memory _weights,
    uint _totalValue,
    uint[] memory _tokenPrices,
    uint[] memory _tokenDecimals
  ) internal pure returns (uint[] memory) {
    uint[] memory amounts = new uint[](_weights.length);
    for (uint i = 0; i < _weights.length; i++) {
      uint value = _totalValue.mul(_weights[i]).div(PERCENT_100);
      amounts[i] = _getTokenAmount(value, _tokenPrices[i], _tokenDecimals[i]);
    }
    return amounts;
  }

  function _mapTokensMeta(TokenMeta[] memory _tokensMeta)
    internal
    pure
    returns (
      address[] memory,
      uint[] memory,
      bool[] memory
    )
  {
    address[] memory priceFeeds = new address[](_tokensMeta.length);
    uint[] memory decimals = new uint[](_tokensMeta.length);
    bool[] memory delisted = new bool[](_tokensMeta.length);
    for (uint i; i < _tokensMeta.length; i++) {
      priceFeeds[i] = _tokensMeta[i].priceFeed;
      decimals[i] = _tokensMeta[i].decimals;
      delisted[i] = _tokensMeta[i].delisted;
    }
    return (priceFeeds, decimals, delisted);
  }

  function _getTokenData(address[] memory _tokens, TokenMeta[] memory _tokensMeta)
    internal
    view
    returns (TokenData memory)
  {
    (address[] memory priceFeeds, uint[] memory decimals, bool[] memory delisted) = _mapTokensMeta(_tokensMeta);
    uint[] memory prices = _getTokenPrices(priceFeeds);
    return TokenData({tokens: _tokens, decimals: decimals, prices: prices, delisted: delisted});
  }

  function _getTokenContent(
    address _account,
    TokenData memory _tokenData,
    bool _excludeDelisted
  )
    private
    view
    returns (
      uint[] memory,
      uint[] memory,
      uint
    )
  {
    uint[] memory tokenBalances = _getTokenBalances(_account, _tokenData.tokens);
    if (_excludeDelisted) {
      for (uint i = 0; i < tokenBalances.length; i++) {
        if (_tokenData.delisted[i]) {
          tokenBalances[i] = 0;
        }
      }
    }
    (uint[] memory tokenWeights, uint tokenValue) = _getTokenWeights(
      tokenBalances,
      _tokenData.prices,
      _tokenData.decimals
    );
    return (tokenBalances, tokenWeights, tokenValue);
  }

  function _getContent(
    address _account,
    TokenData memory _assetData,
    TokenData memory _loanData,
    bool _excludeDelisted
  ) internal view returns (WalletContent memory) {
    (uint[] memory assetBalances, uint[] memory assetWeights, uint assetValue) = _getTokenContent(
      _account,
      _assetData,
      _excludeDelisted
    );
    (uint[] memory loanBalances, uint[] memory loanWeights, uint loanValue) = _getTokenContent(
      _account,
      _loanData,
      _excludeDelisted
    );
    uint netValue = assetValue > loanValue ? assetValue.sub(loanValue) : 0;
    return
      WalletContent({
        assetBalances: assetBalances,
        loanBalances: loanBalances,
        assetWeights: assetWeights,
        loanWeights: loanWeights,
        assetValue: assetValue,
        loanValue: loanValue,
        totalValue: assetValue.add(loanValue),
        netValue: netValue
      });
  }
}
