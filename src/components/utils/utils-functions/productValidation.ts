import { ValidationSchema } from "./validationUtils";

export const productValidation: ValidationSchema[] = [
    {
        field: "product",
        message: "Please select a product.",
        validate: (value: any) => {
            const stringValue = String(value); // Ensure value is treated as a string
            return stringValue.trim() !== "" && !isNaN(Number(value)) && Number(value) > 0; // Quantity must be a positive number
        },
    },
    {
        field: "qty",
        message: "Please enter a valid quantity.",
        validate: (value: any) => {
            const stringValue = String(value); // Ensure value is treated as a string
            return stringValue.trim() !== "" && !isNaN(Number(value)) && Number(value) > 0; // Quantity must be a positive number
        },
    },
    {
        field: "price",
        message: "Please enter a valid price.",
        validate: (value: any) => {
            const stringValue = String(value); // Ensure value is treated as a string
            return stringValue.trim() !== "" && !isNaN(Number(value)) && Number(value) > 0; // Price must be a positive number
        },
    },
];