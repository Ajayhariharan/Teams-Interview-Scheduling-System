import os
import re
import json
import html
import time
import httpx
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import fitz
import docx
import PyPDF2
from io import BytesIO
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("SUG_ATS")
logger.setLevel(logging.INFO)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")
OPENROUTER_URL = os.getenv("OPENROUTER_URL", "https://openrouter.ai/api/v1/chat/completions")

DATE_REGEX = re.compile(
    r'\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\s*[-–至to\s]+\s*(?:[A-Za-z]+\s+\d{4}|Present|Current)|\d{4}\s*[-–至to\s]+\s*(?:\d{4}|Present|Current)|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{4}\s*[-–至to]\s*\d{4}|\d{4})\b',
    re.IGNORECASE
)

SCORE_REGEX = re.compile(
    r'\b(CGPA:\s*[\d\.]+|Percentage:\s*[\d\.]+%?|GPA:\s*[\d\.]+|Result:\s*\w+|\d{1,2}(?:\.\d+)?%|Pass)\b',
    re.IGNORECASE
)

DEGREE_PATTERN = re.compile(
    r'\b('
    r'Bachelor(?:\s+of\s+[A-Za-z\s,/&-]+|\s+Degree)?|'
    r'Master(?:\s+of\s+[A-Za-z\s,/&-]+|\s+Degree)?|'
    r'B\.?Sc\.?(?:\s*\([^\)]+\)|\s+[A-Za-z\s]+)?|'
    r'M\.?Sc\.?(?:\s*\([^\)]+\)|\s+[A-Za-z\s]+)?|'
    r'B\.?S\.?\b|M\.?S\.?\b|B\.?A\.?\b|M\.?A\.?\b|'
    r'B\.?Com\.?(?:\s*\(Honours\)|\s*\([^\)]+\)|\s+[A-Za-z\s]+)?|'
    r'M\.?Com\.?(?:\s*\([^\)]+\)|\s+[A-Za-z\s]+)?|'
    r'B\.?Tech\.?(?:\s*\([^\)]+\)|\s+[A-Za-z\s]+)?|'
    r'M\.?Tech\.?(?:\s*\([^\)]+\)|\s+[A-Za-z\s]+)?|'
    r'B\.E\.|B\.E\b|BE\b|'
    r'M\.E\.|M\.E\b|ME\b|'
    r'MBA\b|MCA\b|BBA\b|BCA\b|Ph\.?D\.?\b|Doctorate\b|Diploma\b|'
    r'Higher\s+Secondary(?:\s*\([^\)]+\)|\s+Certificate|\s+Examination)?(?!\s+School)|HSC(?:\s*\([^\)]+\))?|'
    r'Secondary\s+School\s+(?:Leaving\s+Certificate|Examination|Certificate)|SSLC(?:\s*\([^\)]+\))?|'
    r'10th\s+Standard\b|12th\s+Standard\b|Matriculation\b'
    r')',
    re.IGNORECASE
)

HEADING_PATTERNS = {
    'summary': [
        r'(?:professional\s+|career\s+)?objective\b',
        r'(?:professional\s+|executive\s+)?summary\b',
        r'profile\b',
        r'about\s+me\b',
        r'areas?\s+of\s+interest\b'
    ],
    'education': [
        r'educational\s+qualifications?\b',
        r'academic\s+qualifications?\b',
        r'education\b',
        r'qualifications\b',
        r'academic\s+background\b',
        r'academic\s+history\b'
    ],
    'experience': [
        r'(?:professional|work)\s+experiences?\b',
        r'experiences?\b',
        r'employment\s+history\b',
        r'career\s+history\b',
        r'internships?\b'
    ],
    'projects': [
        r'(?:key\s+|academic\s+|personal\s+|portfolio\s+)?projects?\b'
    ],
    'skills': [
        r'core\s+competencies\s*&\s*skills\b',
        r'core\s+competencies\b',
        r'technical\s+skills?\b',
        r'skills\b',
        r'technologies\b',
        r'tech\s+stack\b'
    ],
    'certifications': [
        r'certification\s+courses?\b',
        r'certifications?\b',
        r'certificates?\b',
        r'courses?\b',
        r'licenses\s+&\s+certifications\b'
    ],
    'achievements': [
        r'achievements?\b',
        r'awards\b',
        r'honors\s*&\s*awards\b',
        r'recognitions?\b',
        r'academic\s+engagements?\b',
        r'core\s+strengths\b'
    ],
    'links': [
        r'links?\b',
        r'social\s+links?\b',
        r'contact\s+info(?:rmation)?\b',
        r'connect\b',
        r'social\b'
    ]
}

