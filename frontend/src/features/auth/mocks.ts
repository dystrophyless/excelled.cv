/* Mock data for the auth prototype states. */

export const MOCK_EMAIL = "maya@sdu.edu.kz";
export const MOCK_CODE = "482913";

/** Seconds: sign-in pause after 5 wrong passwords (FR-009a), shown part-way through. */
export const LOCK_RETRY_AFTER = 14 * 60 + 32;
/** Seconds: remaining wait before a new code can be requested. */
export const RESEND_COOLDOWN = 45;
export const RESEND_FULL = 60;

export const SIGN_IN_FIELD_ERRORS = { email: "Enter your email", password: "Enter your password" };
export const SIGN_UP_FIELD_ERRORS = { email: "Enter an email like you@university.edu", password: "Use 8 to 64 characters" };
export const RESET_EMAIL_ERROR = { email: "Enter an email like you@university.edu" };
export const NEW_PASSWORD_ERROR = { password: "That password is too short" };
