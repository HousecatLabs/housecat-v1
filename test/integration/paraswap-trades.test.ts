import { ethers } from 'hardhat'
import { deployHousecat, IAdapters, IHousecat } from '../../utils/deploy-contracts'
import polygon from '../../utils/addresses/polygon'
import buildSwap from '../utils/paraswap'
import { parseEther } from 'ethers/lib/utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { HousecatManagement, HousecatPool } from '../../typechain-types'
import { BigNumber, Transaction } from 'ethers'
import { expect } from 'chai'
import { resolveBuyAmounts, resolveSellAmounts } from '../utils/resolve-trade-amounts'

const buyWeth = async (signer: SignerWithAddress, weth: string, amount: BigNumber) => {
  const token = await ethers.getContractAt('IWETH', weth)
  await token.connect(signer).deposit({ value: amount })
}

const swapToken = async (signer: SignerWithAddress, srcToken: string, destToken: string, srcAmount: BigNumber) => {
  const swapData = await buildSwap({
    srcToken,
    destToken,
    srcAmount: srcAmount.toString(),
    destAmount: '1',
    userAddress: signer.address,
  })
  const paraswapAddress = polygon.paraswapV5.AugustusSwapper
  const paraswap = await ethers.getContractAt('IAugustusSwapper', paraswapAddress)
  const paraswapProxyAddress = await paraswap.getTokenTransferProxy()
  const tokenFrom = await ethers.getContractAt('ERC20', srcToken)
  await tokenFrom.connect(signer).approve(paraswapProxyAddress, srcAmount)
  await signer.sendTransaction({
    to: paraswapAddress,
    data: swapData.txData.data,
  })
}

const deposit = async (
  pool: HousecatPool,
  mgmt: HousecatManagement,
  adapters: IAdapters,
  depositor: SignerWithAddress,
  amount: BigNumber
): Promise<Transaction> => {
  const weth = await mgmt.weth()
  const wethPriceFeed = (await mgmt.getTokenMeta(weth)).priceFeed
  const assets = await mgmt.getSupportedAssets()
  const poolContent = await pool.getPoolContent()
  const mirroredContent = await pool.getMirroredContent()
  const percent100 = await pool.getPercent100()
  const wehtPrice = (await pool.getTokenPrices([wethPriceFeed]))[0]
  const depositValue = await pool.getTokenValue(amount, wehtPrice, 18)
  const buyAmounts = resolveBuyAmounts(
    amount,
    depositValue,
    poolContent.netValue,
    poolContent.assetWeights,
    mirroredContent.assetWeights,
    percent100
  )
  const buyParams = buyAmounts
    .map((amount, idx) => ({
      srcToken: weth,
      destToken: assets[idx],
      srcAmount: amount.toString(),
      destAmount: '1',
      userAddress: pool.address,
    }))
    .filter((x) => x.srcAmount !== '0' && x.destToken !== weth)
  const buyData = await Promise.all(buyParams.map(buildSwap))
  const buyTxs = buyData.map((x) => ({
    adapter: adapters.paraswapV5Adapter.address,
    data: adapters.paraswapV5Adapter.interface.encodeFunctionData(x.priceRoute.contractMethod as any, [
      polygon.paraswapV5.AugustusSwapper,
      x.txData.data,
    ]),
  }))
  const buyWethTx = {
    adapter: adapters.wethAdapter.address,
    data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amount]),
  }
  return pool.connect(depositor).deposit(depositor.address, [buyWethTx, ...buyTxs], {
    value: amount,
  })
}

