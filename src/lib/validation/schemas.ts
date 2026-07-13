import { z } from 'zod'

export const loginSchema = z.object({
  emailOrPhone: z.string().min(1, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
})

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  location: z.string().min(1, 'Location is required'),
  type: z.enum(['Apartments', 'Townhouses']),
  status: z.enum(['Off-plan', 'Ready', 'Under Construction']),
  completionDate: z.string().optional(),
  bookingToken: z.number().min(0, 'Booking token must be positive'),
  day7Payment: z.number().min(0),
  feePct: z.number().min(0).max(100),
  feeFixed: z.number().min(0),
  utilityAmount: z.number().min(0),
  parkingCost: z.number().min(0),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color'),
})

export const unitSchema = z.object({
  number: z.string().min(1, 'Unit number is required'),
  floor: z.union([z.number(), z.string()]),
  area: z.number().min(1, 'Area must be positive'),
  price: z.number().min(0, 'Price must be non-negative'),
})

export const clientSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  clientPhone: z.string().optional(),
})
