import os
import re
import json
import io
import time
import tempfile
from datetime import datetime
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Tuple

# Set matplotlib backend to headless 'Agg' before imports to avoid GUI crashes
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# Try importing image & PDF libraries with graceful fallbacks
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

try:
    import pypdf as PyPDF2
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

try:
    from pyzbar.pyzbar import decode as qr_decode
    PYZBAR_AVAILABLE = True
except Exception:
    PYZBAR_AVAILABLE = False

# Import Gemini API libraries
try:
    from google import genai
    from google.genai import types
    GEMINI_API_AVAILABLE = True
except ImportError:
    GEMINI_API_AVAILABLE = False

# Import database & key pool manager from DevHunt
from core.db import get_db_connection
from core.key_manager import KeyManager
from core import logger

@dataclass
class AgentMemory:
    """Shared memory across all agents in a session."""
    file_path: str = ''
    file_type: str = ''
    raw_text: str = ''
    structured_data: dict = field(default_factory=dict)
    chunks: list = field(default_factory=list)
    extraction_result: dict = field(default_factory=dict)
    verification_result: dict = field(default_factory=dict)
    analysis_result: dict = field(default_factory=dict)
    final_report: dict = field(default_factory=dict)
    agent_log: list = field(default_factory=list)

    def log(self, agent_name: str, message: str):
        ts = datetime.now().strftime('%H:%M:%S')
        entry = f'[{ts}] [{agent_name}] {message}'
        self.agent_log.append(entry)
        # Also log to system logs table
        logger.info("system", entry)


class BaseAgent:
    """All agents inherit from this."""
    def __init__(self, name: str, memory: AgentMemory):
        self.name = name
        self.memory = memory

    def log(self, msg: str):
        self.memory.log(self.name, msg)

    def run(self):
        raise NotImplementedError


