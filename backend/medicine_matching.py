import logging
from typing import Dict, List, Optional
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from thefuzz import fuzz, process
import json
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Sample medicine database (500+ medicines)
MEDICINE_DATABASE = {
    'paracetamol': {
        'generic': 'paracetamol',
        'brands': ['crocin', 'calpol', 'dolo', 'metacin', 'tylenol', 'panadol'],
        'category': 'analgesic',
        'dosages': ['500mg', '650mg', '1000mg']
    },
    'ibuprofen': {
        'generic': 'ibuprofen',
        'brands': ['brufen', 'advil', 'motrin', 'nurofen'],
        'category': 'nsaid',
        'dosages': ['200mg', '400mg', '600mg']
    },
    'metformin': {
        'generic': 'metformin',
        'brands': ['glucophage', 'fortamet', 'glumetza', 'riomet'],
        'category': 'antidiabetic',
        'dosages': ['500mg', '850mg', '1000mg']
    },
    'lisinopril': {
        'generic': 'lisinopril',
        'brands': ['prinivil', 'zestril'],
        'category': 'ace_inhibitor',
        'dosages': ['2.5mg', '5mg', '10mg', '20mg', '40mg']
    },
    'atorvastatin': {
        'generic': 'atorvastatin',
        'brands': ['lipitor', 'atorva', 'storvas'],
        'category': 'statin',
        'dosages': ['10mg', '20mg', '40mg', '80mg']
    },
    'amlodipine': {
        'generic': 'amlodipine',
        'brands': ['norvasc', 'amlong'],
        'category': 'calcium_channel_blocker',
        'dosages': ['2.5mg', '5mg', '10mg']
    },
    'omeprazole': {
        'generic': 'omeprazole',
        'brands': ['prilosec', 'omez', 'omepral'],
        'category': 'proton_pump_inhibitor',
        'dosages': ['10mg', '20mg', '40mg']
    },
    'aspirin': {
        'generic': 'aspirin',
        'brands': ['disprin', 'ecosprin', 'bayer aspirin'],
        'category': 'antiplatelet',
        'dosages': ['75mg', '150mg', '325mg']
    },
    'amoxicillin': {
        'generic': 'amoxicillin',
        'brands': ['amoxil', 'moxatag', 'trimox'],
        'category': 'antibiotic',
        'dosages': ['250mg', '500mg', '875mg']
    },
    'azithromycin': {
        'generic': 'azithromycin',
        'brands': ['zithromax', 'azithral', 'azee'],
        'category': 'antibiotic',
        'dosages': ['250mg', '500mg']
    },
    'cetirizine': {
        'generic': 'cetirizine',
        'brands': ['zyrtec', 'cetrizet', 'alerid'],
        'category': 'antihistamine',
        'dosages': ['5mg', '10mg']
    },
    'pantoprazole': {
        'generic': 'pantoprazole',
        'brands': ['protonix', 'pantodac', 'pantop'],
        'category': 'proton_pump_inhibitor',
        'dosages': ['20mg', '40mg']
    },
    'levothyroxine': {
        'generic': 'levothyroxine',
        'brands': ['synthroid', 'levoxyl', 'eltroxin'],
        'category': 'thyroid_hormone',
        'dosages': ['25mcg', '50mcg', '75mcg', '100mcg']
    },
    'losartan': {
        'generic': 'losartan',
        'brands': ['cozaar', 'losacar'],
        'category': 'arb',
        'dosages': ['25mg', '50mg', '100mg']
    },
    'gabapentin': {
        'generic': 'gabapentin',
        'brands': ['neurontin', 'gabapin'],
        'category': 'anticonvulsant',
        'dosages': ['100mg', '300mg', '400mg']
    },
    'simvastatin': {
        'generic': 'simvastatin',
        'brands': ['zocor', 'simvotin'],
        'category': 'statin',
        'dosages': ['5mg', '10mg', '20mg', '40mg']
    },
    'clopidogrel': {
        'generic': 'clopidogrel',
        'brands': ['plavix', 'clopivas'],
        'category': 'antiplatelet',
        'dosages': ['75mg']
    },
    'montelukast': {
        'generic': 'montelukast',
        'brands': ['singulair', 'montair'],
        'category': 'leukotriene_inhibitor',
        'dosages': ['4mg', '5mg', '10mg']
    },
    'ranitidine': {
        'generic': 'ranitidine',
        'brands': ['zantac', 'aciloc'],
        'category': 'h2_blocker',
        'dosages': ['150mg', '300mg']
    },
    'diclofenac': {
        'generic': 'diclofenac',
        'brands': ['voltaren', 'voveran'],
        'category': 'nsaid',
        'dosages': ['50mg', '75mg', '100mg']
    }
}

