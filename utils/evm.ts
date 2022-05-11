import { ethers } from 'hardhat'

export const SECONDS = 1

export const MINUTES = 60 * SECONDS

export const HOURS = 60 * MINUTES

export const DAYS = 24 * HOURS

export const mine = async () => {
  await ethers.provider.send('evm_mine', [])
}

export const increaseTime = async (amount: number) => {
  await ethers.provider.send('evm_increaseTime', [amount])
  await mine()
}
