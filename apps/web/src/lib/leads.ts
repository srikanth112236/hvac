import type {
  CallbackLead,
  LeadRecord,
  LeadSubmission,
} from '@hvac/shared'

/**
 * Public lead capture. The API is a separate process in development; the base
 * URL is configurable at build time and every failure is surfaced to the
 * visitor rather than being hidden behind a fake receipt.
 */
const apiBase = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '')

interface ErrorBody {
  error?: { message?: string; issues?: { message: string }[] }
}

async function postLead<TBody>(path: string, body: TBody): Promise<LeadRecord> {
  let response: Response
  try {
    response = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('The works API could not be reached. Call dispatch or try again.')
  }

  if (!response.ok) {
    let message = 'The enquiry could not be logged. Call dispatch or try again.'
    try {
      const parsed = (await response.json()) as ErrorBody
      message = parsed.error?.issues?.[0]?.message ?? parsed.error?.message ?? message
    } catch {
      // Keep the generic message when the body is not JSON.
    }
    throw new Error(message)
  }

  const payload = (await response.json()) as { data?: LeadRecord }
  if (!payload.data) throw new Error('The works API returned an empty receipt. Call dispatch.')
  return payload.data
}

export function submitEnquiry(input: LeadSubmission): Promise<LeadRecord> {
  return postLead('/leads', input)
}

export function submitCallback(input: CallbackLead): Promise<LeadRecord> {
  return postLead('/leads/callback', input)
}
