import { ValidationSchema } from "./validationUtils";

export const invoiceMessage: ValidationSchema[] = [
    {
        field: "account",
        message: "Please select an account.",
        validate: (value: string | number) => {
            // Check if value is a non-empty string or a valid number
            return (
                (typeof value === "string" && value.trim() !== "") || // Valid non-empty string
                (!isNaN(Number(value)) && typeof value === "number") // Valid number
            );
        },
    },
    {
        field: "accountName",
        message: "Account name is required.",
        validate: (value: string) => value.trim() !== "", // Ensure accountName is not empty
    },
    {
        field: "discountAmt",
        message: "Discount amount must be 0 or greater.",
        validate: (value: string) =>
            value !== null &&
            value !== undefined &&
            !isNaN(Number(value)) &&
            Number(value) >= 0, // Allow 0 or any positive number
    }
];