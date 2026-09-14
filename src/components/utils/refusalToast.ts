import { toast } from 'react-toastify';

/**
 * A refusal the clerk is meant to read, not a failure.
 *
 * ⚠️ A closed year (§42) saying "no" is not an error: nothing broke, the books
 * are as the owner left them, and the sentence tells the clerk what to do. In
 * the red error toast it read as the system failing -- the owner asked for it
 * to be told as information (2026-09-14). The sentence is the server's own,
 * from PeriodClosedException::sentence(), which is why it can be recognised
 * here by its shape. Everything else stays the error it is.
 */
const CLOSED_YEAR = /The year ending \d{2}\/\d{2}\/\d{4} is closed/;

export const isClosedYearRefusal = (message: unknown): boolean =>
  typeof message === 'string' && CLOSED_YEAR.test(message);

/** Show a server refusal in the voice it deserves. */
export const toastRefusal = (message: unknown, fallback = 'Something went wrong.'): void => {
  const text = typeof message === 'string' && message.trim() ? message : fallback;

  if (isClosedYearRefusal(text)) {
    // Longer than an error: it is a sentence to act on, not a flash.
    toast.info(text, { autoClose: 10000 });
    return;
  }

  toast.error(text);
};
