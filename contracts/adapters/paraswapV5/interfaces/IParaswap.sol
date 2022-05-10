// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

struct Route {
  uint256 index; //Adapter at which index needs to be used
  address targetExchange;
  uint percent;
  bytes payload;
  uint256 networkFee; //Network fee is associated with 0xv3 trades
}

struct Adapter {
  address payable adapter;
  uint256 percent;
  uint256 networkFee;
  Route[] route;
}

struct Path {
  address to;
  uint256 totalNetworkFee; //Network fee is associated with 0xv3 trades
  Adapter[] adapters;
}

struct SellData {
  address fromToken;
  uint256 fromAmount;
  uint256 toAmount;
  uint256 expectedAmount;
  address payable beneficiary;
  Path[] path;
  address payable partner;
  uint256 feePercent;
  bytes permit;
  uint256 deadline;
  bytes16 uuid;
}

struct SimpleData {
  address fromToken;
  address toToken;
  uint256 fromAmount;
  uint256 toAmount;
  uint256 expectedAmount;
  address[] callees;
  bytes exchangeData;
  uint256[] startIndexes;
  uint256[] values;
  address payable beneficiary;
  address payable partner;
  uint256 feePercent;
  bytes permit;
  uint256 deadline;
  bytes16 uuid;
}

interface IAugustusSwapper {
  function getTokenTransferProxy() external view returns (address);

  function protectedMultiSwap(SellData calldata data) external payable returns (uint256);

  function protectedSimpleSwap(SimpleData calldata data) external payable returns (uint256 receivedAmount);
}