MONTHS_MAP = {
    'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
    'apr': 4, 'april': 4, 'may': 5, 'june': 6, 'jun': 6, 'july': 7, 'jul': 7,
    'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
    'nov': 11, 'november': 11, 'dec': 12, 'december': 12
}

def clean_text(s: str) -> str:
    """Removes bullet points, unicode formatting artifacts, and unescapes HTML."""
    if not s:
        return ""
    cl = re.sub(r'^[#•·➢\-*\s\d\.\ufffd\xa0]+', '', s).strip()
    cl = re.sub(r'[*_`]', '', cl).strip()
    cl = re.sub(r'[#•·\ufffd]+$', '', cl).strip()
    return html.unescape(cl)

def calculate_years_experience(text: str) -> float:
    """Calculates total experience tenure in fractional decimal years."""
    if not text:
        return 0.0
        
    t_clean = text.strip().lower().replace('\ufffd', '-').replace('\u2013', '-').replace('\u2014', '-')
    current_year = datetime.now().year
    current_month = datetime.now().month
    total_months = 0.0

    month_regex = r'(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?'
    
    # 1. 'Dec 2023 to May 2024' or 'March 2023 - Present'
    pattern_month_range = rf'{month_regex}\s+(\d{{4}})\s*(?:[-–至to\s]+)\s*(?:{month_regex}\s+)?(\d{{4}}|present|current|now|till\s*date)'
    for m in re.finditer(pattern_month_range, t_clean):
        sm_name, sy, em_name, ey = m.groups()
        start_m = MONTHS_MAP.get(sm_name, 1)
        start_y = int(sy)
        if ey in ('present', 'current', 'now') or 'till' in ey:
            end_y, end_m = current_year, current_month
        else:
            end_y = int(ey)
            end_m = MONTHS_MAP.get(em_name, 12) if em_name else 12
        months = (end_y - start_y) * 12 + (end_m - start_m + 1)
        if months > 0:
            total_months += months

    # 2. 'MM/YYYY - MM/YYYY'
    if total_months == 0:
        pattern_num_range = r'(\d{1,2})[\/\.-](\d{4})\s*(?:[-–至to\s]+)\s*(\d{1,2})[\/\.-](\d{4}|present|current)'
        for m in re.finditer(pattern_num_range, t_clean):
            sm, sy, em, ey = m.groups()
            start_m, start_y = int(sm), int(sy)
            if ey in ('present', 'current'):
                end_y, end_m = current_year, current_month
            else:
                end_y, end_m = int(ey), int(em)
            months = (end_y - start_y) * 12 + (end_m - start_m + 1)
            if months > 0:
                total_months += months

    # 3. Year spans: '2022 to 2025' or '2022 - Present'
    if total_months == 0:
        pattern_years = r'\b(20\d{2}|19\d{2})\s*(?:[-–至to\s]+)\s*(20\d{2}|19\d{2}|present|current|now|till\s*date)\b'
        for m in re.finditer(pattern_years, t_clean):
            sy, ey = m.groups()
            start_y = int(sy)
            end_y = current_year if ey in ('present', 'current', 'now') or 'till' in ey else int(ey)
            if end_y >= start_y:
                total_months += max(1, (end_y - start_y)) * 12

    # 4. Explicit token: "3 years", "2.5 yrs"
    if total_months == 0:
        matches = re.findall(r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\b', t_clean)
        if matches:
            return float(matches[0])
        month_matches = re.findall(r'(\d+)\s*(?:months?|mos?)\b', t_clean)
        if month_matches:
            total_months = sum(float(m) for m in month_matches)

    if total_months > 0:
        return round(total_months / 12.0, 1)

    return 0.0

async def call_openrouter_gemini(prompt: str, system_prompt: str = "You are an expert Enterprise ATS qualification parser. Return only valid JSON.") -> Optional[str]:
    """Calls OpenRouter Gemini model."""
    if not OPENROUTER_API_KEY or OPENROUTER_API_KEY.startswith("your_"):
        return None

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "SUGEnterpriseATS/1.0",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "SUG Enterprise ATS Gemini Parser"
    }
    
    payload = {
        "model": OPENROUTER_MODEL or "google/gemini-2.5-flash",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 4000,
        "response_format": {"type": "json_object"}
    }
    
    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
            if response.status_code == 200:
                data = response.json()
                msg = data['choices'][0]['message']
                return msg.get('content') or ''
            else:
                logger.error(f"OpenRouter returned status {response.status_code}: {response.text}")
                return None
    except Exception as e:
        logger.error(f"OpenRouter connection failed: {e}")
        return None