const withdraw = async (
  pool: HousecatPool,
  mgmt: HousecatManagement,
  adapters: IAdapters,
  withdrawer: SignerWithAddress,
  percentage: BigNumber
) => {
  const percent100 = await pool.getPercent100()
  const withdrawerOwnership = (await pool.balanceOf(withdrawer.address)).mul(percent100).div(await pool.totalSupply())
  const withdrawPercentage = withdrawerOwnership.mul(percentage).div(percent100)
  const weth = await mgmt.weth()
  const assets = await mgmt.getSupportedAssets()
  const poolContent = await pool.getPoolContent()
  const mirroredContent = await pool.getMirroredContent()
  const sellAmounts = resolveSellAmounts(
    withdrawPercentage,
    poolContent.netValue,
    poolContent.assetBalances,
    poolContent.assetWeights,
    mirroredContent.assetWeights,
    percent100
  )
  const sellParams = sellAmounts
    .map((amount, idx) => ({
      srcToken: assets[idx],
      destToken: weth,
      srcAmount: amount.toString(),
      destAmount: '1',
      userAddress: pool.address,
    }))
    .filter((x) => x.srcAmount !== '0' && x.srcToken !== weth)
  const sellData = await Promise.all(sellParams.map(buildSwap))
  const sellTxs = sellData.map((x) => ({
    adapter: adapters.paraswapV5Adapter.address,
    data: adapters.paraswapV5Adapter.interface.encodeFunctionData(x.priceRoute.contractMethod as any, [
      polygon.paraswapV5.AugustusSwapper,
      x.txData.data,
    ]),
  }))
  const wethBalanceBefore = await (await ethers.getContractAt('ERC20', weth)).balanceOf(pool.address)
  const wethTargetBalance = wethBalanceBefore.mul(percent100.sub(withdrawPercentage)).div(percent100)
  const sellWethTx = {
    adapter: adapters.wethAdapter.address,
    data: adapters.wethAdapter.interface.encodeFunctionData('withdrawUntil', [wethTargetBalance]),
  }
  return pool.connect(withdrawer).withdraw(withdrawer.address, [...sellTxs, sellWethTx], { gasLimit: 1e7 })
}

describe('integration: paraswap trades', () => {
  let housecat: IHousecat
  let signer: SignerWithAddress
  let mirrored: SignerWithAddress
  let mirrorer: SignerWithAddress
  let pool: HousecatPool

  before(async () => {
    const [signer_, treasury, mirrored_, mirrorer_] = await ethers.getSigners()
    signer = signer_
    mirrored = mirrored_
    mirrorer = mirrorer_

    // deploy housecat contracts
    const whitelist = [polygon.assets.wmatic, polygon.assets.weth, polygon.assets.usdc, polygon.assets.dai, polygon.assets.link]
    const assets = whitelist.map((x) => x.addr)
    const assetsMeta = whitelist.map((x) => ({
      priceFeed: x.priceFeed,
      decimals: x.decimals,
    }))
    housecat = await deployHousecat({
      signer,
      treasury: treasury.address,
      weth: polygon.assets.wmatic.addr,
      assets,
      assetsMeta,
      integrations: [polygon.paraswapV5.AugustusSwapper],
    })

    // create a mirrored portfolio with assets tokens
    await buyWeth(mirrored, polygon.assets.wmatic.addr, parseEther('4'))
    await swapToken(mirrored, polygon.assets.wmatic.addr, polygon.assets.weth.addr, parseEther('1'))
    await swapToken(mirrored, polygon.assets.wmatic.addr, polygon.assets.usdc.addr, parseEther('1'))
    await swapToken(mirrored, polygon.assets.wmatic.addr, polygon.assets.link.addr, parseEther('1'))

    // create a pool
    await housecat.factory.createPool(mirrored.address, [])
    const poolAddress = await housecat.factory.getPoolByMirrored(mirrored.address)
    pool = await ethers.getContractAt('HousecatPool', poolAddress)
  })

  it('initial deposit to pool', async () => {
    const { mgmt, adapters } = housecat
    const tx = deposit(pool, mgmt, adapters, mirrorer, parseEther('10'))
    await expect(tx).emit(pool, 'DepositToPool')
  })

  it('second deposit to pool', async () => {
    const { mgmt, adapters } = housecat
    const tx = deposit(pool, mgmt, adapters, mirrorer, parseEther('10'))
    await expect(tx).emit(pool, 'DepositToPool')
  })

  it('withdraw from pool', async () => {
    const { mgmt, adapters } = housecat
    const percent100 = await pool.getPercent100()
    const tx = withdraw(pool, mgmt, adapters, mirrorer, percent100.div(2))
    await expect(tx).emit(pool, 'WithdrawFromPool')
  })

  it('deposit to an unbalanced pool', async () => {
    const weth = await ethers.getContractAt('ERC20', polygon.assets.weth.addr)
    const link = await ethers.getContractAt('ERC20', polygon.assets.link.addr)
    await swapToken(mirrored, weth.address, polygon.assets.wmatic.addr, await weth.balanceOf(mirrored.address))
    await swapToken(mirrored, link.address, polygon.assets.wmatic.addr, await link.balanceOf(mirrored.address))

    const { mgmt, adapters } = housecat
    const tx = deposit(pool, mgmt, adapters, mirrorer, parseEther('10'))
    await expect(tx).emit(pool, 'DepositToPool')
  })
})
