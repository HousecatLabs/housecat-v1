// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/utils/math/SafeCast.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import './common/Constants.sol';
import './common/TokenData.sol';

contract HousecatManagement is Constants, Ownable, Pausable {
  using SafeMath for uint;

  address public treasury;
  address public weth;
  address[] private supportedTokens;
  mapping(address => TokenData) private tokenData;

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

  function setSupportedTokens(address[] memory _tokens) external onlyOwner {
    supportedTokens = _tokens;
  }

  function getTokenData(address _token) external view returns (TokenData memory) {
    return tokenData[_token];
  }

  function setTokenData(address _token, TokenData memory _tokenData) external onlyOwner {
    tokenData[_token] = _tokenData;
  }
}