class ExtractorAgent(BaseAgent):
    """
    Agent 1: Extracts content from PDFs, Images, Excel, and CSV files.
    Tries PyMuPDF/PyPDF2 for PDF, Tesseract for OCR, and Pandas for sheets.
    """
    def run(self) -> dict:
        self.log("Starting text and structure extraction...")
        fp = self.memory.file_path
        if not os.path.exists(fp):
            err_msg = f"File not found: {fp}"
            self.log(err_msg)
            return {"status": "error", "error": err_msg}

        ext = fp.lower().split('.')[-1]
        self.memory.file_type = ext

        result = {'status': 'ok', 'method': '', 'pages': 0, 'text_length': 0, 'flags': []}

        if ext == 'pdf':
            result = self._extract_pdf(fp)
        elif ext in ('png', 'jpg', 'jpeg', 'webp', 'tiff'):
            result = self._extract_image(fp)
        elif ext in ('xlsx', 'xls'):
            result = self._extract_excel(fp)
        elif ext == 'csv':
            result = self._extract_csv(fp)
        else:
            msg = f"Unknown file type: {ext}"
            result['flags'].append(f"⚠️ {msg}")
            result['status'] = 'error'
            result['error'] = msg

        # Generate text chunks
        self._chunk_text()
        result['text_length'] = len(self.memory.raw_text)
        result['chunk_count'] = len(self.memory.chunks)
        self.memory.extraction_result = result
        self.log(f"Extraction completed. {result['text_length']} chars, {result['chunk_count']} chunks.")
        return result

    def _extract_pdf(self, fp: str) -> dict:
        result = {'method': 'PyMuPDF', 'flags': [], 'pages': 0}
        all_text = ""

        # Strategy A: Use PyMuPDF if available
        if PYMUPDF_AVAILABLE:
            try:
                doc = fitz.open(fp)
                result['pages'] = doc.page_count
                for i, page in enumerate(doc):
                    t = page.get_text()
                    # Fallback to OCR if page has almost no text (scanned PDF)
                    if len(t.strip()) < 25 and TESSERACT_AVAILABLE and PIL_AVAILABLE:
                        try:
                            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                            img = Image.open(io.BytesIO(pix.tobytes('png')))
                            t = pytesseract.image_to_string(img, config='--psm 6')
                            result['flags'].append(f"ℹ️ Page {i+1} parsed using OCR fallback")
                        except Exception as ocr_err:
                            result['flags'].append(f"⚠️ OCR failed on page {i+1}: {str(ocr_err)}")
                    all_text += t + '\n'
                doc.close()
                self.memory.raw_text = all_text.strip()
                result['flags'].append(f"✅ Extracted {len(self.memory.raw_text)} chars from {result['pages']} page(s) via PyMuPDF")
                return result
            except Exception as e:
                result['flags'].append(f"⚠️ PyMuPDF extraction failed: {e}. Trying PyPDF2...")

        # Strategy B: Fallback to PyPDF2
        if PYPDF2_AVAILABLE:
            try:
                with open(fp, 'rb') as f:
                    pdf = PyPDF2.PdfReader(f)
                    result['pages'] = len(pdf.pages)
                    result['method'] = 'PyPDF2'
                    for i in range(len(pdf.pages)):
                        page = pdf.pages[i]
                        t = page.extract_text() or ""
                        all_text += t + '\n'
                self.memory.raw_text = all_text.strip()
                result['flags'].append(f"✅ Extracted {len(self.memory.raw_text)} chars from {result['pages']} page(s) via PyPDF2")
                return result
            except Exception as e:
                result['flags'].append(f"🚨 PyPDF2 extraction failed: {e}")

        # Fallback if text extraction is entirely empty
        if not self.memory.raw_text.strip():
            result['flags'].append("🚨 No text could be extracted from PDF")
            self.memory.raw_text = "[Scanned document or non-extractable PDF contents]"

        return result

    def _extract_image(self, fp: str) -> dict:
        result = {'method': 'OCR', 'flags': [], 'pages': 1}
        
        if not PIL_AVAILABLE or not TESSERACT_AVAILABLE:
            result['flags'].append("⚠️ PIL or Tesseract-OCR not installed. OCR unavailable.")
            self.memory.raw_text = "[Image parsing skipped - Tesseract-OCR not installed]"
            return result

        try:
            img = Image.open(fp).convert('RGB')
            # Preprocess small images to improve OCR accuracy
            w, h = img.size
            if w < 1000:
                img = img.resize((w * 2, h * 2), Image.Resampling.LANCZOS)
                result['flags'].append("ℹ️ Image upscaled to increase OCR resolution")
            
            # OCR execution
            ocr_text = pytesseract.image_to_string(img, config='--psm 3')
            self.memory.raw_text = ocr_text.strip()
            result['flags'].append(f"✅ OCR successfully extracted {len(self.memory.raw_text)} characters")
        except Exception as e:
            result['flags'].append(f"🚨 OCR Error: {e}")
            self.memory.raw_text = f"[OCR Failed: {e}]"
        
        return result

    def _extract_excel(self, fp: str) -> dict:
        result = {'method': 'Pandas (Excel)', 'flags': [], 'pages': 0}
        try:
            import pandas as pd
            xl = pd.ExcelFile(fp)
            all_text = ""
            summary = {}
            for sheet in xl.sheet_names:
                df = xl.parse(sheet)
                result['pages'] += 1
                summary[sheet] = {
                    'rows': len(df),
                    'cols': len(df.columns),
                    'columns': list(df.columns),
                    'numeric_cols': list(df.select_dtypes(include='number').columns),
                    'null_count': int(df.isnull().sum().sum()),
                    'sample': df.head(3).to_dict(orient='records')
                }
                all_text += f"Sheet: {sheet}\n{df.to_string(max_rows=50)}\n\n"
            self.memory.raw_text = all_text
            self.memory.structured_data = summary
            result['flags'].append(f"✅ Successfully parsed Excel sheets: {list(summary.keys())}")
        except Exception as e:
            result['flags'].append(f"🚨 Excel extraction error: {e}")
            self.memory.raw_text = f"[Excel extraction failed: {e}]"
        return result

    def _extract_csv(self, fp: str) -> dict:
        result = {'method': 'Pandas (CSV)', 'flags': [], 'pages': 1}
        try:
            import pandas as pd
            df = pd.read_csv(fp)
            self.memory.raw_text = df.to_string(max_rows=100)
            self.memory.structured_data = {
                'rows': len(df), 'cols': len(df.columns),
                'columns': list(df.columns),
                'numeric_cols': list(df.select_dtypes(include='number').columns),
                'null_pct': round(df.isnull().mean().mean() * 100, 1),
                'sample': df.head(3).to_dict(orient='records')
            }
            result['flags'].append(f"✅ Successfully parsed CSV: {len(df)} rows x {len(df.columns)} columns")
        except Exception as e:
            result['flags'].append(f"🚨 CSV extraction error: {e}")
            self.memory.raw_text = f"[CSV extraction failed: {e}]"
        return result

    def _chunk_text(self, chunk_size=500, overlap=50):
        text = self.memory.raw_text
        if not text:
            self.memory.chunks = []
            return
        words = text.split()
        chunks = []
        for i in range(0, len(words), chunk_size - overlap):
            chunk = ' '.join(words[i:i + chunk_size])
            if chunk.strip():
                chunks.append(chunk)
        self.memory.chunks = chunks


