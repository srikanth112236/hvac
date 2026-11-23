const apiBase = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '')

/**
 * Public mailing-list capture. Only a 2xx response produces a success state;
 * a dead API is surfaced to the visitor instead of a fake confirmation.
 */
export async function subscribeToNewsletter(
  email: string,
  source = 'footer',
  honeypot = '',
): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${apiBase}/newsletter-signups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source, honeypot }),
    })
  } catch {
    throw new Error('The works API could not be reached. Please try again.')
  }
  if (!response.ok) {
    let message = 'The subscription could not be saved. Please try again.'
    try {
      const body = (await response.json()) as { error?: { message?: string } }
      message = body.error?.message ?? message
    } catch {
      // Keep the generic message if the body is not JSON.
    }
    throw new Error(message)
  }
}
