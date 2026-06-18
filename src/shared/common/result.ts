export type Result<T, E = string> = { success: true; data: T } | { success: false; error: E };

export const Result = {
  ok<T>(data: T): Result<T> {
    return { success: true, data };
  },
  fail<E = string>(error: E): Result<never, E> {
    return { success: false, error };
  },
};
