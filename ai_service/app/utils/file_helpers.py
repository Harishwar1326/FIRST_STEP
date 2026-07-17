import io
import pdfplumber
from docx import Document
from PIL import Image
import pytesseract
import logging

logger = logging.getLogger("ai_service")

class FileProcessor:
    """Helper class for processing different file types"""
    
    @staticmethod
    async def process_pdf(content: bytes) -> str:
        """Extract text from PDF using pdfplumber"""
        try:
            pdf_file = io.BytesIO(content)
            text = ""
            with pdfplumber.open(pdf_file) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"PDF processing error: {str(e)}")
            raise
    
    @staticmethod
    async def process_docx(content: bytes) -> str:
        """Extract text from DOCX using python-docx"""
        try:
            doc_file = io.BytesIO(content)
            doc = Document(doc_file)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()])
            return text.strip()
        except Exception as e:
            logger.error(f"DOCX processing error: {str(e)}")
            raise
    
    @staticmethod
    async def process_image(content: bytes) -> str:
        """Extract text from image using OCR (Tesseract)"""
        try:
            image_file = io.BytesIO(content)
            image = Image.open(image_file)
            text = pytesseract.image_to_string(image)
            return text.strip()
        except Exception as e:
            logger.error(f"OCR processing error: {str(e)}")
            raise
    
    @staticmethod
    async def process_text(content: bytes) -> str:
        """Process plain text files"""
        try:
            return content.decode('utf-8').strip()
        except Exception as e:
            logger.error(f"Text processing error: {str(e)}")
            raise
    
    @staticmethod
    async def process_file(content: bytes, content_type: str) -> str:
        """Route file to appropriate processor"""
        processors = {
            "text/plain": FileProcessor.process_text,
            "application/pdf": FileProcessor.process_pdf,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileProcessor.process_docx,
            "image/jpeg": FileProcessor.process_image,
            "image/png": FileProcessor.process_image,
            "image/jpg": FileProcessor.process_image,
        }
        
        processor = processors.get(content_type)
        if processor:
            return await processor(content)
        else:
            logger.warning(f"Unsupported content type: {content_type}")
            return ""
