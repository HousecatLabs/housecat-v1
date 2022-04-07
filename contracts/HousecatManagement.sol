// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/utils/math/SafeCast.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import './common/Constants.sol';
import './structs/TokenMeta.sol';

contract HousecatManagement is Constants, Ownable, Pausable {
  using SafeMath for uint;

  address public treasury;
  address public weth;
  address public manageAssetsAdapter;
  address public withdrawAdapter;
  mapping(address => bool) private integrations;
  address[] private supportedTokens;
  mapping(address => TokenMeta) private tokenMeta;

  event UpdateTreasury(address treasury);
  event UpdateWETH(address weth);
  event UpdateManageAssetsAdapter(address adapter);
  event UpdateWithdrawAdapter(address adapter);

  constructor(address _treasury, address _weth) {
    treasury = _treasury;
    weth = _weth;
  }

  function emergencyPause() external onlyOwner {
    _pause();
  }

  function emergencyUnpause() external onlyOwner {
    _unpause();
  }

  function updateTreasury(address _treasury) external onlyOwner {
    treasury = _treasury;
    emit UpdateTreasury(_treasury);
  }

  function updateWETH(address _weth) external onlyOwner {
    weth = _weth;
    emit UpdateWETH(_weth);
  }

  function updateManageAssetsAdapter(address _adapter) external onlyOwner {
    manageAssetsAdapter = _adapter;
    emit UpdateManageAssetsAdapter(_adapter);
  }

  function updateWithdrawAdapter(address _adapter) external onlyOwner {
    withdrawAdapter = _adapter;
    emit UpdateWithdrawAdapter(_adapter);
  }

  function getSupportedTokens() external view returns (address[] memory) {
    return supportedTokens;
  }

  function getTokenMeta(address _token) external view returns (TokenMeta memory) {
    return tokenMeta[_token];
  }

  function getTokensWithMeta() external view returns (address[] memory, TokenMeta[] memory) {
    TokenMeta[] memory meta = new TokenMeta[](supportedTokens.length);
    for (uint i = 0; i < supportedTokens.length; i++) {
      meta[i] = tokenMeta[supportedTokens[i]];
    }
    return (supportedTokens, meta);
  }

  function isIntegration(address _integration) external view returns (bool) {
    return integrations[_integration];
  }

  function isTokenSupported(address _token) external view returns (bool) {
    for (uint i = 0; i < supportedTokens.length; i++) {
      if (supportedTokens[i] == _token) {
        return true;
      }
    }
    return false;
  }

  function setSupportedTokens(address[] memory _tokens) external onlyOwner {
    supportedTokens = _tokens;
  }

  function setTokenMeta(address _token, TokenMeta memory _tokenMeta) external onlyOwner {
    _setTokenMeta(_token, _tokenMeta);
  }

  function setTokenMetaMany(address[] memory _tokens, TokenMeta[] memory _tokensMeta) external onlyOwner {
    require(_tokens.length == _tokensMeta.length, 'HousecatManagement: array size mismatch');
    for (uint i = 0; i < _tokens.length; i++) {
      _setTokenMeta(_tokens[i], _tokensMeta[i]);
    }
  }

  function setIntegration(address _integration, bool _value) external onlyOwner {
    integrations[_integration] = _value;
  }

  function _setTokenMeta(address _token, TokenMeta memory _tokenMeta) internal {
    require(_token != address(0));
    tokenMeta[_token] = _tokenMeta;
  }
}
