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

Date: 10/05/2022

Version: d2b42c0

HousecatManagement: `0xd167AdBacC95D1FF9a2a8f7b97b9BaF9EE2bBdea`

HousecatFactory: `0xC7A2DFf90332AD6d5E84aafc3b7Df074b254Eee5`

HousecatPool: `0x61CD1676Ed3Dc1bD80522872e9E679dd31F63C5E`

HousecatQueries: `0xCbE908D66E35eF7c1171366824C86b1476b2782d`

WETHAdapter: `0x77d7E7aB92B0497a33670D2789509162524ad83d`

UniswapV2Adapter: `0x25b588e96A169b0c68E173CbD5B74275D5ef425A`

AaveV2Adapter: `0xf6388a9D8f6820ee02dd1B44842c5E0310E60c88`

ParaswapV5Adapter: `0x8343E9D4Cb6B83680AC906B23083aF02511C118d`
