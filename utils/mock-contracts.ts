import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ERC20Mock } from '../typechain-types'
import { BigNumberish } from 'ethers'

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
  mintAmount: BigNumberish
) => {
  const weth = await ethers.getContractFactory('WETHMock')
  const token = await weth.connect(signer).deploy(name, symbol, decimals)
  await token.connect(signer).mint(signer.address, mintAmount)
  return token
}

export const mockPriceFeed = async (signer: SignerWithAddress, answer: BigNumberish, decimals: BigNumberish) => {
  const AggregatorV3Mock = await ethers.getContractFactory('AggregatorV3Mock')
  return AggregatorV3Mock.connect(signer).deploy(answer, decimals)
}