class VerifierAgent(BaseAgent):
    """
    Agent 2: Conducts 5 layers of digital forensics:
    - Layer 1: Metadata Check (editing tools, incremental saves, creation consistency)
    - Layer 2: ELA (Error Level Analysis) for copy-paste manipulation hotspots
    - Layer 3: Digital Signature / Cryptographic Sign check
    - Layer 4: Text Consistency (regex validation of IDs: Aadhaar/PAN, gov titles)
    - Layer 5: QR Code Scanning (validates destination domain)
    """
    def run(self) -> dict:
        self.log("Starting 5-layer fraud and forensics check...")
        fp = self.memory.file_path

        layers = [
            self._metadata_analysis(fp),
            self._ela_analysis(fp),
            self._signature_check(fp),
            self._text_consistency(fp),
            self._qr_verification(fp),
        ]

        # Weighted score fusion
        # Weights: Metadata (20%), ELA (25%), Signature (30%), Text (15%), QR (10%)
        weights = [0.20, 0.25, 0.30, 0.15, 0.10]
        final_score = sum(l['score'] * w for l, w in zip(layers, weights))
        final_score = round(final_score, 1)

        if final_score >= 80:
            verdict, risk = '✅ Authentic', 'LOW'
        elif final_score >= 55:
            verdict, risk = '⚠️ Suspicious (Review Recommended)', 'MEDIUM'
        else:
            verdict, risk = '🚨 Tampering Detected', 'HIGH'

        result = {
            'layers': layers,
            'final_score': final_score,
            'verdict': verdict,
            'risk_level': risk,
            'ela_image_path': next((l.get('ela_image_path') for l in layers if l.get('ela_image_path')), None)
        }
        self.memory.verification_result = result
        self.log(f"Verification done. Score: {final_score}/100 - Verdict: {verdict} ({risk} risk)")
        return result

    def _metadata_analysis(self, fp: str) -> dict:
        r = {'layer': 'Metadata Forensics', 'score': 100, 'flags': [], 'details': {}}
        if not fp.lower().endswith('.pdf'):
            r['score'] = 70
            r['flags'].append("⚠️ Metadata analysis skipped - limited features for non-PDFs")
            return r
        
        try:
            if PYMUPDF_AVAILABLE:
                doc = fitz.open(fp)
                meta = doc.metadata
                r['details'] = {
                    'author': meta.get('author', 'N/A'),
                    'creator': meta.get('creator', 'N/A'),
                    'producer': meta.get('producer', 'N/A'),
                    'created': meta.get('creationDate', 'N/A'),
                    'modified': meta.get('modDate', 'N/A'),
                }
                
                # Flag editing software signature
                bad_tools = ['photoshop', 'illustrator', 'gimp', 'foxit', 'nitro', 'pdf editor', 'smallpdf', 'ilovepdf', 'sejda', 'pdfescape']
                all_meta_str = (meta.get('creator', '') + meta.get('producer', '')).lower()
                if any(t in all_meta_str for t in bad_tools):
                    r['flags'].append("🚨 PDF editing/manipulation software detected in metadata")
                    r['score'] -= 45
                
                # Check modification date mismatch
                created = meta.get('creationDate', '')
                modified = meta.get('modDate', '')
                if created and modified and created != modified:
                    r['flags'].append("⚠️ Document modified after initial creation")
                    r['score'] -= 20
                
                doc.close()
            else:
                r['flags'].append("⚠️ PyMuPDF not available; skipping detailed metadata parser")

            # Check incremental saves by counting /Prev offsets (indicates multiple updates / hidden edits)
            with open(fp, 'rb') as f:
                raw = f.read().decode('latin-1', errors='ignore')
                prev_count = raw.count('/Prev')
                if prev_count > 1:
                    r['flags'].append(f"⚠️ {prev_count} incremental saves detected (possible modified objects)")
                    r['score'] -= 20
        except Exception as e:
            r['flags'].append(f"🚨 Metadata error: {str(e)}")
            r['score'] = 50
        
        r['score'] = max(0, r['score'])
        return r

    def _ela_analysis(self, fp: str, quality=75) -> dict:
        """
        Error Level Analysis (ELA)
        Saves the image as JPEG at a known compression rate, then compares pixel
        differences. Highly manipulated areas stand out with high ELA variance.
        """
        r = {'layer': 'Error Level Analysis (ELA)', 'score': 100, 'flags': [], 'details': {}, 'ela_image_path': None}
        
        if not PIL_AVAILABLE or not OPENCV_AVAILABLE:
            r['flags'].append("⚠️ OpenCV/Pillow missing; ELA heatmap unavailable")
            r['score'] = 60
            return r

        # Skip ELA for Excel/CSV spreadsheet formats
        ext = fp.lower().split('.')[-1]
        if ext in ('xlsx', 'xls', 'csv'):
            r['flags'].append("ℹ️ ELA analysis skipped for spreadsheet datasets")
            return r

        try:
            # Load page 1 if PDF, or the image directly
            if ext == 'pdf':
                if PYMUPDF_AVAILABLE:
                    doc = fitz.open(fp)
                    pix = doc[0].get_pixmap(matrix=fitz.Matrix(2, 2))
                    original = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
                    doc.close()
                else:
                    r['flags'].append("⚠️ PyMuPDF missing; cannot execute PDF ELA")
                    r['score'] = 70
                    return r
            else:
                original = Image.open(fp).convert('RGB')

            # Normalize size
            original = original.resize((800, 1000), Image.Resampling.LANCZOS)
            
            # Save at set quality to temporary buffer
            buf = io.BytesIO()
            original.save(buf, 'JPEG', quality=quality)
            buf.seek(0)
            compressed = Image.open(buf).convert('RGB')

            # Calc ELA difference
            original_np = np.array(original, dtype=np.float32)
            compressed_np = np.array(compressed, dtype=np.float32)
            diff = np.abs(original_np - compressed_np)
            
            # Boost diff brightness to make it visible
            boosted = np.clip(diff * 12, 0, 255).astype(np.uint8)
            ela_img = Image.fromarray(boosted)

            # Analyze variance / hotspot count
            gray = np.mean(diff, axis=2)
            std_dev = np.std(gray)
            mean_val = np.mean(gray)
            # Find pixels that deviate significantly from standard error distribution
            hotspot_pct = float(np.sum(gray > mean_val + 2.5 * std_dev) / gray.size * 100)
            
            r['details'] = {'hotspot_pct': round(hotspot_pct, 2), 'mean_error': round(float(mean_val), 3)}

            # Save the ELA image to uploads directory
            base_dir = os.path.dirname(fp)
            ela_filename = f"{os.path.basename(fp)}_ela.png"
            ela_path = os.path.join(base_dir, ela_filename)
            ela_img.save(ela_path)
            r['ela_image_path'] = ela_filename

            if hotspot_pct > 6.0:
                r['flags'].append(f"🚨 Tampering signal: {hotspot_pct:.1f}% anomalous high-error pixels")
                r['score'] -= 45
            elif hotspot_pct > 2.5:
                r['flags'].append(f"⚠️ Moderate anomaly: {hotspot_pct:.1f}% hotspot pixels")
                r['score'] -= 20
            else:
                r['flags'].append(f"✅ Clean ELA signature (low density variance: {hotspot_pct:.1f}%)")

        except Exception as e:
            r['flags'].append(f"🚨 ELA execution failed: {e}")
            r['score'] = 50
        
        r['score'] = max(0, r['score'])
        return r

    def _signature_check(self, fp: str) -> dict:
        r = {'layer': 'Digital Signature Check', 'score': 50, 'flags': [], 'details': {}}
        if not fp.lower().endswith('.pdf'):
            r['flags'].append("⚠️ Cryptographic signature checks are PDF-only features")
            return r

        try:
            with open(fp, 'rb') as f:
                raw = f.read().decode('latin-1', errors='ignore')
                has_byte_range = '/ByteRange' in raw
                has_pkcs = '/PKCS7' in raw or 'adbe.pkcs7' in raw.lower()
                has_sig_dict = '/Sig' in raw

                r['details'] = {'byte_range': has_byte_range, 'pkcs7': has_pkcs, 'sig_dict': has_sig_dict}

                if has_pkcs and has_byte_range:
                    r['flags'].append("✅ Cryptographic digital signature block detected")
                    r['score'] = 100
                elif has_sig_dict:
                    r['flags'].append("✅ Basic digital signature dictionary structure found")
                    r['score'] = 80
                else:
                    r['flags'].append("⚠️ Unsigned document (lacks PKCS7 / signature envelopes)")
                    r['score'] = 55
        except Exception as e:
            r['flags'].append(f"🚨 Signature parse exception: {e}")
            r['score'] = 40
        return r

    def _text_consistency(self, fp: str) -> dict:
        r = {'layer': 'Text & Regulatory Compliance', 'score': 100, 'flags': [], 'details': {}}
        text = self.memory.raw_text.lower()

        gov_kw = ['government of india', 'ministry', 'digilocker', 'aadhaar', 'unique identification',
                  'income tax', 'cbse', 'driving licence', 'board of', 'university', 'official', 'statement']
        found = [k for k in gov_kw if k in text]
        r['details']['keywords_found'] = found

        if found:
            r['flags'].append(f"✅ Found administrative keywords: {', '.join(found[:3])}")
        else:
            r['flags'].append("⚠️ No institutional/administrative headers found")
            r['score'] -= 15

        # Regex validators
        aadhaar = re.findall(r'\b\d{4}\s?\d{4}\s?\d{4}\b', text)
        pan = re.findall(r'\b[a-z]{5}\d{4}[a-z]\b', text)
        
        if aadhaar: 
            r['flags'].append(f"✅ Aadhaar ID format found ({len(aadhaar)} instances)")
            r['details']['aadhaar_count'] = len(aadhaar)
        if pan: 
            r['flags'].append(f"✅ PAN ID format found ({len(pan)} instances)")
            r['details']['pan_count'] = len(pan)

        if len(text.strip()) < 40:
            r['flags'].append("🚨 Document contains virtually no extractable text content")
            r['score'] -= 30

        r['score'] = max(0, r['score'])
        return r

    def _qr_verification(self, fp: str) -> dict:
        r = {'layer': 'QR Code Integrity', 'score': 60, 'flags': [], 'details': {}}
        
        # QR Scanning relies on OpenCV
        if not OPENCV_AVAILABLE:
            r['flags'].append("⚠️ OpenCV missing; QR checking offline")
            return r

        ext = fp.lower().split('.')[-1]
        if ext in ('xlsx', 'xls', 'csv'):
            return r # Skip for datasets

        try:
            # Extract image for scanning
            if ext == 'pdf':
                if PYMUPDF_AVAILABLE:
                    doc = fitz.open(fp)
                    pix = doc[0].get_pixmap(matrix=fitz.Matrix(3, 3))
                    img_pil = Image.open(io.BytesIO(pix.tobytes('png')))
                    img = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
                    doc.close()
                else:
                    r['flags'].append("⚠️ PyMuPDF missing; skipping QR extraction")
                    return r
            else:
                img = cv2.imread(fp)

            # Scanner Execution
            qr_data = None

            # Strategy 1: OpenCV QRCodeDetector
            detector = cv2.QRCodeDetector()
            val, points, _ = detector.detectAndDecode(img)
            if val:
                qr_data = val
                r['flags'].append("✅ QR code detected via OpenCV")

            # Strategy 2: Pyzbar fallback
            if not qr_data and PYZBAR_AVAILABLE:
                try:
                    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                    decoded = qr_decode(gray)
                    if decoded:
                        qr_data = decoded[0].data.decode('utf-8', errors='ignore')
                        r['flags'].append("✅ QR code decoded via Pyzbar")
                except Exception as pyzbar_err:
                    r['flags'].append(f"⚠️ Pyzbar library runtime error: {pyzbar_err}")

            if qr_data:
                r['details']['qr_contents'] = qr_data
                gov_domains = ['gov.in', 'digilocker.gov.in', 'uidai.gov.in', 'cbse.gov.in', 'nic.in']
                if any(d in qr_data.lower() for d in gov_domains):
                    r['flags'].append("✅ Secure institutional .gov.in URL mapping")
                    r['score'] = 100
                else:
                    r['flags'].append("⚠️ QR leads to standard web domain (not a gov registry)")
                    r['score'] = 80
            else:
                r['flags'].append("⚠️ No valid QR code envelopes found")
                r['score'] = 60

        except Exception as e:
            r['flags'].append(f"🚨 QR validation error: {e}")
            r['score'] = 50
        return r


