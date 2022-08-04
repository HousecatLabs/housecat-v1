import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import {
  HousecatManagement,
  HousecatFactory,
  HousecatPool,
  HousecatQueries,
  UniswapV2Adapter,
  AaveV2Adapter,
  WETHAdapter,
  WithdrawAdapter,
} from '../typechain-types'
import { TokenMetaStruct } from '../typechain-types/HousecatManagement'
import { BigNumber } from 'ethers'

export const deployQueries = async (
  signer: SignerWithAddress,
  gasPrice?: BigNumber,
  gasLimit?: number
): Promise<HousecatQueries> => {
  const HousecatQueries = await ethers.getContractFactory('HousecatQueries')
  const contract = await HousecatQueries.connect(signer).deploy({ gasPrice, gasLimit })
  return contract.deployed()
}

export const deployPool = async (
  signer: SignerWithAddress,
  gasPrice?: BigNumber,
  gasLimit?: number
): Promise<HousecatPool> => {
  const HousecatPool = await ethers.getContractFactory('HousecatPool')
  const contract = await HousecatPool.connect(signer).deploy({ gasPrice, gasLimit })
  return contract.deployed()
}

export const deployManagement = async (
  signer: SignerWithAddress,
  treasury: string,
  weth: string,
  gasPrice?: BigNumber,
  gasLimit?: number
): Promise<HousecatManagement> => {
  const HousecatManagement = await ethers.getContractFactory('HousecatManagement')
  const contract = await HousecatManagement.connect(signer).deploy(treasury, weth, { gasPrice, gasLimit })
  return contract.deployed()
}

export const deployFactory = async (
  signer: SignerWithAddress,
  management: string,
  poolTemplate: string,
  gasPrice?: BigNumber,
  gasLimit?: number
): Promise<HousecatFactory> => {
  const HousecatFactory = await ethers.getContractFactory('HousecatFactory')
  const contract = await HousecatFactory.connect(signer).deploy(management, poolTemplate, { gasPrice, gasLimit })
  return contract.deployed()
}

export interface IAdapters {
  uniswapV2Adapter: UniswapV2Adapter
  aaveV2Adapter: AaveV2Adapter
  wethAdapter: WETHAdapter
  withdrawAdapter: WithdrawAdapter
}

export const deployAdapters = async (
  signer: SignerWithAddress,
  gasPrice?: BigNumber,
  gasLimit?: number
): Promise<IAdapters> => {
  const uniswapV2Adapter = await (await ethers.getContractFactory('UniswapV2Adapter'))
    .connect(signer)
    .deploy({ gasPrice })
  await uniswapV2Adapter.deployed()

  const aaveV2Adapter = await (await ethers.getContractFactory('AaveV2Adapter'))
    .connect(signer)
    .deploy({ gasPrice, gasLimit })
  await aaveV2Adapter.deployed()

  const wethAdapter = await (await ethers.getContractFactory('WETHAdapter'))
    .connect(signer)
    .deploy({ gasPrice, gasLimit })
  await wethAdapter.deployed()

  const withdrawAdapter = await (await ethers.getContractFactory('WithdrawAdapter'))
    .connect(signer)
    .deploy({ gasPrice, gasLimit })
  await withdrawAdapter.deployed()

  return { uniswapV2Adapter, aaveV2Adapter, wethAdapter, withdrawAdapter }
}

export interface IDeployHousecat {
  signer: SignerWithAddress
  treasury?: string
  rebalancers?: string[]
  weth: string
  assets?: string[]
  assetsMeta?: TokenMetaStruct[]
  loans?: string[]
  loansMeta?: TokenMetaStruct[]
  integrations?: string[]
  gasPrice?: BigNumber
  gasLimit?: number
}

export interface IHousecat {
  mgmt: HousecatManagement
  factory: HousecatFactory
  poolTemplate: HousecatPool
  adapters: IAdapters
}

export const deployHousecat = async ({
  signer,
  treasury,
  rebalancers,
  weth,
  assets,
  assetsMeta,
  loans,
  loansMeta,
  integrations,
  gasPrice,
  gasLimit,
}: IDeployHousecat): Promise<IHousecat> => {
  const poolTemplate = await deployPool(signer, gasPrice, gasLimit)
  const mgmt = await deployManagement(signer, treasury || signer.address, weth, gasPrice, gasLimit)
  if (rebalancers) {
    const rebalanceSettings = await mgmt.getRebalanceSettings()
    await mgmt.connect(signer).updateRebalanceSettings({
      ...rebalanceSettings,
      rebalancers,
    })
  }
  const factory = await deployFactory(signer, mgmt.address, poolTemplate.address, gasPrice, gasLimit)
  if (assets) {
    await (await mgmt.connect(signer).setSupportedAssets(assets, { gasPrice })).wait()
    if (assetsMeta) {
      await (await mgmt.connect(signer).setTokenMetaMany(assets, assetsMeta, { gasPrice, gasLimit })).wait()
    }
  }
  if (loans) {
    await (await mgmt.connect(signer).setSupportedLoans(loans, { gasPrice })).wait()
    if (loansMeta) {
      await (await mgmt.connect(signer).setTokenMetaMany(loans, loansMeta, { gasPrice, gasLimit })).wait()
    }
  }
  const adapters = await deployAdapters(signer, gasPrice, gasLimit)

  for (let i = 0; i < Object.keys(adapters).length; i++) {
    const key = Object.keys(adapters)[i] as keyof IAdapters
    const adapter = adapters[key]
    await (await mgmt.setAdapter(adapter.address, true, { gasPrice, gasLimit })).wait()
  }

  if (integrations) {
    for (let i = 0; i < integrations.length; i++) {
      await (await mgmt.setSupportedIntegration(integrations[i], true, { gasPrice, gasLimit })).wait()
    }
  }
  return { mgmt, factory, poolTemplate, adapters }
}
