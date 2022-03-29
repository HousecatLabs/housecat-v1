// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/utils/math/SafeCast.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import './common/Constants.sol';
import './common/TokenData.sol';
import './interfaces/IHousecatManagement.sol';

contract HousecatManagement is IHousecatManagement, Constants, Ownable, Pausable {
  using SafeMath for uint;

  address public override treasury;
  address public override weth;
  address[] private supportedTokens;
  mapping(address => TokenData) private tokenData;

  event UpdateTreasury(address treasury);
  event UpdateWETH(address weth);

  constructor(address _treasury, address _weth) {
    treasury = _treasury;
    weth = _weth;
  }

  function emergencyPause() external override onlyOwner {
    _pause();
  }

  function emergencyUnpause() external override onlyOwner {
    _unpause();
  }

  function updateTreasury(address _treasury) external override onlyOwner {
    treasury = _treasury;
    emit UpdateTreasury(_treasury);
  }

  function updateWETH(address _weth) external override onlyOwner {
    weth = _weth;
    emit UpdateWETH(_weth);
  }

  function getSupportedTokens() external view override returns (address[] memory) {
    return supportedTokens;
  }

  function setSupportedTokens(address[] memory _tokens) external override onlyOwner {
    supportedTokens = _tokens;
  }

  function getTokenData(address _token) external view override returns (TokenData memory) {
    return tokenData[_token];
  }

  function setTokenData(address _token, TokenData memory _tokenData) external override onlyOwner {
    tokenData[_token] = _tokenData;
  }
}