class AnalystAgent(BaseAgent):
    """
    Agent 3: AI content analytics.
    Extracts summary, key entities, important insights, and authenticity view.
    Utilizes the active Gemini key from DevHunt's KeyManager pool.
    """
    def __init__(self, name: str, memory: AgentMemory, key_manager: KeyManager):
        super().__init__(name, memory)
        self.key_manager = key_manager

    def run(self) -> dict:
        self.log("Synthesizing content and semantic analytics (using local rule-based engine)...")
        
        result = self._rule_based_analysis()

        self.memory.analysis_result = result
        self.log("Semantic analytics finished.")
        return result

    def _rule_based_analysis(self) -> dict:
        text = self.memory.raw_text
        
        # Simple extraction heuristics
        dates = re.findall(r'\b\d{2}[/.-]\d{2}[/.-]\d{4}\b', text)[:4]
        aadhaar = re.findall(r'\b\d{4}\s?\d{4}\s?\d{4}\b', text)[:2]
        pan = re.findall(r'\b[A-Z]{5}\d{4}[A-Z]\b', text)[:2]
        emails = re.findall(r'[\w.]+@[\w.]+\.[a-z]{2,}', text.lower())[:3]
        phones = re.findall(r'\b[6-9]\d{9}\b', text)[:2]
        
        entities = {
            'names': [],
            'dates': dates,
            'amounts': re.findall(r'(?:rs\.?|₹|inr)\s?[\d,]+', text.lower())[:3],
            'ids': aadhaar + pan + phones + emails,
            'organizations': [],
            'addresses': []
        }

        # Rule-based insights
        insights = []
        ver = self.memory.verification_result
        score = ver.get('final_score', 0)
        insights.append(f"Forensic check authenticity score is {score}/100")
        
        text_lower = text.lower()
        if 'aadhaar' in text_lower or 'uidai' in text_lower:
            insights.append("Document matches pattern of Aadhaar Identification Card")
        if 'income tax' in text_lower or 'permanent account number' in text_lower:
            insights.append("Document matches pattern of Indian PAN Card")
        if 'salary' in text_lower or 'statement' in text_lower or 'bank' in text_lower:
            insights.append("Financial dataset pattern detected (statement or bank record)")
        
        if score < 60:
            insights.append("Multiple metadata/structural anomalies triggered. High fraud potential.")

        return {
            'summary': f"Document type: {self.memory.file_type.upper()}. Char length: {len(text)}. Parsed locally using rule-based heuristics.",
            'entities': entities,
            'insights': insights,
            'ai_authenticity_view': f"Local forensics verification completed. Rule-based checks indicate {ver.get('risk_level')} risk.",
            'flags': []
        }


    def _call_gemini_analysis(self, api_key: str, key_id: str) -> dict:
        text_preview = self.memory.raw_text[:4000] # Limit tokens
        ver = self.memory.verification_result
        score = ver.get('final_score', 0)
        risk = ver.get('risk_level', 'LOW')
        verdict = ver.get('verdict', 'Unknown')
        
        system_prompt = (
            "You are a Forensic Document Intelligence & Compliance Agent.\n"
            "Analyze the document text and fraud checks provided, and return a single structured report in JSON.\n"
            "You must strictly output JSON matching the following schema:\n"
            "{\n"
            "  \"summary\": \"3-4 sentences summarizing document content and context.\",\n"
            "  \"entities\": {\n"
            "     \"names\": [],\n"
            "     \"dates\": [],\n"
            "     \"amounts\": [],\n"
            "     \"ids\": [],\n"
            "     \"organizations\": [],\n"
            "     \"addresses\": []\n"
            "  },\n"
            "  \"insights\": [\"List 3 to 5 key insights, warnings, or action points.\"],\n"
            "  \"ai_authenticity_view\": \"Expert risk review (2-3 sentences) evaluating authenticity based on verification results.\"\n"
            "}\n"
            "Return ONLY the raw JSON structure, do not wrap in markdown or backticks."
        )

        user_content = (
            f"--- VERIFICATION REPORT SUMMARY ---\n"
            f"Forensic Score: {score}/100\n"
            f"Security Verdict: {verdict}\n"
            f"Risk Level: {risk}\n\n"
            f"--- EXTRACTED TEXT CONTENT ---\n"
            f"{text_preview}"
        )

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json"
            )
        )
        self.key_manager.on_success(key_id)

        response_text = response.text.strip()
        # Clean up in case markdown block wrapper is returned anyway
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            response_text = "\n".join(lines).strip()

        parsed = json.loads(response_text)
        parsed['flags'] = ["✅ Gemini AI successfully generated analysis"]
        return parsed

    def _rule_based_fallback(self, reason: str) -> dict:
        text = self.memory.raw_text
        
        # Simple extraction heuristics
        dates = re.findall(r'\b\d{2}[/.-]\d{2}[/.-]\d{4}\b', text)[:4]
        aadhaar = re.findall(r'\b\d{4}\s?\d{4}\s?\d{4}\b', text)[:2]
        pan = re.findall(r'\b[A-Z]{5}\d{4}[A-Z]\b', text)[:2]
        emails = re.findall(r'[\w.]+@[\w.]+\.[a-z]{2,}', text.lower())[:3]
        phones = re.findall(r'\b[6-9]\d{9}\b', text)[:2]
        
        entities = {
            'names': [],
            'dates': dates,
            'amounts': re.findall(r'(?:rs\.?|₹|inr)\s?[\d,]+', text.lower())[:3],
            'ids': aadhaar + pan + phones + emails,
            'organizations': [],
            'addresses': []
        }

        # Rule-based insights
        insights = []
        ver = self.memory.verification_result
        score = ver.get('final_score', 0)
        insights.append(f"Forensic check authenticity score is {score}/100")
        
        text_lower = text.lower()
        if 'aadhaar' in text_lower or 'uidai' in text_lower:
            insights.append("Document matches pattern of Aadhaar Identification Card")
        if 'income tax' in text_lower or 'permanent account number' in text_lower:
            insights.append("Document matches pattern of Indian PAN Card")
        if 'salary' in text_lower or 'statement' in text_lower or 'bank' in text_lower:
            insights.append("Financial dataset pattern detected (statement or bank record)")
        
        if score < 60:
            insights.append("Multiple metadata/structural anomalies triggered. High fraud potential.")

        return {
            'summary': f"Document type: {self.memory.file_type.upper()}. Char length: {len(text)}. Parsed locally without active API key connection.",
            'entities': entities,
            'insights': insights,
            'ai_authenticity_view': f"Local forensics verification completed. Rule-based checks indicate {ver.get('risk_level')} risk ({reason}).",
            'flags': [f"ℹ️ Rule-based fallback active: {reason}"]
        }


