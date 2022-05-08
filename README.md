# Housecat V1 Contracts

## Development

### Setup

1. Register a free account at `etherscan.io` and create an API key there.
2. Register a free account at any RPC provider (for example `moralis.io`) and create a Polygon RPC URL.
3. Create a `.env` file in the repository root and add the following:

```
POLYGON_RPC_URL=<your polygon rpc url here>
ETHERSCAN_API_KEY=<your etherscan api key here>
```

4. Install dependencies with `npm install`

### Compile and test

Run `npm run build` to compile the smart contracts.
Run `npm run test` to run tests.

### Deployment

Check [Polygon gas prices](https://polygonscan.com/gastracker) and adjust `gasPrice` in `scripts/deploy-contracts.ts` accordingly.

Set environment variable `DEPLOY_PRIVATE_KEY` to private used for deployment. Currently used key can be found in AWS Secrets Manager.

Deploy new contracts with:

```
npx hardhat run scripts/deploy.ts --network polygon
```

Record the contract addresses printed by the deployment script and add the to this `README.md` and change them in the `housecat-ui`
repository. Deploy new frontend with the new contract addresses.

## Deployed addresses (Polygon mainnet):

Date: 08/05/2022

Version: f9f6758

HousecatManagement: `0x64799ba056250a31Adcca7e9C28E1887c7eb3736`

HousecatFactory: `0xD2941537dAB720543636b0d2A9BA1f7d5705b6b4`

HousecatPool: `0x9d3B07d191dB329B1E71e3bf8C48940e9627288C`

HousecatQueries: `0xc9F741D544a5d2EE1c3a97c190a98eB7E9Eba3ac`

WETHAdapter: `0x29AC5746DE926aAE746480e73998dB077B02FDE7`

UniswapV2Adapter: `0x6be209f3add5D4EE319d74c80e99F7B3a3673D60`

AaveV2Adapter: `0x2F095317dd40cE3569DAD5A1211C679602b6bCb3`

ParaswapV5Adapter: `0x6b1b9EBb2f4813fA0f4875471412B6Ea89Ea7853`
