import { productValidation } from "./productValidation";
import { validateFields } from "./validationUtils"; 
import { toast } from "react-toastify";

// Function to validate product data
export const validateProductData = (productData: Record<string, any>) => {
    const errorMessage = validateFields(productData, productValidation);
    if (errorMessage) {
        toast.info(errorMessage); // Display the validation error message
        return false; // Validation failed
    }
    return true; // Validation passed
};