class ReporterAgent(BaseAgent):
    """
    Agent 4: Synthesizes final dashboard visualization and packages JSON payload.
    Creates a premium dark-themed dashboard matching DevHunt styling.
    """
    def run(self) -> Tuple[str, str]:
        self.log("Compiling final reports and dashboard rendering...")
        
        ext = self.memory.extraction_result
        ver = self.memory.verification_result
        anal = self.memory.analysis_result
        fp = self.memory.file_path

        report = {
            'timestamp': datetime.now().isoformat(),
            'file_name': os.path.basename(fp),
            'file_type': self.memory.file_type,
            'extraction': {
                'method': ext.get('method'),
                'pages': ext.get('pages'),
                'text_length': ext.get('text_length'),
                'chunks': ext.get('chunk_count')
            },
            'authenticity': {
                'score': ver.get('final_score'),
                'verdict': ver.get('verdict'),
                'risk_level': ver.get('risk_level'),
                'layer_scores': {l['layer']: l['score'] for l in ver.get('layers', [])}
            },
            'ai_analysis': {
                'summary': anal.get('summary'),
                'entities': anal.get('entities'),
                'insights': anal.get('insights'),
                'expert_view': anal.get('ai_authenticity_view')
            },
            'flags': [
                flag 
                for src in [ext, *ver.get('layers', []), anal] 
                for flag in src.get('flags', [])
            ]
        }
        self.memory.final_report = report

        # Render dashboard image
        dashboard_filename = f"{os.path.basename(fp)}_dashboard.png"
        dashboard_path = os.path.join(os.path.dirname(fp), dashboard_filename)
        self._build_dashboard_image(dashboard_path, ver)

        self.log("Compiled final dashboard visualization.")
        return json.dumps(report, indent=2), dashboard_filename

    def _build_dashboard_image(self, save_path: str, ver: dict):
        """Draw a sleek, dark-theme Matplotlib dashboard vertically stacked."""
        score = ver.get('final_score', 0)
        
        fig = plt.figure(figsize=(6.5, 7.5))
        fig.patch.set_facecolor('#0b0f14')  # Match DevHunt theme background
        
        # Color mapping
        if score >= 80:
            color = '#00ffa3'  # Neon green
        elif score >= 55:
            color = '#ffb547'  # Amber
        else:
            color = '#ff4d6a'  # Red

        # 1. Gauge chart (semicircle dial)
        ax1 = fig.add_subplot(2, 1, 1)
        ax1.set_facecolor('#0b0f14')
        
        # Draw base arc
        theta = np.linspace(np.pi, 0, 100)
        ax1.plot(np.cos(theta), np.sin(theta), color='#1a232e', linewidth=16, solid_capstyle='round')
        
        # Draw active score arc
        theta_active = np.linspace(np.pi, np.pi - (score / 100) * np.pi, 100)
        ax1.plot(np.cos(theta_active), np.sin(theta_active), color=color, linewidth=16, solid_capstyle='round')
        
        # Text positioning inside dial
        ax1.text(0, 0.1, f"{score:.0f}", ha='center', va='center', fontsize=44, color='#ffffff', fontweight='bold', fontfamily='monospace')
        ax1.text(0, -0.2, "/100", ha='center', va='center', fontsize=16, color='#5c7080', fontfamily='monospace')
        ax1.text(0, -0.45, ver.get('verdict', '').upper(), ha='center', va='center', fontsize=11, color=color, fontweight='bold')
        
        ax1.set_xlim(-1.2, 1.2)
        ax1.set_ylim(-0.7, 1.1)
        ax1.axis('off')
        ax1.set_title("AUTHENTICITY DIAL", color='#ffffff', fontsize=12, fontweight='bold', pad=10)

        # 2. Horizontal layer bars
        ax2 = fig.add_subplot(2, 1, 2)
        ax2.set_facecolor('#0b0f14')
        
        layers = ver.get('layers', [])
        y_labels = [l['layer'] for l in layers]
        y_scores = [l['score'] for l in layers]
        y_pos = np.arange(len(layers))
        
        bar_colors = ['#00ffa3' if s >= 80 else '#ffb547' if s >= 55 else '#ff4d6a' for s in y_scores]
        
        # Background track bars
        ax2.barh(y_pos, [100]*len(layers), color='#1e293b', height=0.4)
        # Score bars
        bars = ax2.barh(y_pos, y_scores, color=bar_colors, height=0.4)
        
        # Text values next to bars
        for idx, bar in enumerate(bars):
            w = bar.get_width()
            ax2.text(w + 2, idx, f"{int(w)}%", va='center', color='#ffffff', fontsize=9, fontweight='bold', fontfamily='monospace')
            
        ax2.set_yticks(y_pos)
        ax2.set_yticklabels(y_labels, color='#94a3b8', fontsize=10)
        ax2.set_xlim(0, 115)
        ax2.spines['top'].set_visible(False)
        ax2.spines['right'].set_visible(False)
        ax2.spines['bottom'].set_visible(False)
        ax2.spines['left'].set_visible(False)
        ax2.xaxis.set_visible(False)
        ax2.tick_params(left=False)
        
        plt.suptitle("FORENSIC VERIFICATION SUITE", color='#ffffff', fontsize=14, fontweight='bold', y=0.98)
        plt.tight_layout(rect=[0, 0, 1, 0.95], h_pad=3.0)
        plt.savefig(save_path, dpi=120, facecolor='#0b0f14', edgecolor='none')
        plt.close()


