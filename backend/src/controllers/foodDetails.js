import { validationResult } from 'express-validator';
import {searchingFunction} from '../utils/barcodeScaner.js';

export const BarcodeSearchResult = async (req ,res) => {
    try {
        // Validate request body
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
       
        // Extract barcode number from request body
        const { barcodeNumber } = req.body;
        if (!barcodeNumber) {
            return res.status(400).json({ message: 'Barcode number is required' });
        }
        const productDetails = await searchingFunction(barcodeNumber);
        if (!productDetails) {
            return res.status(404).json({ message: 'Product not found for the given barcode' });
        }

        return res.status(200).json({
            messges: "message  success fully fatch",
            success: true,
            data: productDetails
        })

    } catch (error) {
        console.error('Error in loginUser: ', error);
        return res.status(500).json({ message: 'Server error' });

    }

}