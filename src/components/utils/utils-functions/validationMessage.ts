import { ValidationSchema } from "./validationUtils";

export const validationMessage: ValidationSchema[] = [
    {
        field: "account",
        message: "Please select an account.",
        validate: (value) => value && value.trim() !== "",
    },
    // {
    //     field: "product",
    //     message: "Please select a product!",
    //     validate: (value) => value && value.trim() !== "",
    // },
    // {
    //     field: "remarks",
    //     message: "Please enter remarks.",
    //     validate: (value) => value && value.trim() !== "",
    // },
    // {
    //     field: "qty",
    //     message: "Please enter a valid quantity.",
    //     validate: (value) => value && !isNaN(Number(value)) && Number(value) > 0,
    // },
    {
        field: "amount",
        message: "Please enter a valid amount.",
        validate: (value) => value && !isNaN(Number(value)) && Number(value) > 0,
    },


];