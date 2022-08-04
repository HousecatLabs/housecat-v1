// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import './ERC20Mock.sol';
import '../interfaces/IWETH.sol';

contract WETHMock is ERC20Mock, IWETH {
  uint8 private decimals_;

  constructor(
    string memory _name,
    string memory _symbol,
    uint8 _decimals
  ) ERC20Mock(_name, _symbol, _decimals) {
    decimals_ = _decimals;
  }

  function deposit() public payable override {
    _mint(msg.sender, msg.value);
  }

  function withdraw(uint256 _amount) public override {
    _burn(msg.sender, _amount);
    (bool sent, ) = msg.sender.call{value: _amount}('');
    require(sent, 'WETHMock: withdrawal failed');
  }
}
