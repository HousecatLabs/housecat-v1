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

Date: 17/05/2022

Version: a4174dd

HousecatManagement: `0xD33F03dccE8eCBA7d404225F5d8afa0DF5F4497f`

HousecatFactory: `0x5b2b2d98E6CF04106b018FB90e5cA51ac45d265A`

HousecatPool: `0xDf2820f0Ce3E68Bb01b91Ab542B1931C7a47a5BC`

HousecatQueries: `0x79DbE5caccdDCf45144EA9807f91873E2c146C46`

WETHAdapter: `0x6b0adBd28632D9B0032C32EB00Ba05BE6db15858`

UniswapV2Adapter: `0x4EB21B6592Ba12719E1A418B437dc75183A5C9F4`

AaveV2Adapter: `0x64f8cF2583C415C010955539F3f9A44bb9cd0c2B`

ParaswapV5Adapter: `0x825A57bB7b7e0F6156cFb8099B9a1AAcC0c16eB7`
