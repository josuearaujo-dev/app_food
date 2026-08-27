/**
 * Testes leves sem framework — rode: node --experimental-strip-types lib/checkout/money-selftest.ts
 * (Node 22+) ou via tsx se disponível.
 */
import { dollarsToCents, centsToDollars, buildCartFingerprint } from './validation.ts'
import { normalizeCloverError } from '../clover/errors.ts'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

assert(dollarsToCents(10.5) === 1050, '10.50 -> 1050')
assert(dollarsToCents(10.505) === 1051, 'round half up-ish via Math.round')
assert(centsToDollars(1050) === 10.5, '1050 -> 10.5')

const fp = buildCartFingerprint([
  { id: 'a', quantity: 1, observation: 'X', selectedOptions: [{ optionId: '2' }, { optionId: '1' }] },
])
assert(fp.includes('a:1:x:1,2'), 'fingerprint normaliza opções e observação')

const declined = normalizeCloverError({ httpStatus: 402, message: 'card declined' })
assert(declined.code === 'card_declined', 'normalize declined')
assert(declined.retryable === false || declined.retryable === true, 'retryable flag exists')

console.log('money-selftest: ok')
