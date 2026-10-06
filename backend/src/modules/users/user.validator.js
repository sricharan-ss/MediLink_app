import { z } from 'zod';

export const authUserOtpSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z
    .string()
    .min(13, {
      message: 'Phone number must be at least 12 digits should have + sign',
    })
    .max(13, {
      message: 'Phone number must be at most 12 digits and should have + sign',
    }),
});

export const authWithMpinSchema = z.object({
  phoneNumber: z
    .string()
    .min(13, {
      message: 'Phone number must be at least 12 digits should have + sign',
    })
    .max(13, {
      message: 'Phone number must be at most 12 digits and should have + sign',
    }),
  mpin: z.string().length(6, { message: 'MPIN must be exactly 6 digits' }),
});

export const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters long' }),
  })
  .refine(
    (data) => {
      const hasUpperCase = /[A-Z]/.test(data.password);
      const hasLowerCase = /[a-z]/.test(data.password);
      const hasDigit = /\d/.test(data.password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(data.password);
      return hasUpperCase && hasLowerCase && hasDigit && hasSpecialChar;
    },
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
    },
  );

export const authWithPasswordSchema = z
  .object({
    phoneNumber: z
      .string()
      .min(13, {
        message: 'Phone number must be at least 12 digits should have + sign',
      })
      .max(13, {
        message:
          'Phone number must be at most 12 digits and should have + sign',
      }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters long' }),
  })
  .refine(
    (data) => {
      const hasUpperCase = /[A-Z]/.test(data.password);
      const hasLowerCase = /[a-z]/.test(data.password);
      const hasDigit = /\d/.test(data.password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(data.password);
      return hasUpperCase && hasLowerCase && hasDigit && hasSpecialChar;
    },
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
    },
  );

export const userByNameSchema = z.object({
  name: z.string().min(3, { message: 'Name must contain 3 characters' }),
});

export const emailOtpSchema = z.object({
  firstName: z.string().min(3, 'minimum 3 characters need'),
  lastName: z.string().min(3, 'minimum 3 characters needed'),
  email: z.email(),
  password: z
    .string()
    .min(8, 'minimum 8 characters needed')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character'),
});

export const phoneOtpSchema = z.object({
  firstName: z.string().min(3, 'minimum 3 characters need'),
  lastName: z.string().min(3, 'minimum 3 characters needed'),
  phoneNumber: z
    .string()
    .min(13, {
      message: 'Phone number must be at least 12 digits should have + sign',
    })
    .max(13, {
      message: 'Phone number must be at most 12 digits and should have + sign',
    }),
});

export const loginEmailSchema = z.object({
  email: z.email(),
  password: z.string().min(8,'miinimum 8 characters needed')
})