// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './interfaces/IWETH.sol';
import './HousecatQueries.sol';
import './HousecatFactory.sol';
import './HousecatManagement.sol';

contract HousecatPool is HousecatQueries, ERC20, Ownable {
  using SafeMath for uint;

  bool private initialized;
  HousecatFactory public factory;
  HousecatManagement public management;
  string private tokenName;
  string private tokenSymbol;

  modifier whenNotPaused() {
    require(!management.paused(), 'HousecatPool: paused');
    _;
  }

  constructor() ERC20('Housecat Pool Base', 'HCAT-Base') {}

  receive() external payable {}

  function initialize(
    address _owner,
    address _factory,
    address _management
  ) external {
    require(!initialized, 'HousecatPool: already initialized');
    _transferOwnership(_owner);
    factory = HousecatFactory(payable(_factory));
    management = HousecatManagement(_management);
    tokenName = 'Housecat Pool Position'; // TODO: let manager set name and symbol
    tokenSymbol = 'HCAT-PP';
    initialized = true;
  }

  function name() public view override(ERC20) returns (string memory) {
    return tokenName;
  }

  function symbol() public view override(ERC20) returns (string memory) {
    return tokenSymbol;
  }

  function deposit() external payable whenNotPaused {
    uint poolValueStart = _getPoolValue();
    address weth = management.weth();
    uint amountWethBought = _buyWETH(weth, msg.value);
    TokenMeta memory wethMeta = management.getTokenMeta(weth);
    uint wethPrice = _getTokenPrice(wethMeta.priceFeed);
    uint depositValue = _getTokenValue(amountWethBought, wethPrice, wethMeta.decimals);
    if (totalSupply() == 0) {
      _mint(msg.sender, depositValue);
    } else {
      uint amountMint = totalSupply().mul(depositValue).div(poolValueStart);
      _mint(msg.sender, amountMint);
    }
  }

  function withdraw(uint _amount) external {
    require(this.balanceOf(msg.sender) >= _amount, 'withdrawal exceeds balance');
    // uint shareInPool = _amount.mul(PERCENT_100).div(totalSupply());
    // first repay loan positions using the long positions equally;
    // for each token get the net balance and send % of that to a withdraw contract
    // finally let the withdrawer trade tokens on behalf of the withdraw contract to ETH
  }

  function _buyWETH(address _weth, uint _amount) internal returns (uint) {
    uint amountBeforeDeposit = IWETH(_weth).balanceOf(address(this));
    IWETH(_weth).deposit{value: _amount}();
    return IWETH(_weth).balanceOf(address(this)).sub(amountBeforeDeposit);
  }

  function _getTokenPrice(address _priceFeed) internal view returns (uint) {
    address[] memory priceFeeds = new address[](1);
    priceFeeds[0] = _priceFeed;
    return _getTokenPrices(priceFeeds)[0];
  }

  function _mapTokensMeta(TokenMeta[] memory _tokensMeta) internal pure returns (address[] memory, uint[] memory) {
    address[] memory priceFeeds = new address[](_tokensMeta.length);
    uint[] memory decimals = new uint[](_tokensMeta.length);
    for (uint i; i < _tokensMeta.length; i++) {
      priceFeeds[i] = _tokensMeta[i].priceFeed;
      decimals[i] = _tokensMeta[i].decimals;
    }
    return (priceFeeds, decimals);
  }

  function _getPoolValue() internal view returns (uint) {
    return _getPoolGrossValue().sub(_getPoolLoanValue());
  }

  function _getPoolGrossValue() internal view returns (uint) {
    (address[] memory tokens, TokenMeta[] memory tokensMeta) = management.getTokensWithMeta();
    uint[] memory tokenBalances = _getTokenBalances(address(this), tokens);
    (address[] memory priceFeeds, uint[] memory decimals) = _mapTokensMeta(tokensMeta);
    uint[] memory tokenPrices = _getTokenPrices(priceFeeds);
    return _getTotalValue(tokenBalances, tokenPrices, decimals);
  }

  function _getPoolLoanValue() internal pure returns (uint) {
    // TODO: resolve total value of loan positions
    return 0;
  }
}
