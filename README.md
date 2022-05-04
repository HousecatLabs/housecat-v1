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

Date: 04/05/2022

Version: 6615a61

HousecatManagement: `0xDb4CCF28b489d81a99c834fEb035dF6355BfdFC2`

HousecatFactory: `0x2b81Df3F48E01640593f135476Cc631dE20f4F77`

HousecatPool: `0xdfF5BE44155FA30Ada7B0D4d051e461008D4895D`

HousecatQueries: `0x5E570dd4E39D18b16b87cdEE51633017a0041Ac4`

WETHAdapter: `0x1B8303CBB43D835E34666765669BFAFB836223A8`

UniswapV2Adapter: `0x7dd6430153E28c409f8C771c67cEe63DF23140Ce`

AaveV2Adapter: `0xA39DD4cf839EbF129130DE95601b34100adb7c90`
