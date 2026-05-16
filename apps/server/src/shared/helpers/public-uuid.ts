import { randomInt } from 'crypto'

export const PUBLIC_UUID_LENGTH = 8

const publicUuidAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const publicUuidLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function dispatchPublicUuid(length = PUBLIC_UUID_LENGTH) {
  if (!Number.isInteger(length) || length < 2) {
    throw new Error('Public uuid length must be an integer greater than 1.')
  }

  const characters = Array.from({ length }, () => publicUuidAlphabet[randomInt(publicUuidAlphabet.length)])

  if (!characters.some((character) => publicUuidLetters.includes(character))) {
    characters[randomInt(length)] = publicUuidLetters[randomInt(publicUuidLetters.length)]
  }

  return characters.join('')
}

export const generatePublicUuid = dispatchPublicUuid
