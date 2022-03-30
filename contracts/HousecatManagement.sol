// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/utils/math/SafeCast.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import './common/Constants.sol';
import './common/TokenMeta.sol';

contract HousecatManagement is Constants, Ownable, Pausable {
  using SafeMath for uint;

  address public treasury;
  address public weth;
  address[] private supportedTokens;
  mapping(address => TokenMeta) private tokenMeta;

  event UpdateTreasury(address treasury);
  event UpdateWETH(address weth);

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

  function getSupportedTokens() external view returns (address[] memory) {
    return supportedTokens;
  }

  function getTokenMeta(address _token) external view returns (TokenMeta memory) {
    return tokenMeta[_token];
  }

  function setSupportedTokens(address[] memory _tokens) external onlyOwner {
    supportedTokens = _tokens;
  }

  function setTokenMeta(address _token, TokenMeta memory _tokenMeta) external onlyOwner {
    tokenMeta[_token] = _tokenMeta;
  }
}
