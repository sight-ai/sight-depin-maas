import { z } from 'zod';

export const dialog_response = z.enum(['confirm', 'cancel', 'cancel_and_alternate']);

// Exporting the array of possible values
export const SaitoDialogResponseOptions = dialog_response.options;
