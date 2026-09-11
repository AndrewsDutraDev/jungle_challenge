import type { CollectorDetails } from '@/types/api'

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/i
const ENS_LABEL_RE = /^[a-z0-9-]{3,63}$/
const ENS_OR_ADDRESS_RE = /^([a-z0-9-]{3,63}\.eth|0x[a-fA-F0-9]{40})$/
const REFERRAL_RE = /^[a-z0-9]{4,12}$/i
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
export const NOTE_MAX_LENGTH = 280

export interface CheckoutFormValues extends CollectorDetails {
  /** Carteira que recebe os NFTs quando o colecionador marca "Usar outra carteira". */
  recipientAddress: string | null
}

/**
 * Regras dos dados do colecionador no pagamento. As mesmas no formulário e na
 * API simulada, que revalida o pedido. As chaves do resultado são os ids dos
 * campos, para cada mensagem ficar associada ao seu campo.
 */
export function validateCheckoutForm(values: CheckoutFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (values.displayName.trim().length < 2) errors.displayName = 'Informe o nome de exibição (mínimo de 2 caracteres).'
  if (!USERNAME_RE.test(values.username.trim())) {
    errors.username = 'Use de 3 a 30 letras, números, ponto, hífen ou sublinhado.'
  }
  if (values.profileName.trim().length < 2) errors.profileName = 'Informe o nome do perfil (mínimo de 2 caracteres).'
  if (values.recipientAddress !== null && !ADDRESS_RE.test(values.recipientAddress)) {
    errors.walletAddress = 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais.'
  }
  if (values.secondaryEns && !ENS_OR_ADDRESS_RE.test(values.secondaryEns)) {
    errors.secondaryEns = 'Informe um nome .eth ou um endereço 0x.'
  }
  if (values.referralCode && !REFERRAL_RE.test(values.referralCode)) {
    errors.referralCode = 'O código tem de 4 a 12 letras ou números.'
  }
  if (values.ensName && !ENS_LABEL_RE.test(values.ensName)) {
    errors.ensName = 'Use de 3 a 63 letras minúsculas, números ou hífen, sem ".eth".'
  }
  if (values.note && values.note.length > NOTE_MAX_LENGTH) errors.note = `A observação tem no máximo ${NOTE_MAX_LENGTH} caracteres.`
  return errors
}
