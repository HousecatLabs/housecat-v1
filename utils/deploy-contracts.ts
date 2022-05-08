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
  ParaswapV5Adapter,
} from '../typechain-types'
import { TokenMetaStruct } from '../typechain-types/HousecatManagement'
import { BigNumber } from 'ethers'

export const deployQueries = async (signer: SignerWithAddress, gasPrice?: BigNumber): Promise<HousecatQueries> => {
  const HousecatQueries = await ethers.getContractFactory('HousecatQueries')
  const contract = await HousecatQueries.connect(signer).deploy({ gasPrice })
  return contract.deployed()
}

export const deployPool = async (signer: SignerWithAddress, gasPrice?: BigNumber): Promise<HousecatPool> => {
  const HousecatPool = await ethers.getContractFactory('HousecatPool')
  const contract = await HousecatPool.connect(signer).deploy({ gasPrice })
  return contract.deployed()
}

export const deployManagement = async (
  signer: SignerWithAddress,
  treasury: string,
  weth: string,
  gasPrice?: BigNumber
): Promise<HousecatManagement> => {
  const HousecatManagement = await ethers.getContractFactory('HousecatManagement')
  const contract = await HousecatManagement.connect(signer).deploy(treasury, weth, { gasPrice })
  return contract.deployed()
}

export const deployFactory = async (
  signer: SignerWithAddress,
  management: string,
  poolTemplate: string,
  gasPrice?: BigNumber
): Promise<HousecatFactory> => {
  const HousecatFactory = await ethers.getContractFactory('HousecatFactory')
  const contract = await HousecatFactory.connect(signer).deploy(management, poolTemplate, { gasPrice })
  return contract.deployed()
}

export interface IAdapters {
  uniswapV2Adapter: UniswapV2Adapter
  aaveV2Adapter: AaveV2Adapter
  wethAdapter: WETHAdapter
  paraswapV5Adapter: ParaswapV5Adapter
}

export const deployAdapters = async (signer: SignerWithAddress, gasPrice?: BigNumber): Promise<IAdapters> => {
  const uniswapV2Adapter = await (await ethers.getContractFactory('UniswapV2Adapter'))
    .connect(signer)
    .deploy({ gasPrice })
  await uniswapV2Adapter.deployed()

  const aaveV2Adapter = await (await ethers.getContractFactory('AaveV2Adapter')).connect(signer).deploy({ gasPrice })
  await aaveV2Adapter.deployed()

  const wethAdapter = await (await ethers.getContractFactory('WETHAdapter')).connect(signer).deploy({ gasPrice })
  await wethAdapter.deployed()

  const paraswapV5Adapter = await (await ethers.getContractFactory('ParaswapV5Adapter')).connect(signer).deploy({ gasPrice })
  await paraswapV5Adapter.deployed()

  return { uniswapV2Adapter, aaveV2Adapter, wethAdapter, paraswapV5Adapter }
}

export interface IDeployHousecat {
  signer: SignerWithAddress
  treasury?: string
  weth: string
  assets?: string[]
  assetsMeta?: TokenMetaStruct[]
  loans?: string[]
  loansMeta?: TokenMetaStruct[]
  integrations?: string[]
  gasPrice?: BigNumber
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
  weth,
  assets,
  assetsMeta,
  loans,
  loansMeta,
  integrations,
  gasPrice,
}: IDeployHousecat): Promise<IHousecat> => {
  const poolTemplate = await deployPool(signer, gasPrice)
  const mgmt = await deployManagement(signer, treasury || signer.address, weth, gasPrice)
  const factory = await deployFactory(signer, mgmt.address, poolTemplate.address, gasPrice)
  if (assets) {
    await (await mgmt.connect(signer).setSupportedAssets(assets, { gasPrice })).wait()
    if (assetsMeta) {
      await (await mgmt.connect(signer).setTokenMetaMany(assets, assetsMeta, { gasPrice })).wait()
    }
  }
  if (loans) {
    await (await mgmt.connect(signer).setSupportedLoans(loans, { gasPrice })).wait()
    if (loansMeta) {
      await (await mgmt.connect(signer).setTokenMetaMany(loans, loansMeta, { gasPrice })).wait()
    }
  }
  const adapters = await deployAdapters(signer, gasPrice)

  for (let i = 0; i < Object.keys(adapters).length; i++) {
    const key = Object.keys(adapters)[i] as keyof IAdapters
    const adapter = adapters[key]
    await (await mgmt.setAdapter(adapter.address, true, { gasPrice })).wait()
  }

  if (integrations) {
    for (let i = 0; i < integrations.length; i++) {
      await (await mgmt.setSupportedIntegration(integrations[i], true, { gasPrice })).wait()
    }
  }
  return { mgmt, factory, poolTemplate, adapters }
}
