import { z } from 'zod'

const isoDate = z.string().refine(
  (value) => !Number.isNaN(new Date(value).getTime()),
  'Enter a valid date and time',
)

const color = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Use a six-digit hex color')

export const eventPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent'])
export const eventStatusSchema = z.enum(['scheduled', 'tentative', 'cancelled'])
export const eventVisibilitySchema = z.enum(['calendar', 'participants', 'private'])

export const eventInputSchema = z
  .object({
    calendarId: z.string().uuid(),
    title: z.string().trim().min(1, 'Add a title').max(160, 'Keep the title under 160 characters'),
    description: z.string().trim().max(5000).optional().default(''),
    location: z.string().trim().max(200).optional().default(''),
    startsAt: isoDate,
    endsAt: isoDate,
    allDay: z.boolean(),
    timeZone: z.string().min(1),
    categoryId: z.string().uuid().nullable().optional().default(null),
    priority: eventPrioritySchema,
    status: eventStatusSchema.optional().default('scheduled'),
    visibility: eventVisibilitySchema,
    recurrenceRule: z.string().trim().max(500).nullable().optional().default(null),
    recurrenceUntil: isoDate.nullable().optional().default(null),
    participantIds: z.array(z.string().uuid()).optional().default([]),
  })
  .superRefine((value, context) => {
    if (new Date(value.endsAt).getTime() <= new Date(value.startsAt).getTime()) {
      context.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'End time must be after the start time',
      })
    }

    if (value.recurrenceUntil && value.recurrenceUntil < value.startsAt) {
      context.addIssue({
        code: 'custom',
        path: ['recurrenceUntil'],
        message: 'Repeat end must be after the start',
      })
    }
  })

export const workspaceInputSchema = z.object({
  name: z.string().trim().min(2, 'Add a workspace name').max(80),
  slug: z
    .string()
    .trim()
    .min(2, 'Add a workspace address')
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens'),
})

export const calendarInputSchema = z.object({
  name: z.string().trim().min(1, 'Add a calendar name').max(80),
  description: z.string().trim().max(500).optional().default(''),
  kind: z.enum(['personal', 'team', 'workspace', 'shared']),
  teamId: z.string().uuid().nullable().optional().default(null),
  color,
})

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}
