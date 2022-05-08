// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

import './Utils.sol';

interface IAugustusSwapper {
  struct FeeStructure {
    uint256 partnerShare;
    bool noPositiveSlippage;
    bool positiveSlippageToUser;
    uint16 feePercent;
    string partnerId;
    bytes data;
  }

  function DEFAULT_ADMIN_ROLE (  ) external view returns ( bytes32 );
  function ROUTER_ROLE (  ) external view returns ( bytes32 );
  function WHITELISTED_ROLE (  ) external view returns ( bytes32 );
  function getAdapterData ( bytes32 key ) external view returns ( bytes memory );
  function getFeeWallet (  ) external view returns ( address );
  function getImplementation ( bytes4 selector ) external view returns ( address );
  function getPartnerFeeStructure ( address partner ) external view returns ( FeeStructure memory );
  function getRoleAdmin ( bytes32 role ) external view returns ( bytes32 );
  function getRoleMember ( bytes32 role, uint256 index ) external view returns ( address );
  function getRoleMemberCount ( bytes32 role ) external view returns ( uint256 );
  function getRouterData ( bytes32 key ) external view returns ( bytes memory );
  function getTokenTransferProxy (  ) external view returns ( address );
  function getVersion (  ) external pure returns ( string memory );
  function grantRole ( bytes32 role, address account ) external;
  function hasRole ( bytes32 role, address account ) external view returns ( bool );
  function initializeAdapter ( address adapter, bytes memory data ) external;
  function initializeRouter ( address router, bytes memory data ) external;
  function isAdapterInitialized ( bytes32 key ) external view returns ( bool );
  function isRouterInitialized ( bytes32 key ) external view returns ( bool );
  function registerPartner ( address partner, uint256 _partnerShare, bool _noPositiveSlippage, bool _positiveSlippageToUser, uint16 _feePercent, string memory partnerId, bytes memory _data ) external;
  function renounceRole ( bytes32 role, address account ) external;
  function revokeRole ( bytes32 role, address account ) external;
  function setFeeWallet ( address _feeWallet ) external;
  function setImplementation ( bytes4 selector, address implementation ) external;
  function transferTokens ( address token, address destination, uint256 amount ) external;
}