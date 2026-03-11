import axios from 'axios';
import config from '../config/config.js';

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: config.googleGenAIKey });


const barcodeChack = async (barcodeNumber) => {

    try {
        const apiUrl = `https://world.openfoodfacts.org/api/v2/product/${barcodeNumber}.json`;
        const response = await axios.get(apiUrl);
        const data = response.data; // This is the JSON response from Open Food Facts API
        // Check for API errors or empty results
        if (data.status === 0) {
            console.error('❌ Open Food Facts API Error:', data.status_verbose || 'No product found for this barcode.');
            return null;
        }
        // console.log(data);

        if (data.status === 1 && data.product) {
            const product = data.product;

            // console.log(product);

            return product;
        } else {
            console.log('🤷 No product found for this barcode in Open Food Facts.');
            return null;
        } // Return the full JSON data for potential further programmatic use

    } catch (error) {
        console.error('An error occurred during barcode check:', error.message);
        if (error.response) {
            console.error('API Error Status:', error.response.status);
            console.error('API Error Data:', JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }



}


const searchGoogle = async (productJSON) => {

    const instructionPrompt = `
    Act as a JSON data formatter. Your task is to analyze the provided JSON data for a food product and generate a new JSON array based on the specified structure.

    Follow these instructions exactly:

    1.  **Output Format:** Your final output must be a single JSON array. Do not include any other text or explanations.
    2.  **Array Structure:** The array must contain objects, and each object must have exactly two keys: "label" and "value".
    3.  **Critical Rule for Missing Data:** If any piece of data required to build a value is missing, null, or an empty string in the source JSON, the final "value" must be the string "N/A".
    4.  **Combining Rule:** When instructed to combine a value and its unit, they must be joined by a single space (e.g., "10 g"). If either the value or the unit is missing, the entire result must be "N/A" as per the rule above.

    *JSON Array Objects to Generate (in this exact order):*

    1.  **Product Name:**
        *   label: "Product Name"
        *   value: Get from ${`product_name`}.

    2.  **Carbohydrates:**
        *   label: "Carbohydrates"
        *   value: Combine ${`nutriments.carbohydrates_serving`}," and", ${`nutriments.carbohydrates_unit`}.

    3.  **Fiber:**
        *   label: "Fiber"
        *   value: Combine ${`nutriments.fiber_serving`} and ${`nutriments.fiber_unit`}.

    4.  **Sugars:**
        *   label: "Sugars"
        *   value: Combine ${`nutriments.sugars_serving`} and ${`nutriments.sugars_unit`}.

    5.  **Protein:**
        *   label: "Protein"
        *   value: Combine ${`nutriments.proteins_serving`} and ${`nutriments.proteins_unit`}.

    6.  **Fat:**
        *   label: "Fat"
        *   value: Combine ${`nutriments.fat_serving`} and ${`nutriments.fat_unit`}.

    7.  **Saturated Fat:**
        *   label: "Saturated Fat"
        *   value: Combine ${`nutriments['saturated-fat_serving']`} and ${`nutriments['saturated-fat_unit']`}.

    8.  **Sodium:**
        *   label: "Sodium"
        *   value: Combine ${`nutriments.sodium_serving`} and ${`nutriments.sodium_unit`}.

    9.  **Calories per Serving:**
        *   label: Create a string "Per serving (X g)" using ${`serving_quantity`} and ${`serving_quantity_unit`}. If data is missing, the label is "Per serving".
        *   value: Create a string "Y kcal" using ${`nutriments['energy-kcal_serving']`}.

    10. **Calories per 100g:**
        *   label: "Per 100g"
        *   value: Create a string "Z kcal" using ${`nutriments['energy-kcal_100g']`}.

    11. **Ingredients:**
        *   label: "Ingredients"
        *   value: Get from ${`ingredients_text`}.

    12. **Serving Size:**
        *   label: "Serving Size"
        *   value: Get from ${`serving_size`}.

    13. **Serving Quantity Unit:**
        *   label: "Serving Quantity Unit"
        *   value: Get from ${`serving_quantity_unit`}.

    14. **Vitamin C:**
        *   label: "Vitamin C"
        *   value: If ${`nutriments['vitamin-c_serving']`} is exactly 0, the value is "0% DV". Otherwise, combine its value and unit.
    `;


    const fullPrompt = `${instructionPrompt}\n---\n${JSON.stringify(productJSON, null, 2)}\n---`;

    try {
        console.log("🔍 Searching Google GenAI with the following prompt:")
       
        const response = await ai.models.generateContent({
            model: config.googleGenAIModel,
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],

            stopSequences: ["\n"],
        });
        return response.text;

    } catch (error) {
        console.error('Error in searchGoogle:', error);
        return null;
    }

    //   console.log(response.text);


}


export const searchingFunction = async (barcodeNumber) => {
    const productDetails = await barcodeChack(barcodeNumber);
    if (!productDetails) {
        return null;
    }
    const result = await searchGoogle(productDetails);



    try {


        // This regex is designed to capture the content *between* the ```json and ``` markers.
        const regex = /```json([\s\S]*?)```/;
        const match = result.match(regex);

        // We MUST check if the regex found a match.
        if (match && match[1]) {
            // =========================================================================
            // THE FIX IS HERE.
            // `match[0]` is the full text including ```json and ```.
            // `match[1]` is ONLY the text captured by the parentheses `()`.
            // This is the clean string.
            // =========================================================================
            const jsonContent = match[1];

            

            // Step 3: Parse the clean string.
            const data = JSON.parse(jsonContent);

            return data;

        } else {
            // This runs if the response did not contain the ```json...``` block.
            console.error("❌ ERROR: Could not find the JSON block inside the response.");
        }

    } catch (error) {
        // This runs if the text inside the block is invalid JSON (e.g., a syntax error).
        console.error("❌ CRITICAL ERROR: Parsing failed. The text inside the JSON block is malformed.", error);
    }    // const resul
}