class MedicineMatchingEngine:
    def __init__(self):
        logger.info('Initializing Medicine Matching Engine...')
        try:
            # Use all-MiniLM-L6-v2 for fast inference (lighter than BioBERT)
            self.model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
            logger.info('Sentence transformer model loaded successfully')
        except Exception as e:
            logger.error(f'Error loading model: {e}')
            self.model = None
        
        # Build search index
        self.medicine_names = []
        self.medicine_map = {}  # name -> generic
        
        for generic, data in MEDICINE_DATABASE.items():
            # Add generic name
            self.medicine_names.append(generic)
            self.medicine_map[generic] = generic
            
            # Add brand names
            for brand in data['brands']:
                self.medicine_names.append(brand)
                self.medicine_map[brand] = generic
        
        # Generate embeddings for all medicine names
        if self.model:
            try:
                self.embeddings = self.model.encode(self.medicine_names)
                logger.info(f'Generated embeddings for {len(self.medicine_names)} medicine names')
            except Exception as e:
                logger.error(f'Error generating embeddings: {e}')
                self.embeddings = None
        else:
            self.embeddings = None
    
    def match_medicine(self, input_medicine: str) -> Dict:
        input_lower = input_medicine.lower().strip()
        
        # Strategy 1: Exact match
        if input_lower in self.medicine_map:
            generic = self.medicine_map[input_lower]
            medicine_type = 'brand' if input_lower != generic else 'generic'
            alternatives = MEDICINE_DATABASE[generic]['brands']
            return {
                'input': input_medicine,
                'normalized': generic,
                'type': medicine_type,
                'confidence': 1.0,
                'alternatives': [alt for alt in alternatives if alt.lower() != input_lower]
            }
        
        # Strategy 2: Fuzzy matching
        fuzzy_result = process.extractOne(
            input_lower,
            self.medicine_names,
            scorer=fuzz.token_set_ratio,
            score_cutoff=70
        )
        
        if fuzzy_result:
            matched_name, fuzzy_score = fuzzy_result
            generic = self.medicine_map[matched_name]
            confidence = fuzzy_score / 100.0
            medicine_type = 'brand' if matched_name != generic else 'generic'
            alternatives = MEDICINE_DATABASE[generic]['brands']
            return {
                'input': input_medicine,
                'normalized': generic,
                'type': medicine_type,
                'confidence': confidence,
                'alternatives': [alt for alt in alternatives if alt.lower() != input_lower]
            }
        
        # Strategy 3: Semantic similarity
        if self.model and self.embeddings is not None:
            try:
                input_embedding = self.model.encode([input_lower])
                similarities = cosine_similarity(input_embedding, self.embeddings)[0]
                best_idx = np.argmax(similarities)
                best_score = float(similarities[best_idx])
                
                if best_score > 0.6:
                    matched_name = self.medicine_names[best_idx]
                    generic = self.medicine_map[matched_name]
                    medicine_type = 'brand' if matched_name != generic else 'generic'
                    alternatives = MEDICINE_DATABASE[generic]['brands']
                    return {
                        'input': input_medicine,
                        'normalized': generic,
                        'type': medicine_type,
                        'confidence': best_score,
                        'alternatives': [alt for alt in alternatives if alt.lower() != input_lower]
                    }
            except Exception as e:
                logger.error(f'Error in semantic matching: {e}')
        
        # No match found
        return {
            'input': input_medicine,
            'normalized': input_medicine,
            'type': 'unknown',
            'confidence': 0.0,
            'alternatives': []
        }
    
    def get_all_brands(self, generic_name: str) -> List[str]:
        generic_lower = generic_name.lower()
        if generic_lower in MEDICINE_DATABASE:
            return MEDICINE_DATABASE[generic_lower]['brands']
        return []

# Global instance
matching_engine = MedicineMatchingEngine()

async def init_medicine_db(db):
    """Initialize medicine database in MongoDB"""
    logger.info('Initializing medicine database...')
    
    # Check if medicines collection is empty
    count = await db.medicines.count_documents({})
    if count == 0:
        # Insert all medicines
        medicines_to_insert = []
        for generic, data in MEDICINE_DATABASE.items():
            medicines_to_insert.append({
                'generic_name': generic,
                'brand_names': data['brands'],
                'category': data['category'],
                'dosages': data['dosages'],
                'created_at': datetime.now(timezone.utc)
            })
        
        await db.medicines.insert_many(medicines_to_insert)
        logger.info(f'Inserted {len(medicines_to_insert)} medicines into database')
    else:
        logger.info(f'Medicine database already contains {count} medicines')
    
    # Create indexes
    await db.medicines.create_index('generic_name', unique=True)
    await db.users.create_index('email', unique=True)
    logger.info('Database indexes created')