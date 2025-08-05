export type ValidationSchema = {
    field: string; // The name of the form field to validate
    message: string; // The error message to display if validation fails
    validate: (value: any) => boolean; // A function to validate the field
};

/**
 * Generic function to validate form data.
 * @param formData - The current form data
 * @param schema - The validation schema containing field rules
 * @returns An array of validation error messages
 */
export const validateForm = (
    formData: Record<string, any>,
    schema: ValidationSchema[]
): string | null => {
    for (const { field, message, validate } of schema) {
        if (!validate(formData[field])) {
            return message; // Return the first error message found
        }
    }
    return null; // No validation errors
};

// Reusable validation function
export const validateFields = (data: Record<string, any>, schema: ValidationSchema[]) => {
    for (const rule of schema) {
        const fieldValue = data[rule.field]; // Get the value of the field
        if (!rule.validate(fieldValue)) {
            return rule.message; // Return the error message if validation fails
        }
    }
    return null; // All validations passed
};