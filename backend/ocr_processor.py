import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
from PIL import Image
import io
import re
import logging
from typing import List
logger = logging.getLogger(__name__)

def extract_medicines_from_image(image_bytes: bytes) -> List[str]:
    """
    Extract medicine names from prescription image using Tesseract OCR
    """
    try:
        # Open image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Perform OCR
        text = pytesseract.image_to_string(image, lang='eng')
        
        logger.info(f'Extracted text from image: {text[:200]}...')
        
        # Extract potential medicine names
        # Look for capitalized words or words that look like medicine names
        lines = text.split('\n')
        potential_medicines = []
        
        for line in lines:
            line = line.strip()
            # Skip empty lines or lines with only numbers
            if not line or line.isdigit():
                continue
            
            # Look for words that might be medicine names
            # Medicine names are usually capitalized or contain alphanumeric characters
            words = re.findall(r'[A-Za-z][A-Za-z0-9]{2,}', line)
            
            for word in words:
                # Filter out common non-medicine words
                if word.lower() not in ['tablet', 'capsule', 'syrup', 'injection', 'morning', 'evening', 'night', 'after', 'before', 'meal', 'food']:
                    if len(word) >= 3:
                        potential_medicines.append(word)
        
        # Remove duplicates while preserving order
        unique_medicines = list(dict.fromkeys(potential_medicines))
        
        logger.info(f'Extracted {len(unique_medicines)} potential medicine names')
        
        return unique_medicines[:20]  # Limit to 20 medicines
        
    except Exception as e:
        logger.error(f'Error extracting medicines from image: {e}')
        return []