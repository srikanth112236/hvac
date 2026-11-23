import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { newsletterSignupSchema, type NewsletterSignup } from '@hvac/shared'
import { rateLimit } from './rateLimit.js'
import { createStore } from './store.js'

/**
 * Mailing-list capture from the public footer. This is a real store, not a
 * toast that forgets the address: the campaign audience builder reads it and
 * the admin can count it as reach.
 */
export const signupStore = createStore<NewsletterSignup[]>('newsletter-signups.json', () => [])

export async function readSubscribedSignups(): Promise<NewsletterSignup[]> {
  const signups = await signupStore.read()
  return signups.filter((signup) => signup.status === 'subscribed')
}

export async function readNewsletterSignups(): Promise<NewsletterSignup[]> {
  return signupStore.read()
}

export async function removeNewsletterSignup(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase()
  await signupStore.mutate((signups) => signups.filter((signup) => signup.email !== normalized))
}

export const newsletterSignupsRouter = Router()

newsletterSignupsRouter.post(
  '/newsletter-signups',
  rateLimit({
    scope: 'newsletter-signup',
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: 'Too many subscription attempts from this address. Try again later.',
  }),
  async (req, res, next) => {
    const parsed = newsletterSignupSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: parsed.error.issues[0]?.message ?? 'Enter a valid email address.',
        },
      })
      return
    }

    const email = parsed.data.email.toLowerCase()
    if (parsed.data.honeypot?.trim()) {
      // Silent trap: bots receive the same shape, nothing is stored.
      res.status(202).json({ data: { subscribed: true } })
      return
    }
    const now = new Date().toISOString()
    try {
      await signupStore.mutate((signups) => {
        const existing = signups.find((signup) => signup.email === email)
        if (existing) {
          if (existing.status === 'subscribed') return signups
          return signups.map((signup) =>
            signup.id === existing.id
              ? { ...signup, status: 'subscribed', updatedAt: now }
              : signup,
          )
        }
        return [
          {
            id: randomUUID(),
            email,
            source: parsed.data.source,
            status: 'subscribed',
            createdAt: now,
            updatedAt: now,
          },
          ...signups,
        ]
      })
    } catch (error) {
      next(error)
      return
    }

    // Same response for a new and an existing address: no list enumeration.
    res.status(202).json({ data: { subscribed: true } })
  },
)
