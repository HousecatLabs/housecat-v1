// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol';

contract ERC20Mock is ERC20PresetMinterPauser {
  uint8 private decimals_;

  constructor(
    string memory _name,
    string memory _symbol,
    uint8 _decimals
  ) ERC20PresetMinterPauser(_name, _symbol) {
    decimals_ = _decimals;
  }

  function decimals() public view override returns (uint8) {
    return decimals_;
  }
}