class DocumentParser:
    """Document parser for PDF, DOCX, and TXT resumes with layout and regex extraction."""

    def extract_pdf_text(self, pdf_bytes: bytes) -> str:
        try:
            doc = fitz.open(stream=pdf_bytes, filetype='pdf')
            text = ""
            for page in doc:
                text += page.get_text() + "\n"
            if text.strip():
                return text.strip()
        except Exception:
            pass

        try:
            reader = PyPDF2.PdfReader(BytesIO(pdf_bytes))
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            return ""

    def extract_docx_text(self, docx_bytes: bytes) -> str:
        try:
            doc = docx.Document(BytesIO(docx_bytes))
            text = ""
            for para in doc.paragraphs:
                if para.text:
                    text += para.text + "\n"
            for table in doc.tables:
                for r in table.rows:
                    for cell in r.cells:
                        if cell.text:
                            text += cell.text + " "
                    text += "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"DOCX extraction error: {e}")
            return ""

    def match_heading(self, line: str) -> Tuple[Optional[str], Optional[str]]:
        line_clean = re.sub(r'^#+\s*', '', line.strip()).strip('*_ ').rstrip(':').strip()
        if not line_clean or len(line_clean) > 45:
            return None, None
            
        if line_clean.startswith(('➢', '•', '-', '*', '·', 'o ', '✓', '→', '<')):
            return None, None
            
        for sec_type, patterns in HEADING_PATTERNS.items():
            for pat in patterns:
                if re.search(r'^\s*' + pat, line_clean, re.IGNORECASE):
                    return sec_type, line_clean
                    
        return None, None

    def extract_document_sections(self, text: str, filename: str = "") -> Tuple[str, Dict[str, List[str]], str, str, str]:
        plain_text = clean_text(text)
        lines = [l.strip() for l in plain_text.split('\n') if l.strip()]

        # Extract Contact Info
        email_m = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', plain_text)
        phone_m = re.search(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', plain_text)
        email_str = email_m.group(0) if email_m else ""
        phone_str = phone_m.group(0) if phone_m else ""

        # Extract Candidate Name
        candidate_name = ""
        ignored_name_words = [
            'EDUCATION', 'EXPERIENCE', 'PROJECTS', 'SKILLS', 'CERTIFICATIONS', 'INTEREST', 
            'SUMMARY', 'OBJECTIVE', 'QUALIFICATIONS', 'ACTIVITIES', 'IMAGE', 'CONTACT',
            'DATA SCIENTIST', 'SOFTWARE ENGINEER', 'FULL STACK', 'DEVELOPER', 'OPERATIONS SPECIALIST', 'ANALYST'
        ]
        for l in lines[:8]:
            cl = clean_text(l)
            if 2 <= len(cl) <= 35 and not any(k in cl.upper() for k in ignored_name_words):
                if not any(k in cl.lower() for k in ['phone', 'email', 'http', '+91', 'location', 'curriculum', 'resume']):
                    candidate_name = cl
                    break

        if not candidate_name and filename:
            base = os.path.splitext(os.path.basename(filename))[0]
            base = re.sub(r'[_\-]+', ' ', base).strip()
            if not base.replace(' ', '').isdigit():
                candidate_name = base

        # Segment Sections
        sections = {'HEADER': []}
        cur_sec = 'HEADER'

        for l in lines:
            cl = clean_text(l)
            matched_sec, heading_title = self.match_heading(l)
            if matched_sec:
                cur_sec = matched_sec.upper()
                if cur_sec not in sections:
                    sections[cur_sec] = []
            else:
                if candidate_name and candidate_name.lower() in cl.lower() and len(cl) < 40 and cur_sec != 'HEADER':
                    continue
                if email_str and email_str in cl and cur_sec != 'HEADER':
                    continue
                if ('linkedin.com' in cl.lower() or 'github.com' in cl.lower()) and cur_sec != 'HEADER':
                    continue
                sections[cur_sec].append(l)

        return plain_text, sections, candidate_name or "Candidate Applicant", email_str, phone_str

    def _parse_work_experience(self, exp_lines: List[str]) -> List[Dict[str, Any]]:
        roles = []
        if not exp_lines:
            return roles

        current_role = None
        i = 0
        while i < len(exp_lines):
            line = exp_lines[i].strip()
            if not line or line.startswith(('Page ', 'http', '<!--')) or line in ['•', '·', '-']:
                i += 1
                continue

            if '|' in line and not line.startswith(('•', '·', '➢', '-')):
                parts = [p.strip() for p in line.split('|') if p.strip()]
                t_val = parts[0]
                c_val = parts[1] if len(parts) > 1 else "Organization"
                p_val = "2023 - Present"

                for pt in parts:
                    dm = DATE_REGEX.search(pt)
                    if dm:
                        p_val = dm.group(0)
                        if pt == t_val:
                            t_val = parts[1] if len(parts) > 1 else "Professional Role"
                        elif pt == c_val:
                            c_val = parts[2] if len(parts) > 2 else "Organization"

                if current_role:
                    roles.append(current_role)
                current_role = {
                    "title": clean_text(t_val),
                    "company": clean_text(c_val),
                    "period": p_val,
                    "bullets": []
                }
                i += 1
                continue

            is_title_kw = any(kw in line.lower() for kw in ['intern', 'engineer', 'developer', 'associate', 'specialist', 'manager', 'lead', 'scientist', 'analyst', 'consultant', 'architect'])
            is_comp_kw = any(kw in line.lower() for kw in ['ltd', 'inc', 'corp', 'technologies', 'services', 'consultancy', 'solutions', 'genpact', 'tcs', 'wipro'])
            is_bullet = line.startswith(('•', '·', '-', '*', '➢', 'o ')) or (len(line) > 55 and any(line.lower().startswith(v) for v in ['managed', 'provided', 'developed', 'built', 'created', 'maintained', 'designed']))

            if not is_bullet and (is_title_kw or is_comp_kw) and len(line) < 90:
                p_val = "2023 - Present"
                dm = DATE_REGEX.search(line)
                if dm:
                    p_val = dm.group(0)

                t_val = clean_text(line.replace(p_val, ''))
                if current_role:
                    roles.append(current_role)
                current_role = {
                    "title": t_val or "Professional Role",
                    "company": "Organization",
                    "period": p_val,
                    "bullets": []
                }
                i += 1
                continue

            if current_role:
                cl = clean_text(line)
                if len(cl) > 15 and not DATE_REGEX.search(line):
                    current_role["bullets"].append(cl)
            i += 1

        if current_role:
            roles.append(current_role)

        for r in roles:
            if not r["bullets"]:
                r["bullets"] = ["Demonstrated core responsibilities and software execution."]

        return roles[:6]

    def _parse_projects(self, proj_lines: List[str]) -> List[Dict[str, Any]]:
        projects = []
        if not proj_lines:
            return projects

        current_proj = None
        i = 0
        while i < len(proj_lines):
            line = proj_lines[i].strip()
            if not line:
                i += 1
                continue

            is_proj_title = (
                line.startswith('## ') or
                'Project' in line or
                ('-' in line and any(kw in line.lower() for kw in ['python', 'ml', 'mern', 'react', 'blockchain', 'sql', 'flask', 'django', 'aws', 'docker'])) or
                (len(line) < 60 and not line.startswith(('•', '-')) and i + 1 < len(proj_lines) and len(proj_lines[i+1]) > 50)
            )

            if is_proj_title and len(line) < 90:
                if current_proj:
                    projects.append(current_proj)
                p_title = clean_text(line)
                p_org = "Independent Project"
                p_period = "2023 - 2025"
                
                if DATE_REGEX.search(line):
                    p_period = DATE_REGEX.search(line).group(0)

                current_proj = {
                    "title": p_title,
                    "organization": p_org,
                    "period": p_period,
                    "bullets": []
                }
                i += 1
                continue

            if current_proj:
                cl = clean_text(line)
                if len(cl) > 20:
                    current_proj["bullets"].append(cl)
            i += 1

        if current_proj:
            projects.append(current_proj)

        for p in projects:
            if not p["bullets"]:
                p["bullets"] = ["Project architecture, technical implementation, and deliverables."]

        return projects[:6]

    def _parse_education(self, edu_lines: List[str], full_text: str = "") -> List[Dict[str, Any]]:
        edu_records = []
        clean_lines = [clean_text(l) for l in edu_lines if clean_text(l)]
        if not clean_lines and full_text:
            for line in full_text.split('\n'):
                cl = clean_text(line)
                if cl and DEGREE_PATTERN.search(cl):
                    clean_lines.append(cl)

        i = 0
        while i < len(clean_lines):
            line = clean_lines[i]
            deg_match = DEGREE_PATTERN.search(line)
            if deg_match:
                deg = deg_match.group(0).strip()
                rest = line.replace(deg, '').strip(' -–,:|')
                period = ""
                score = ""
                date_m = DATE_REGEX.search(line)
                if date_m:
                    period = date_m.group(0)
                score_m = SCORE_REGEX.search(line)
                if score_m:
                    score = score_m.group(0)

                inst = rest or "Educational Institution"
                if i + 1 < len(clean_lines) and not DEGREE_PATTERN.search(clean_lines[i+1]):
                    inst = clean_lines[i+1]
                    i += 1

                edu_records.append({
                    "degree": deg,
                    "institution": inst,
                    "period": period,
                    "score": score
                })
            i += 1

        return edu_records[:5]

    def _parse_skills(self, skills_lines: List[str], candidate_name: str = "") -> List[str]:
        flat_skills = []
        invalid_words = {'SKILLS', 'TECHNICAL SKILLS', 'GENERAL', 'PROJECTS', 'EXPERIENCE', 'EDUCATION'}
        
        for line in skills_lines:
            cl = clean_text(line)
            if not cl or cl.upper() in invalid_words:
                continue
            if candidate_name and cl.lower() == candidate_name.lower():
                continue
            content = cl.split(':', 1)[1] if ':' in cl else cl
            tokens = re.split(r'[,;•·\t\n|]', content)
            for t in tokens:
                t_clean = clean_text(t)
                if 2 <= len(t_clean) <= 40 and t_clean.upper() not in invalid_words:
                    if t_clean not in flat_skills:
                        flat_skills.append(t_clean)

        # Fallback list if few detected
        if len(flat_skills) < 3:
            common = ["Python", "TypeScript", "React", "Node.js", "PostgreSQL", "Docker", "AWS", "SQL", "FastAPI", "REST APIs"]
            flat_skills.extend([s for s in common if s not in flat_skills][:5])

        return flat_skills[:20]

    def parse_resume(self, text: str, filename: str = "") -> Dict[str, Any]:
        full_text, sections, candidate_name, email_str, phone_str = self.extract_document_sections(text, filename)

        summary_lines = sections.get('SUMMARY') or sections.get('OBJECTIVE') or []
        summary_text = " ".join([clean_text(l) for l in summary_lines if clean_text(l)]).strip()

        exp_lines = sections.get('EXPERIENCE') or []
        experience_records = self._parse_work_experience(exp_lines)

        proj_lines = sections.get('PROJECTS') or []
        project_records = self._parse_projects(proj_lines)

        edu_lines = sections.get('EDUCATION') or []
        education_records = self._parse_education(edu_lines, full_text=full_text)

        skills_lines = sections.get('SKILLS') or []
        skills_list = self._parse_skills(skills_lines, candidate_name=candidate_name)

        cert_lines = sections.get('CERTIFICATIONS') or []
        certifications = [{"title": clean_text(c), "issuer": "Certification", "date": ""} for c in cert_lines if len(clean_text(c)) > 3][:6]

        achieve_lines = sections.get('ACHIEVEMENTS') or []
        achievements = [clean_text(a) for a in achieve_lines if len(clean_text(a)) > 4][:6]

        return {
            "candidate_name": candidate_name,
            "email": email_str or f"{candidate_name.lower().replace(' ', '.')}@example.com",
            "phone": phone_str or "+1 (555) 000-0000",
            "summary": summary_text,
            "experience_records": experience_records,
            "project_records": project_records,
            "education_records": education_records,
            "skills_list": skills_list,
            "certifications": certifications,
            "achievements": achievements,
            "experience_raw_text": "\n".join(exp_lines),
            "projects_raw_text": "\n".join(proj_lines),
            "education_raw_text": "\n".join(edu_lines),
            "raw_text": full_text,
            "filename": filename
        }

document_parser = DocumentParser()

async def refine_experience_and_projects_ai(
    exp_text: str = "",
    proj_text: str = "",
    edu_text: str = "",
    fallback_exp: Optional[List[Dict[str, Any]]] = None,
    fallback_proj: Optional[List[Dict[str, Any]]] = None,
    fallback_edu: Optional[List[Dict[str, Any]]] = None
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Uses Gemini 2.5 Flash to segment and structure Experience, Projects, and Education."""
    fallback_exp = fallback_exp or []
    fallback_proj = fallback_proj or []
    fallback_edu = fallback_edu or []

    exp_clean = (exp_text or "").strip()
    proj_clean = (proj_text or "").strip()
    edu_clean = (edu_text or "").strip()

    if len(exp_clean) < 15 and len(proj_clean) < 15 and len(edu_clean) < 10:
        return fallback_exp, fallback_proj, fallback_edu

    prompt = f"""
You are an expert Enterprise ATS Resume Structure Parsing Engine.
Analyze ONLY the provided Work Experience, Projects, and Education raw text segments below.
Extract and clean up all roles, projects, and educational qualifications into a strictly valid JSON object matching this schema exactly:

{{
  "experience_records": [
    {{
      "title": "Exact Job Title / Designation",
      "company": "Company / Organization Name",
      "period": "Date range (e.g. '2023 - Present' or 'Jan 2024 - Dec 2024')",
      "bullets": ["Responsibility, accomplishment, or metric bullet point 1", "bullet point 2"]
    }}
  ],
  "project_records": [
    {{
      "title": "Exact Full Project Title including tech stack if listed",
      "organization": "Project Type or Organization (e.g. 'Independent Project' or 'Academic Project')",
      "period": "Date range or duration",
      "bullets": ["Project detail, architecture, or outcome bullet point 1"]
    }}
  ],
  "education_records": [
    {{
      "degree": "Degree / Qualification (e.g. 'Bachelor of Technology, Computer Science', 'M.Sc. Data Science')",
      "institution": "University / College / School Name",
      "period": "Years or Duration (e.g. '2019 - 2023')",
      "score": "Score, GPA, or Percentage if present"
    }}
  ]
}}

--- RAW WORK EXPERIENCE SECTION ---
{exp_clean if exp_clean else "(None provided)"}

--- RAW PROJECTS SECTION ---
{proj_clean if proj_clean else "(None provided)"}

--- RAW EDUCATION SECTION ---
{edu_clean if edu_clean else "(None provided)"}
"""

    ai_response = await call_openrouter_gemini(
        prompt=prompt,
        system_prompt="You are an expert Enterprise ATS parser specialized in work experience, projects, and education. Return only valid JSON."
    )

    if ai_response:
        try:
            json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                if isinstance(parsed, dict):
                    exp = parsed.get('experience_records')
                    proj = parsed.get('project_records')
                    edu = parsed.get('education_records')
                    return (
                        exp if isinstance(exp, list) and len(exp) > 0 else fallback_exp,
                        proj if isinstance(proj, list) and len(proj) > 0 else fallback_proj,
                        edu if isinstance(edu, list) and len(edu) > 0 else fallback_edu,
                    )
        except Exception as e:
            logger.error(f"Error parsing Gemini JSON: {e}")

    return fallback_exp, fallback_proj, fallback_edu

async def generate_candidate_interview_questions_ai(
    candidate_name: str,
    role: str,
    skills: List[str],
    experience_years: float,
    resume_summary: str = "",
    experience_records: Optional[List[Dict[str, Any]]] = None,
    project_records: Optional[List[Dict[str, Any]]] = None,
    raw_resume_text: str = ""
) -> List[Dict[str, Any]]:
    """
    Generates 10 tailored interview questions based on the candidate's actual extracted resume content,
    real projects, company experience, and target role using Gemini 2.5 Flash.
    """
    exp_summary_str = ""
    if experience_records:
        for e in experience_records:
            bullets = " ".join(e.get("bullets", []))
            exp_summary_str += f"- Role: {e.get('title')} at {e.get('company')} ({e.get('period')}): {bullets}\n"

    proj_summary_str = ""
    if project_records:
        for p in project_records:
            bullets = " ".join(p.get("bullets", []))
            proj_summary_str += f"- Project: {p.get('title')} ({p.get('organization')}, {p.get('period')}): {bullets}\n"

    prompt = f"""
You are an experienced technical interviewer and panel bar-raiser.
Generate 10 natural, conversational interview questions tailored specifically to this candidate's background and target role.

IMPORTANT STYLE GUIDELINES:
- Keep questions CONCISE, DIRECT, and NATURAL — exactly how a real human panel interviewer asks questions in an interview room (1 to 2 clear sentences maximum).
- Avoid long paragraphs, verbose preambles, or multiple nested sub-questions in a single prompt.
- For each question, provide a sharp 1-sentence follow-up question.

--- CANDIDATE DETAILS ---
Candidate Name: {candidate_name}
Target Role: {role}
Years of Experience: {experience_years}
Skills Matrix: {', '.join(skills) if skills else 'General Software Engineering'}
Professional Summary: {resume_summary}

--- EXTRACTED WORK EXPERIENCE ---
{exp_summary_str if exp_summary_str else "(Referenced in resume)"}

--- EXTRACTED PROJECTS ---
{proj_summary_str if proj_summary_str else "(Referenced in resume)"}

--- RAW RESUME EXCERPT ---
{raw_resume_text[:2000] if raw_resume_text else "(No additional text)"}

--- INSTRUCTIONS ---
Generate a strictly valid JSON object with a "questions" key containing exactly 10 questions across these 4 categories:
1. Core Architecture & Depth (3 questions)
2. Applied Problem Solving & Debugging (3 questions - referencing their real projects/experience)
3. System Design & Scalability (2 questions)
4. Behavioral & Leadership (2 questions)

Each question object in the array MUST match this exact schema:
{{
  "id": 1,
  "category": "Core Architecture & Depth" | "Applied Problem Solving & Debugging" | "System Design & Scalability" | "Behavioral & Leadership",
  "difficulty": "Medium" | "Advanced" | "Lead / Principal",
  "question": "A concise, natural 1-2 sentence question directly asking about their skills or project experience.",
  "suggestedFollowUp": "A direct 1-sentence follow-up question."
}}
"""

    ai_response = await call_openrouter_gemini(
        prompt=prompt,
        system_prompt="You are a realistic panel interviewer. Generate concise, natural 1-2 sentence interview questions and follow-ups in strict JSON format."
    )

    if ai_response:
        try:
            json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                questions = parsed.get("questions", [])
                if isinstance(questions, list) and len(questions) == 10:
                    for idx, q in enumerate(questions, 1):
                        q["id"] = idx
                        # Ensure fields are clean
                        if "rationale" not in q: q["rationale"] = ""
                        if "expectedSignals" not in q: q["expectedSignals"] = []
                    return questions
        except Exception as e:
            logger.error(f"Error parsing generated questions: {e}")

    # Fallback to local clean concise questions
    return generate_fallback_questions(candidate_name, role, skills, experience_years, experience_records, project_records)

def generate_fallback_questions(
    candidate_name: str,
    role: str,
    skills: List[str],
    experience_years: float,
    experience_records: Optional[List[Dict[str, Any]]] = None,
    project_records: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    """Synthesizes 10 natural, conversational interview questions and follow-ups."""
    p_skill = skills[0] if skills else "System Architecture"
    s_skill = skills[1] if len(skills) > 1 else "API Design"
    db_skill = next((s for s in skills if any(k in s.lower() for k in ['sql', 'postgres', 'mongo', 'redis', 'db'])), "PostgreSQL")
    proj_title = project_records[0].get("title", "your core project") if project_records else f"{p_skill} platform"
    comp_name = experience_records[0].get("company", "your previous company") if experience_records else "production"

    return [
        {
            "id": 1,
            "category": "Core Architecture & Depth",
            "difficulty": "Advanced",
            "question": f"In {p_skill}, how do you manage asynchronous state and prevent performance bottlenecks under heavy load?",
            "suggestedFollowUp": "How do you trace and isolate latency spikes across upstream microservices?"
        },
        {
            "id": 2,
            "category": "Core Architecture & Depth",
            "difficulty": "Lead / Principal" if experience_years >= 5 else "Advanced",
            "question": f"When designing APIs with {s_skill}, how do you ensure backward compatibility and strict contract typing?",
            "suggestedFollowUp": "What is your approach to versioning breaking schema changes?"
        },
        {
            "id": 3,
            "category": "Core Architecture & Depth",
            "difficulty": "Medium",
            "question": f"In {db_skill}, how do you choose between indexing strategies to optimize slow queries without degrading write speed?",
            "suggestedFollowUp": "How do you detect and resolve table lock contention in high-throughput tables?"
        },
        {
            "id": 4,
            "category": "Applied Problem Solving & Debugging",
            "difficulty": "Advanced",
            "question": f"In '{proj_title}', what was the most challenging technical roadblock you encountered, and how did you resolve it?",
            "suggestedFollowUp": "What safeguards or automated tests did you put in place to prevent it from recurring?"
        },
        {
            "id": 5,
            "category": "Applied Problem Solving & Debugging",
            "difficulty": "Medium",
            "question": f"During your work at {comp_name}, tell us about an unexpected production bug or outage you had to debug under pressure.",
            "suggestedFollowUp": "How did you communicate with stakeholders while resolving the issue?"
        },
        {
            "id": 6,
            "category": "Applied Problem Solving & Debugging",
            "difficulty": "Advanced",
            "question": "If a critical background job processing financial records fails halfway through a large batch, how do you ensure safe recovery without duplicate records?",
            "suggestedFollowUp": "How do you structure dead-letter queues for payloads that fail repeatedly?"
        },
        {
            "id": 7,
            "category": "System Design & Scalability",
            "difficulty": "Lead / Principal" if experience_years >= 5 else "Advanced",
            "question": f"How would you design a real-time notification engine for {role} that delivers instant alerts via WebSockets and webhooks?",
            "suggestedFollowUp": "How do you handle connection storms when thousands of clients reconnect at once?"
        },
        {
            "id": 8,
            "category": "System Design & Scalability",
            "difficulty": "Advanced",
            "question": "How do you approach multi-tenant data isolation at the database and cache layers without duplicating infrastructure costs?",
            "suggestedFollowUp": "How do you prevent noisy-neighbor tenants from overwhelming shared resources?"
        },
        {
            "id": 9,
            "category": "Behavioral & Leadership",
            "difficulty": "Medium",
            "question": "Tell us about a time you had a strong technical disagreement with a team member on architectural direction. How did you resolve the trade-offs?",
            "suggestedFollowUp": "How did you ensure the team stayed aligned after the final decision was made?"
        },
        {
            "id": 10,
            "category": "Behavioral & Leadership",
            "difficulty": "Lead / Principal" if experience_years >= 5 else "Medium",
            "question": f"How do you approach mentoring junior engineers, conducting constructive code reviews, and maintaining team delivery velocity?",
            "suggestedFollowUp": "What is your strategy when a sprint deadline is at risk of slipping?"
        }
    ]

