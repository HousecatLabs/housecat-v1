import { ethers } from 'hardhat'
import { parseUnits } from 'ethers/lib/utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { AggregatorV3Mock, ERC20Mock, IUniswapV2Router02, WETHMock } from '../typechain-types'
import { BigNumberish } from 'ethers'

const QUICKSWAP_ROUTER = '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff'

export const mockToken = async (
  signer: SignerWithAddress,
  name: string,
  symbol: string,
  decimals: number,
  mintAmount: BigNumberish
): Promise<ERC20Mock> => {
  const erc20 = await ethers.getContractFactory('ERC20Mock')
  const token = await erc20.connect(signer).deploy(name, symbol, decimals)
  await token.connect(signer).mint(signer.address, mintAmount)
  return token
}

export const mockWETH = async (
  signer: SignerWithAddress,
  name: string,
  symbol: string,
  decimals: number,
  mintAmount: BigNumberish,
  reserveAmount: BigNumberish = ethers.utils.parseEther("100"),
) => {
  const weth = await ethers.getContractFactory('WETHMock')
  const token = await weth.connect(signer).deploy(name, symbol, decimals)
  token.connect(signer).deposit({ value: reserveAmount })
  await token.connect(signer).mint(signer.address, mintAmount)
  return token
}

export const mockPriceFeed = async (signer: SignerWithAddress, answer: BigNumberish, decimals: BigNumberish) => {
  const AggregatorV3Mock = await ethers.getContractFactory('AggregatorV3Mock')
  return AggregatorV3Mock.connect(signer).deploy(answer, decimals)
}

export interface IWeth {
  price: string
  decimals?: number
}

export interface IToken extends IWeth {
  reserveWeth: string
  reserveToken: string
}

export interface IAmmWithMockTokens {
  signer: SignerWithAddress
  weth: IWeth
  tokens: IToken[]
}

export interface ITokenWithPriceFeed {
  token: ERC20Mock | WETHMock
  priceFeed: AggregatorV3Mock
}

export const mockAssets = async ({
  signer,
  weth,
  tokens,
}: IAmmWithMockTokens): Promise<[IUniswapV2Router02, ITokenWithPriceFeed, ITokenWithPriceFeed[]]> => {
  const amm = await ethers.getContractAt('IUniswapV2Router02', QUICKSWAP_ROUTER)
  const _weth = await mockWETH(signer, 'Wrapped ETH', 'WETH', weth.decimals || 18, 0)
  const wethPriceFeed = await mockPriceFeed(signer, parseUnits(weth.price, 8), 8)

  const tokensWithFeeds = []

  for (let i = 0; i < tokens.length; i++) {
    // create token
    const token = await mockToken(signer, 'Token' + i, 'TOKEN' + i, tokens[i].decimals || 18, 0)

    // create price feed
    const priceFeed = await mockPriceFeed(signer, parseUnits(tokens[i].price, 8), 8)

    // mint and approve weth
    const amountWeth = parseUnits(tokens[i].reserveWeth, 18)
    await _weth.connect(signer).mint(signer.address, amountWeth)
    await _weth.connect(signer).approve(amm.address, amountWeth)

    // mint and approve token
    const amountToken = parseUnits(tokens[i].reserveToken, tokens[i].decimals || 18)
    await token.connect(signer).mint(signer.address, amountToken)
    await token.connect(signer).approve(amm.address, amountToken)

    // send to amm as liquidity
    await amm
      .connect(signer)
      .addLiquidity(token.address, _weth.address, amountToken, amountWeth, 1, 1, signer.address, 999999999999)
    tokensWithFeeds.push({
      token,
      priceFeed,
    })
  }
  const wethWithFeed = { token: _weth, priceFeed: wethPriceFeed }
  return [amm, wethWithFeed, tokensWithFeeds]
}
