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

  function initialize(address _owner, address _factory, address _management) external {
    require(!initialized, 'HousecatPool: already initialized');
    _transferOwnership(_owner);
    factory = HousecatFactory(payable(_factory));
    management = HousecatManagement(_management);
    tokenName = 'Housecat Pool Position';
    tokenSymbol = 'HCAT-PP';
    initialized = true;
  }

  function name() public view override(ERC20) returns (string memory) {
    return tokenName;
  }

  function symbol() public view override(ERC20) returns (string memory) {
    return tokenSymbol;
  }

  function getPoolValue() external {
    // if chainlink price feed exists, use that as the price source
    // for loan positions, how? collateral decreased by debt position?
  }

  function deposit() external payable whenNotPaused {
    address weth = management.weth();
    uint amountWethBought = _buyWETH(weth, msg.value);
    TokenData memory wethData = management.getTokenData(weth);
    uint wethPrice = _getTokenPrice(wethData.priceFeed);
    uint depositValue = _getTokenValue(amountWethBought, wethPrice, wethData.decimals);
    
    //uint[] memory tokenBalances = _getTokenBalances(address(this), );
    // receives matic and trades it to wmatic
    // mints pool tokens and sends to the depositor
  }

  function withdraw(uint _amount, uint _minOutputAmount) external {
    // receives pool tokens and burns them
    // sells assets pro rata the burned amount
    // sends bought matic to the withdrawer
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
}