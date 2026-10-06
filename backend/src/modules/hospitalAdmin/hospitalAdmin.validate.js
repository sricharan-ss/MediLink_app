import { z } from 'zod';

export const adminSignupSchema = z.object({
  email: z.email({ message: 'email must be a valid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .refine(
      (data) => {
        const hasUpperCase = /[A-Z]/.test(data);
        const hasLowerCase = /[a-z]/.test(data);
        const hasDigit = /\d/.test(data);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(data);
        return hasUpperCase && hasLowerCase && hasDigit && hasSpecialChar;
      },
      {
        message:
          'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
      },
    ),
});

export const adminLoginSchema = z.object({
  email: z.email({ message: 'email must be a valid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' }),
});
