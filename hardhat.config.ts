import * as dotenv from 'dotenv'

import { HardhatUserConfig } from 'hardhat/config'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import 'hardhat-gas-reporter'
import 'solidity-coverage'

dotenv.config()

const DUMMY_PRIVATE_KEY = '0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1'

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.4',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          //yul: false
        },
      },
    },
  },
  networks: {
    hardhat: {
      gas: 'auto',
      gasPrice: 'auto',
      gasMultiplier: 1.1,
      allowUnlimitedContractSize: true,
      forking: {
        url: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
        blockNumber: 26378365,
      },
      accounts: {
        accountsBalance: '10000000000000000000000000', // 1M ether
      },
    },
    ganache: {
      url: 'http://127.0.01:8545',
      chainId: 1337,
      accounts: [process.env.GANACHE_PRIVATE_KEY || DUMMY_PRIVATE_KEY],
      timeout: 90 * 1000,
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      accounts: [process.env.DEPLOY_PRIVATE_KEY || DUMMY_PRIVATE_KEY],
      chainId: 137,
      timeout: 90 * 1000,
    },
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
    gasPrice: 50,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  },
  mocha: {
    timeout: 90000,
  },
}

export default config
