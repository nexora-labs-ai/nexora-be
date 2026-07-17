export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 30;

export const USERNAME_REGEX = new RegExp(
  `^[a-z0-9_]{${MIN_USERNAME_LENGTH},${MAX_USERNAME_LENGTH}}$`,
);
export const USERNAME_INVALID_MESSAGE = `Username is invalid, it can only contain lowercase letters, numbers, and underscores, and must be ${MIN_USERNAME_LENGTH} to ${MAX_USERNAME_LENGTH} characters long`;