class DocIntelligenceOrchestrator:
    """Orchestrator: manages state, executes agents, commits results to database."""
    def __init__(self, key_manager: KeyManager):
        self.key_manager = key_manager

    def _sync_chunks_async(self, source_id: int, raw_text: str, file_name: str, file_type: str):
        """Asynchronously chunk, embed, and index text into RAG store so UI scans are instant."""
        try:
            from core.db import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            
            from core.rag_pipeline import RAGPipeline
            rp = RAGPipeline(self.key_manager)
            
            # Delete any previous chunks
            cursor.execute("DELETE FROM knowledge_chunks WHERE source_id = ?", (source_id,))
            
            # Chunk and generate embeddings
            chunks = rp.chunk_text(raw_text)
            chunk_count = 0
            for index, chunk in enumerate(chunks):
                if not chunk.strip():
                    continue
                try:
                    embedding = rp.get_embedding(chunk, is_query=False)
                    metadata = {"index": index, "source_name": file_name, "source_type": file_type}
                    cursor.execute(
                        "INSERT INTO knowledge_chunks (source_id, content, embedding, metadata) VALUES (?, ?, ?, ?)",
                        (source_id, chunk, json.dumps(embedding), json.dumps(metadata))
                    )
                    chunk_count += 1
                except Exception as embed_err:
                    logger.error("system", f"Failed to embed chunk {index} for source {source_id}: {embed_err}")
            
            # Update status and chunk count in knowledge_sources
            cursor.execute(
                "UPDATE knowledge_sources SET status = ?, chunk_count = ? WHERE id = ?",
                ('indexed', chunk_count, source_id)
            )
            conn.commit()
            conn.close()
            logger.success("system", f"DocIntelligence: Asynchronously synced {chunk_count} chunks for source_id={source_id}")
        except Exception as sync_err:
            logger.error("system", f"DocIntelligence: Failed to sync database chunks asynchronously: {sync_err}")

    def run_pipeline(self, source_id: int) -> dict:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name, path FROM knowledge_sources WHERE id = ?", (source_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return {"success": False, "error": "Knowledge source document not found"}

        file_name = row['name']
        file_path = row['path']
        conn.close()

        if not file_path or not os.path.exists(file_path):
            return {"success": False, "error": f"Physical file missing on server disk: {file_path}"}

        logger.info("system", f"DocIntelligence: Starting pipeline run for source_id={source_id} ({file_name})")
        memory = AgentMemory(file_path=file_path)

        try:
            # 1. Extractor
            ExtractorAgent("ExtractorAgent", memory).run()

            # 2. Verifier (Forensics check)
            VerifierAgent("VerifierAgent", memory).run()

            # 3. Analyst (Gemini content analysis)
            AnalystAgent("AnalystAgent", memory, self.key_manager).run()

            # 4. Reporter (Dashboard drawing)
            report_json, dashboard_file = ReporterAgent("ReporterAgent", memory).run()
            
            # Retrieve ELA path if exists
            ela_file = memory.verification_result.get('ela_image_path')
            
            final_score = memory.verification_result.get('final_score')
            verdict = memory.verification_result.get('verdict')
            risk = memory.verification_result.get('risk_level')

            # Write results back to SQL
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO document_analyses 
                   (source_id, final_score, verdict, risk_level, report_json, ela_image_path, dashboard_image_path)
                   VALUES (?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(source_id) DO UPDATE SET
                   final_score = excluded.final_score,
                   verdict = excluded.verdict,
                   risk_level = excluded.risk_level,
                   report_json = excluded.report_json,
                   ela_image_path = excluded.ela_image_path,
                   dashboard_image_path = excluded.dashboard_image_path""",
                (source_id, final_score, verdict, risk, report_json, ela_file, dashboard_file)
            )

            conn.commit()
            conn.close()

            # Sync chunks asynchronously in the background so that the UI responds instantly
            if memory.raw_text.strip():
                import threading
                threading.Thread(
                    target=self._sync_chunks_async,
                    args=(source_id, memory.raw_text, file_name, memory.file_type),
                    daemon=True
                ).start()

            logger.success("system", f"DocIntelligence: Pipeline completed for source_id={source_id} ({file_name})")
            return {
                "success": True, 
                "source_id": source_id,
                "score": final_score,
                "verdict": verdict,
                "risk_level": risk,
                "report": json.loads(report_json),
                "ela_image": ela_file,
                "dashboard_image": dashboard_file
            }

        except Exception as err:
            logger.error("system", f"DocIntelligence: Pipeline error for source_id={source_id}: {err}")
            return {"success": False, "error": str(err)}
