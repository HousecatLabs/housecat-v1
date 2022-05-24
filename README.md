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

## Deployed addresses:

Version: 81432f8

```js
{
  timestamp: '2022-05-24T17:19:43.646Z',
  network: 'polygon',
  addresses: {
    HousecatManagement: '0x3570047AA7b422F934D35cA0c012A855039CbBeF',
    HousecatFactory: '0xeC3eE6ebc29cC693bBcB2B8818F84c30A1490761',
    HousecatPool: '0x497b5D7cD81A85998eE1a00c0a3471D3FfD56529',
    HousecatQueries: '0xcFe7F795f75162dd4727a0e2beA3817670F8e56d',
    WETHAdapter: '0xb49D28d77E7f741dAa73513FC8297129b04BaB7f',
    UniswapV2Adapter: '0xc97A5B461FC4e476172b655B5254B4C0c3607A06',
    AaveV2Adapter: '0xeA1c7abEe606e5BcC6A7D9e64307c5181b65E8C7',
    ParaswapV5Adapter: '0x368D9b973Edb1B9907726BDD7C245F267C5d13B4'
  }
}

```
