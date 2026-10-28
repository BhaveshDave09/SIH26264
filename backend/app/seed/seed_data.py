import os
import sys

# Ensure repository root is in sys.path when running script directly
_repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

import json
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal, engine, Base
from backend.app.models.user import User
from backend.app.models.institution import Institution, InstitutionAlias
from backend.app.models.case import Case, CaseHistory
from backend.app.models.relationship import CaseRelationship
from backend.app.models.coordination import CoordinationTask, CoordinationUpdate
from backend.app.models.notification import Notification
from backend.app.models.audit import AuditEvent
from backend.app.services.auth import hash_password
from backend.app.services.audit import GENESIS_HASH, compute_event_hash, canonical_serialize
from backend.app.services.intelligence import clean_text

def seed_database(force_reset: bool = False):
    """Populates database with comprehensive fictional SIH 2026 demonstration data."""
    if force_reset:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).first() and not force_reset:
            print("Database already contains data. Skipping seeding.")
            return

        print("Seeding database with demonstration data...")

        # -------------------------------------------------------------
        # 1. SEED USERS
        # -------------------------------------------------------------
        demo_users_data = [
            ("superadmin", "superadmin@aicte-sentinel.gov.in", "Dr. A. K. Sharma", "Admin@123", "SUPER_ADMIN", "ALL", "ALL"),
            ("rb_head", "rb.head@aicte-sentinel.gov.in", "Prof. Sunita Rao", "Bureau@123", "BUREAU_HEAD", "RB", "ALL"),
            ("pgrc_head", "pgrc.head@aicte-sentinel.gov.in", "Dr. Rajeshwar Verma", "Bureau@123", "BUREAU_HEAD", "PGRC", "ALL"),
            ("rb_officer", "rb.officer1@aicte-sentinel.gov.in", "Vikramaditya Sen", "Officer@123", "BUREAU_OFFICER", "RB", "North"),
            ("pgrc_officer", "pgrc.officer1@aicte-sentinel.gov.in", "Pooja Deshmukh", "Officer@123", "BUREAU_OFFICER", "PGRC", "North"),
            ("approval_officer", "approval.officer@aicte-sentinel.gov.in", "Anand K. Kulkarni", "Officer@123", "BUREAU_OFFICER", "APPROVAL_BUREAU", "West"),
            ("regional_south", "regional.south@aicte-sentinel.gov.in", "K. Ramanathan", "Regional@123", "REGIONAL_OFFICER", "ALL", "South"),
            ("regional_west", "regional.west@aicte-sentinel.gov.in", "Manish Patwardhan", "Regional@123", "REGIONAL_OFFICER", "ALL", "West"),
            ("viewer", "management.viewer@aicte-sentinel.gov.in", "Meenakshi Sundaram", "Viewer@123", "READ_ONLY", "ALL", "ALL"),
        ]

        users_map = {}
        for username, email, full_name, password, role, bureau, region in demo_users_data:
            salt, hashed = hash_password(password)
            user = User(
                username=username,
                email=email,
                full_name=full_name,
                hashed_password=hashed,
                salt=salt,
                role=role,
                bureau=bureau,
                region=region,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            users_map[username] = user

        # -------------------------------------------------------------
        # 2. SEED INSTITUTIONS
        # -------------------------------------------------------------
        institutions_data = [
            {
                "permanent_id": "1-1029384751",
                "name": "Apex Institute of Technology & Management",
                "address": "Sector 62, Institutional Area, Knowledge Park",
                "state": "Delhi",
                "region": "North",
                "category": "Engineering & Technology",
                "status": "Under Scrutiny",
                "aliases": ["AITM Delhi", "Apex Tech", "Apex Institute"]
            },
            {
                "permanent_id": "1-2049583726",
                "name": "Bharatiya College of Engineering & Research",
                "address": "Kothrud Bypass Road, Pune",
                "state": "Maharashtra",
                "region": "West",
                "category": "Engineering & Technology",
                "status": "Active",
                "aliases": ["BCER Pune", "Bharatiya Engineering College"]
            },
            {
                "permanent_id": "1-3948572619",
                "name": "Deccan Academy of Higher Technical Studies",
                "address": "Electronic City Phase 1, Bengaluru",
                "state": "Karnataka",
                "region": "South",
                "category": "Engineering & Technology",
                "status": "Active",
                "aliases": ["DAHTS Bangalore", "Deccan Academy"]
            },
            {
                "permanent_id": "1-4829103847",
                "name": "Saraswati Institute of Pharmaceutical Sciences",
                "address": "Bhopal Bypass Road, Gandhi Nagar",
                "state": "Madhya Pradesh",
                "region": "Central",
                "category": "Pharmacy",
                "status": "Deficient",
                "aliases": ["SIPS Bhopal", "Saraswati Pharma"]
            },
            {
                "permanent_id": "1-5829104839",
                "name": "Kalinga Institute of Applied Management",
                "address": "Chandrasekharpur, Bhubaneswar",
                "state": "Odisha",
                "region": "East",
                "category": "Management",
                "status": "Active",
                "aliases": ["KIAM Odisha", "Kalinga Management"]
            },
            {
                "permanent_id": "1-6719283745",
                "name": "Himalayan Valley Institute of Science & Technology",
                "address": "Solan Highway, District Solan",
                "state": "Himachal Pradesh",
                "region": "North-West",
                "category": "Engineering & Technology",
                "status": "Active",
                "aliases": ["HVIST Solan", "Himalayan Tech"]
            },
            {
                "permanent_id": "1-7829103948",
                "name": "Malabar Ocean College of Engineering",
                "address": "Kalamassery, Ernakulam",
                "state": "Kerala",
                "region": "South",
                "category": "Engineering & Technology",
                "status": "Active",
                "aliases": ["MOCE Kochi", "Malabar College"]
            },
            {
                "permanent_id": "1-8930192837",
                "name": "Greenfield Polytechnic & Vocational Institute",
                "address": "GIDC Naroda Industrial Zone, Ahmedabad",
                "state": "Gujarat",
                "region": "West",
                "category": "Applied Arts & Crafts",
                "status": "Active",
                "aliases": ["Greenfield Poly", "GPVI Ahmedabad"]
            }
        ]

        inst_map = {}
        for d in institutions_data:
            inst = Institution(
                permanent_id=d["permanent_id"],
                name=d["name"],
                normalized_name=clean_text(d["name"]),
                address=d["address"],
                state=d["state"],
                region=d["region"],
                category=d["category"],
                status=d["status"]
            )
            db.add(inst)
            db.commit()
            db.refresh(inst)
            inst_map[d["permanent_id"]] = inst

            for alias in d["aliases"]:
                a_obj = InstitutionAlias(
                    institution_id=inst.id,
                    alias_name=alias,
                    normalized_alias=clean_text(alias)
                )
                db.add(a_obj)
            db.commit()

        # -------------------------------------------------------------
        # 3. SEED CASES
        # -------------------------------------------------------------
        today = date.today()
        cases_data = [
            # PRIMARY DEMO SCENARIO A: Apex Institute (Cross-Bureau Overlap & Action Conflict)
            {
                "id": "AICTE/PGRC/2026/001",
                "permanent_id": "1-1029384751",
                "complainant_name": "Student Council Forum",
                "complainant_type": "Student",
                "title": "Arbitrary Tuition Hike and Mandatory Non-Refundable Building Fund",
                "description": "Apex Institute has levied an unauthorized Rs. 45,000 annual building fund fee over AICTE approved fee slab and is withholding original degree transcripts of final year students upon refusal to pay.",
                "category": "Fee Overcharging",
                "priority": "Critical",
                "status": "Under Process",
                "assigned_bureau": "PGRC",
                "officer": "pgrc_officer",
                "received_days_ago": 28,
                "disposal_days_left": -4,  # Overdue
                "last_action": "Hearing notice issued to college management on 2026-10-14",
                "next_action_required": "Review management explanation and verify fee receipts",
                "is_escalated": True,
                "escalation_reason": "Breached 21-day preliminary inquiry SLA deadline."
            },
            {
                "id": "AICTE/RB/2026/002",
                "permanent_id": "1-1029384751",
                "complainant_name": "Senior Faculty Member (Confidential)",
                "complainant_type": "Faculty",
                "title": "Unapproved Intake Expansion and Infrastructure Non-Compliance",
                "description": "Apex Institute of Technology admitted 120 unapproved students in B.Tech Computer Science without AICTE extension of approval, operating classes in an uncertified basement block lacking fire safety clearance.",
                "category": "Unapproved Courses",
                "priority": "Critical",
                "status": "Under Process",
                "assigned_bureau": "RB",
                "officer": "rb_officer",
                "received_days_ago": 18,
                "disposal_days_left": 8,
                "last_action": "Expert Committee inspection report submitted to Regulation Bureau",
                "next_action_required": "Prepare Show Cause Notice for regulatory withdrawal/penalty",
                "is_escalated": False
            },

            # PRIMARY DEMO SCENARIO B: Duplicate Complaint on Bharatiya College
            {
                "id": "AICTE/PGRC/2026/003",
                "permanent_id": "1-2049583726",
                "complainant_name": "Aman Shinde (Mechanical Engg)",
                "complainant_type": "Student",
                "title": "Refusal to Refund Caution Deposit and Original Certificates After Course Withdrawal",
                "description": "The administration of Bharatiya College of Engineering refuses to refund the security caution deposit of Rs. 20,000 deposited during 1st year admission and has retained original 10th and 12th marksheets.",
                "category": "Fee Overcharging",
                "priority": "High",
                "status": "Pending Review",
                "assigned_bureau": "PGRC",
                "officer": "pgrc_officer",
                "received_days_ago": 12,
                "disposal_days_left": 18,
                "last_action": "Complaint registered through national student grievance portal",
                "next_action_required": "Verify student enrollment records and dispatch notice",
                "is_escalated": False
            },
            {
                "id": "AICTE/PGRC/2026/004",
                "permanent_id": "1-2049583726",
                "complainant_name": "Parent Association Member - S. Shinde",
                "complainant_type": "Parent",
                "title": "Non-Refund of Caution Money and Retention of Educational Certificates",
                "description": "Bharatiya College of Engineering refuses to refund the security caution deposit of Rs. 20,000 deposited during 1st year admission and has retained original 10th and 12th marksheets after student Aman Shinde withdrew.",
                "category": "Fee Overcharging",
                "priority": "High",
                "status": "Received",
                "assigned_bureau": "PGRC",
                "officer": "pgrc_officer",
                "received_days_ago": 5,
                "disposal_days_left": 25,
                "last_action": "Complaint received via public grievance portal",
                "next_action_required": "Scrutinize for potential duplicate filing with case 003",
                "is_escalated": False
            },

            # Additional 21 diverse cases across institutions, statuses, and bureaus
            {
                "id": "AICTE/RB/2026/005",
                "permanent_id": "1-3948572619",
                "complainant_name": "Technical Education Vigilance",
                "complainant_type": "Public",
                "title": "Severe Faculty Shortage and Fraudulent Ghost Faculty Affidavits",
                "description": "Deccan Academy submitted forged Aadhaar and salary slips for 14 non-existent adjunct professors to meet the mandated 1:15 faculty-student cadence for AICTE accreditation renewal.",
                "category": "Faculty Exploitation",
                "priority": "Critical",
                "status": "Escalated",
                "assigned_bureau": "RB",
                "officer": "rb_officer",
                "received_days_ago": 42,
                "disposal_days_left": -12,  # Overdue
                "last_action": "Sub-committee inquiry conducted on 2026-10-02",
                "next_action_required": "Summon Chairman and Principal for standing hearing committee",
                "is_escalated": True,
                "escalation_reason": "Deliberate regulatory non-compliance and overdue investigation."
            },
            {
                "id": "AICTE/APPROVAL_BUREAU/2026/006",
                "permanent_id": "1-3948572619",
                "complainant_name": "Deccan Education Trust",
                "complainant_type": "Institution",
                "title": "Application for Additional Division in Artificial Intelligence & Data Science",
                "description": "Institutional proposal seeking approval for 60 additional seats in B.Tech Artificial Intelligence for Academic Year 2026-27.",
                "category": "Admission Irregularity",
                "priority": "Medium",
                "status": "Under Process",
                "assigned_bureau": "APPROVAL_BUREAU",
                "officer": "approval_officer",
                "received_days_ago": 15,
                "disposal_days_left": 15,
                "last_action": "Documentary scrutiny cleared; awaiting RB clearance",
                "next_action_required": "Cross-check with Regulation Bureau regarding pending fraud inquiry",
                "is_escalated": False
            },
            {
                "id": "AICTE/RB/2026/007",
                "permanent_id": "1-4829103847",
                "complainant_name": "Pharmacy Inspection Wing",
                "complainant_type": "Public",
                "title": "Critical Deficit in Wet Chemistry Laboratories and Expired Reagents",
                "description": "Surprise inspection revealed that Saraswati Institute lacks essential HPLC instruments, emergency eyewash stations, and is operating with expired chemical reagents posing toxic risk to B.Pharm students.",
                "category": "Infrastructure Deficit",
                "priority": "Critical",
                "status": "Under Process",
                "assigned_bureau": "RB",
                "officer": "rb_officer",
                "received_days_ago": 22,
                "disposal_days_left": 3,  # Approaching deadline
                "last_action": "Immediate stop-work order served for pharmaceutical lab block",
                "next_action_required": "Review compliance affidavit and lab rectification certificate",
                "is_escalated": False
            },
            {
                "id": "AICTE/PGRC/2026/008",
                "permanent_id": "1-4829103847",
                "complainant_name": "Batch of 2023-27 Pharmacy Students",
                "complainant_type": "Student",
                "title": "Inability to Complete Mandated Practical Hours Due to Sealed Laboratories",
                "description": "Students are unable to sit for semester practical examinations because laboratories remain non-compliant and shut down by regulatory inspection without alternate arrangements.",
                "category": "Infrastructure Deficit",
                "priority": "High",
                "status": "Pending Review",
                "assigned_bureau": "PGRC",
                "officer": "pgrc_officer",
                "received_days_ago": 7,
                "disposal_days_left": 23,
                "last_action": "Petition forwarded to zonal officer",
                "next_action_required": "Coordinate with Regulation Bureau on student exam accommodation",
                "is_escalated": False
            },
            {
                "id": "AICTE/PGRC/2026/009",
                "permanent_id": "1-5829104839",
                "complainant_name": "Alumni Association",
                "complainant_type": "Student",
                "title": "Misleading 100% Placement Guarantee Advertisements",
                "description": "Kalinga Institute published print advertisements claiming 100% placement with average package of Rs. 14 LPA, whereas official NIRF data indicates under 52% placement.",
                "category": "Admission Irregularity",
                "priority": "Medium",
                "status": "Disposed",
                "assigned_bureau": "PGRC",
                "officer": "pgrc_officer",
                "received_days_ago": 60,
                "disposal_days_left": -30,
                "last_action": "Institution tendered unconditional apology and retracted adverts",
                "next_action_required": "Closed - matter disposed",
                "is_escalated": False
            },
            {
                "id": "AICTE/RB/2026/010",
                "permanent_id": "1-6719283745",
                "complainant_name": "Anti-Ragging Squad",
                "complainant_type": "Public",
                "title": "Lapse in Institutional Anti-Ragging Committee Mechanism",
                "description": "Himalayan Valley Institute failed to register student grievance regarding hostel bullying within the mandatory 24-hour statutory timeframe under AICTE Anti-Ragging Regulations.",
                "category": "Ragging & Safety",
                "priority": "Critical",
                "status": "Under Process",
                "assigned_bureau": "RB",
                "officer": "rb_officer",
                "received_days_ago": 10,
                "disposal_days_left": 5,  # Approaching deadline
                "last_action": "Institutional disciplinary record called for inspection",
                "next_action_required": "Conduct virtual interview with victim and committee head",
                "is_escalated": False
            },
            {
                "id": "AICTE/APPROVAL_BUREAU/2026/011",
                "permanent_id": "1-7829103948",
                "complainant_name": "Malabar Educational Society",
                "complainant_type": "Institution",
                "title": "Extension of Approval (EOA) for Marine Engineering Discipline",
                "description": "Routine annual renewal application for 2026-27 with updated simulator facility documentation.",
                "category": "Admission Irregularity",
                "priority": "Low",
                "status": "Disposed",
                "assigned_bureau": "APPROVAL_BUREAU",
                "officer": "approval_officer",
                "received_days_ago": 45,
                "disposal_days_left": -15,
                "last_action": "EOA letter issued successfully following document verification",
                "next_action_required": "Completed",
                "is_escalated": False
            },
            {
                "id": "AICTE/RB/2026/012",
                "permanent_id": "1-8930192837",
                "complainant_name": "Junior Instructors Association",
                "complainant_type": "Faculty",
                "title": "Unpaid Salaries for 5 Months and Non-Payment of 7th Pay Commission Allowances",
                "description": "Greenfield Polytechnic has delayed monthly salaries for 34 technical instructors since May 2026 while coercing staff into signing blank salary disbursement vouchers.",
                "category": "Faculty Exploitation",
                "priority": "High",
                "status": "Transferred",
                "assigned_bureau": "FINANCE_BUREAU",
                "officer": "rb_officer",
                "received_days_ago": 30,
                "disposal_days_left": 0,  # Reaches deadline today
                "last_action": "Case referred from RB to Finance Bureau for forensic audit",
                "next_action_required": "Finance Bureau forensic team to audit trust accounts",
                "is_escalated": False
            },
            {
                "id": "AICTE/PGRC/2026/013",
                "permanent_id": "1-1029384751",
                "complainant_name": "Anonymous Parent",
                "complainant_type": "Anonymous",
                "title": "Capitation Fee Demands for B.Tech Management Quota Admissions",
                "description": "Apex Institute admission office is demanding Rs. 3,50,000 cash capitation fee in addition to tuition fees for IT and CS branch management quota seats.",
                "category": "Fee Overcharging",
                "priority": "Critical",
                "status": "Pending Review",
                "assigned_bureau": "PGRC",
                "officer": "pgrc_officer",
                "received_days_ago": 6,
                "disposal_days_left": 24,
                "last_action": "Audio recordings submitted by complainant under verification",
                "next_action_required": "Verify authenticity of audio and link with ongoing Apex cases",
                "is_escalated": False
            },
            {
                "id": "AICTE/RB/2026/014",
                "permanent_id": "1-2049583726",
                "complainant_name": "Regional Fire & Rescue Department",
                "complainant_type": "Public",
                "title": "Absence of Fire Safety NOC for 4-Storey Academic Block",
                "description": "Bharatiya College academic block B has failed municipal fire compliance inspection; fire exits are locked and extinguishers are unserviced.",
                "category": "Infrastructure Deficit",
                "priority": "High",
                "status": "Under Process",
                "assigned_bureau": "RB",
                "officer": "rb_officer",
                "received_days_ago": 14,
                "disposal_days_left": 16,
                "last_action": "Notice served to principal for immediate rectification",
                "next_action_required": "Receive municipal fire NOC within 15 calendar days",
                "is_escalated": False
            },
            {
                "id": "AICTE/PGRC/2026/015",
                "permanent_id": "1-3948572619",
                "complainant_name": "Women Students Collective",
                "complainant_type": "Student",
                "title": "Non-Functional Internal Complaints Committee (ICC)",
                "description": "Deccan Academy does not have an active or properly constituted ICC under the POSH Act, and student complaints are systematically discouraged.",
                "category": "Harassment",
                "priority": "Critical",
                "status": "Under Process",
                "assigned_bureau": "PGRC",
                "officer": "pgrc_officer",
                "received_days_ago": 19,
                "disposal_days_left": 2,  # Approaching deadline
                "last_action": "Summons issued to ICC presiding officer",
                "next_action_required": "Conduct closed-door hearing with representatives",
                "is_escalated": False
            },
            {
                "id": "AICTE/FINANCE_BUREAU/2026/016",
                "permanent_id": "1-5829104839",
                "complainant_name": "Internal Audit Cell",
                "complainant_type": "Public",
                "title": "Diversion of AICTE Special Research Grant (MODROBS)",
                "description": "Grant funds worth Rs. 18.5 Lakhs allocated for Modernization and Removal of Obsolescence in Robotics Lab was diverted to general maintenance expenditures.",
                "category": "Admission Irregularity",
                "priority": "High",
                "status": "Under Process",
                "assigned_bureau": "FINANCE_BUREAU",
                "officer": "superadmin",
                "received_days_ago": 35,
                "disposal_days_left": -5,  # Overdue
                "last_action": "Bank statements and utilization certificates requisitioned",
                "next_action_required": "Issue recovery notice and seek physical verification",
                "is_escalated": True,
                "escalation_reason": "Failure to furnish utilization records within 30 days."
            },
            {
                "id": "AICTE/PGRC/2026/017",
                "permanent_id": "1-7829103948",
                "complainant_name": "Hostel Residents Union",
                "complainant_type": "Student",
                "title": "Unhygienic Drinking Water and Mess Conditions",
                "description": "Multiple students hospitalized with gastroenteritis due to contaminated water supply and uncertified mess vendors at Malabar Ocean College.",
                "category": "Infrastructure Deficit",
                "priority": "High",
                "status": "Disposed",
                "assigned_bureau": "PGRC",
                "officer": "pgrc_officer",
                "received_days_ago": 40,
                "disposal_days_left": -10,
                "last_action": "FSSAI inspection conducted; RO plant replaced; compliance approved",
                "next_action_required": "Matter resolved",
                "is_escalated": False
            },
            {
                "id": "AICTE/RB/2026/018",
                "permanent_id": "1-6719283745",
                "complainant_name": "Himachal Environmental Watch",
                "complainant_type": "Public",
                "title": "Encroachment on Forest Land for Unapproved Sports Complex",
                "description": "Himalayan Valley Institute constructing athletic grounds on demarcated eco-sensitive forest land without state pollution and clearance approvals.",
                "category": "Infrastructure Deficit",
                "priority": "Medium",
                "status": "Pending Review",
                "assigned_bureau": "RB",
                "officer": "rb_officer",
                "received_days_ago": 8,
                "disposal_days_left": 22,
                "last_action": "Notice dispatched to institution trust",
                "next_action_required": "Await survey report from state forest department",
                "is_escalated": False
            },
            {
                "id": "AICTE/PGRC/2026/019",
                "permanent_id": "1-8930192837",
                "complainant_name": "SC/ST Student Welfare Association",
                "complainant_type": "Student",
                "title": "Withholding Post-Matric Scholarship Funds",
                "description": "Greenfield Polytechnic received direct scholarship credit from government welfare board but has refused to disburse living stipend to eligible students.",
                "category": "Fee Overcharging",
                "priority": "Critical",
                "status": "Under Process",
                "assigned_bureau": "PGRC",
                "officer": "pgrc_officer",
                "received_days_ago": 16,
                "disposal_days_left": 14,
                "last_action": "Joint hearing scheduled with district social welfare officer",
                "next_action_required": "Inspect scholarship disbursement ledger",
                "is_escalated": False
            },
            {
                "id": "AICTE/APPROVAL_BUREAU/2026/020",
                "permanent_id": "1-1029384751",
                "complainant_name": "Apex Educational Foundation",
                "complainant_type": "Institution",
                "title": "Application for Launch of Integrated MBA Program",
                "description": "Institutional application seeking approval to introduce 5-year integrated BBA-MBA program with 60 seats.",
                "category": "Unapproved Courses",
                "priority": "High",
                "status": "Under Process",
                "assigned_bureau": "APPROVAL_BUREAU",
                "officer": "approval_officer",
                "received_days_ago": 11,
                "disposal_days_left": 19,
                "last_action": "Pending scrutiny against Regulation Bureau compliance blacklist",
                "next_action_required": "Hold approval until RB unapproved expansion case 002 is cleared",
                "is_escalated": False
            },
            {
                "id": "AICTE/RB/2026/021",
                "permanent_id": "1-4829103847",
                "complainant_name": "Former Lab Technician",
                "complainant_type": "Faculty",
                "title": "Disposal of Biohazard Waste Without Mandatory Autoclaving",
                "description": "Saraswati Institute dumping medical microbiology agar cultures in public municipality bins without treatment.",
                "category": "Infrastructure Deficit",
                "priority": "High",
                "status": "Pending Review",
                "assigned_bureau": "RB",
                "officer": "rb_officer",
                "received_days_ago": 4,
                "disposal_days_left": 26,
                "last_action": "State Pollution Control Board notified",
                "next_action_required": "Schedule joint bio-waste inspection",
                "is_escalated": False
            },
            {
                "id": "AICTE/PGRC/2026/022",
                "permanent_id": "1-5829104839",
                "complainant_name": "MBA 2nd Year Representatives",
                "complainant_type": "Student",
                "title": "Arbitrary Penalty Fines Levied for Minor Attendance Shortfall",
                "description": "Kalinga Institute charging Rs. 500 per missed lecture from students having medical certificates.",
                "category": "Fee Overcharging",
                "priority": "Medium",
                "status": "Disposed",
                "assigned_bureau": "PGRC",
                "officer": "pgrc_officer",
                "received_days_ago": 50,
                "disposal_days_left": -20,
                "last_action": "College issued circular rescinding attendance penalties and refunded charges",
                "next_action_required": "Closed",
                "is_escalated": False
            },
            {
                "id": "AICTE/RB/2026/023",
                "permanent_id": "1-7829103948",
                "complainant_name": "District Maritime Inspector",
                "complainant_type": "Public",
                "title": "Outdated Lifeboat and Safety Navigation Mock Equipment",
                "description": "Marine Engineering simulator fails Directorate General of Shipping compliance checklist.",
                "category": "Infrastructure Deficit",
                "priority": "Medium",
                "status": "Received",
                "assigned_bureau": "RB",
                "officer": "rb_officer",
                "received_days_ago": 2,
                "disposal_days_left": 28,
                "last_action": "Inspection report registered in Sentinel",
                "next_action_required": "Forward checklist to college for clarification",
                "is_escalated": False
            },
            {
                "id": "AICTE/FINANCE_BUREAU/2026/024",
                "permanent_id": "1-8930192837",
                "complainant_name": "Regional PF Commissioner",
                "complainant_type": "Public",
                "title": "Non-Remittance of Employee Provident Fund (EPF)",
                "description": "Greenfield Polytechnic deducted EPF from 80 employees but failed to deposit Rs. 32 Lakhs with the EPFO.",
                "category": "Faculty Exploitation",
                "priority": "High",
                "status": "Under Process",
                "assigned_bureau": "FINANCE_BUREAU",
                "officer": "superadmin",
                "received_days_ago": 20,
                "disposal_days_left": 10,
                "last_action": "Summons issued to trust treasurer",
                "next_action_required": "Verify challan deposits for financial year 2025-26",
                "is_escalated": False
            },
            {
                "id": "AICTE/PGRC/2026/025",
                "permanent_id": "1-2049583726",
                "complainant_name": "Hostel Advisory Committee",
                "complainant_type": "Student",
                "title": "Unwarranted Security Curfew Restrictions on Girl Students",
                "description": "Discriminatory 6 PM hostel curfew imposed exclusively on female engineering scholars while boys have open campus access.",
                "category": "Harassment",
                "priority": "Medium",
                "status": "Under Process",
                "assigned_bureau": "PGRC",
                "officer": "pgrc_officer",
                "received_days_ago": 9,
                "disposal_days_left": 21,
                "last_action": "College asked to equalize hostel guidelines under AICTE gender sensitization norms",
                "next_action_required": "Receive revised hostel rulebook",
                "is_escalated": False
            }
        ]

        for cd in cases_data:
            inst = inst_map[cd["permanent_id"]]
            officer = users_map.get(cd.get("officer"))
            rec_date = today - timedelta(days=cd["received_days_ago"])
            disp_date = today + timedelta(days=cd["disposal_days_left"])

            case = Case(
                id=cd["id"],
                institution_id=inst.id,
                complainant_name=cd["complainant_name"],
                complainant_type=cd["complainant_type"],
                title=cd["title"],
                description=cd["description"],
                category=cd["category"],
                priority=cd["priority"],
                status=cd["status"],
                assigned_bureau=cd["assigned_bureau"],
                assigned_officer_id=officer.id if officer else None,
                received_date=rec_date,
                expected_disposal_date=disp_date,
                last_action=cd["last_action"],
                next_action_required=cd["next_action_required"],
                is_escalated=cd["is_escalated"],
                escalation_reason=cd.get("escalation_reason")
            )
            db.add(case)
            db.commit()

            # Add initial history
            hist = CaseHistory(
                case_id=case.id,
                actor_username=officer.username if officer else "system",
                action_type="CREATED",
                new_status=case.status,
                new_bureau=case.assigned_bureau,
                remarks=f"Initial complaint lodging and allocation to {case.assigned_bureau}.",
                timestamp=datetime.now(timezone.utc) - timedelta(days=cd["received_days_ago"])
            )
            db.add(hist)

            if case.status in ["Under Process", "Escalated", "Disposed", "Transferred"]:
                hist2 = CaseHistory(
                    case_id=case.id,
                    actor_username=officer.username if officer else "system",
                    action_type="STATUS_CHANGE",
                    previous_status="Received",
                    new_status=case.status,
                    remarks=cd["last_action"],
                    timestamp=datetime.now(timezone.utc) - timedelta(days=max(1, cd["received_days_ago"] // 2))
                )
                db.add(hist2)
            db.commit()

        # -------------------------------------------------------------
        # 4. SEED CROSS-BUREAU RELATIONSHIPS & ALERTS
        # -------------------------------------------------------------
        # Scenario A: Apex Institute (RB 002 vs PGRC 001) -> ACTION_CONFLICT & COORDINATION_RECOMMENDED
        apex_inst = inst_map["1-1029384751"]
        rel_apex = CaseRelationship(
            case_id_1="AICTE/PGRC/2026/001",
            case_id_2="AICTE/RB/2026/002",
            institution_id=apex_inst.id,
            relationship_type="ACTION_CONFLICT",
            similarity_score=0.88,
            matching_signals=json.dumps([
                "AICTE Permanent Institution ID Exact Match: 1-1029384751 (Apex Institute of Technology & Management)",
                "Domain-Related Categories: 'Fee Overcharging' & 'Unapproved Courses'",
                "Cross-Bureau Dispersion: Handled simultaneously by PGRC and RB",
                "Potential Action Conflict: Concurrent independent regulatory/grievance inquiries on the same institution without inter-bureau coordination."
            ]),
            status="DETECTED",
            explanation="Detected Action Conflict with correlation score 0.88. Key signals: Same AICTE Permanent ID 1-1029384751; Regulation Bureau is pursuing unapproved expansion penalties while PGRC is independently hearing student fee overcharging grievances without inter-bureau alignment.",
            recommended_action="Immediate Inter-Bureau Coordination Required: Align Regulation Bureau compliance findings with PGRC proceedings to avoid conflicting orders.",
            created_at=datetime.now(timezone.utc) - timedelta(days=15)
        )
        db.add(rel_apex)

        # Scenario B: Bharatiya College (PGRC 003 vs PGRC 004) -> POTENTIAL_DUPLICATE
        bharat_inst = inst_map["1-2049583726"]
        rel_bharat = CaseRelationship(
            case_id_1="AICTE/PGRC/2026/003",
            case_id_2="AICTE/PGRC/2026/004",
            institution_id=bharat_inst.id,
            relationship_type="POTENTIAL_DUPLICATE",
            similarity_score=0.96,
            matching_signals=json.dumps([
                "AICTE Permanent Institution ID Exact Match: 1-2049583726 (Bharatiya College of Engineering & Research)",
                "Identical Complaint Category: 'Fee Overcharging'",
                "High Complaint Content Similarity: 94.5%",
                "Shared Evidence & Complainant Link: Aman Shinde and Parent S. Shinde"
            ]),
            status="DETECTED",
            explanation="Detected Potential Duplicate with correlation score 0.96. Identical complaint text concerning caution deposit refund and retained certificates filed by student and parent separately.",
            recommended_action="Review for duplicate filing. Verify complainant identities and consider consolidating.",
            created_at=datetime.now(timezone.utc) - timedelta(days=4)
        )
        db.add(rel_bharat)

        # Scenario C: Deccan Academy (RB 005 vs APPROVAL 006) -> COORDINATION_RECOMMENDED
        deccan_inst = inst_map["1-3948572619"]
        rel_deccan = CaseRelationship(
            case_id_1="AICTE/RB/2026/005",
            case_id_2="AICTE/APPROVAL_BUREAU/2026/006",
            institution_id=deccan_inst.id,
            relationship_type="COORDINATION_RECOMMENDED",
            similarity_score=0.74,
            matching_signals=json.dumps([
                "AICTE Permanent Institution ID Exact Match: 1-3948572619 (Deccan Academy of Higher Technical Studies)",
                "Cross-Bureau Critical Conflict: Approval Bureau processing expansion proposal while Regulation Bureau has an active inquiry into ghost faculty affidavits."
            ]),
            status="CONFIRMED_RELATED",
            explanation="Confirmed Related: Approval Bureau must withhold seat expansion decision pending final order on ghost faculty fraud from Regulation Bureau.",
            recommended_action="Place hold on seat expansion until RB sub-committee submits final disposal order.",
            reviewed_by="rb_head",
            review_decision_reason="Confirmed in joint bureau briefing on 2026-10-18.",
            reviewed_at=datetime.now(timezone.utc) - timedelta(days=10),
            created_at=datetime.now(timezone.utc) - timedelta(days=12)
        )
        db.add(rel_deccan)
        db.commit()

        # -------------------------------------------------------------
        # 5. SEED COORDINATION TASKS
        # -------------------------------------------------------------
        coord_task_1 = CoordinationTask(
            id="COORD-2026-001",
            title="Joint Compliance & Fee Grievance Inspection - Apex Institute",
            description="Harmonize Regulation Bureau inspection findings regarding basement classrooms with PGRC inquiry on student fee levies. Determine whether illegal fee collection was used to finance unapproved building expansion.",
            institution_id=apex_inst.id,
            primary_case_id="AICTE/PGRC/2026/001",
            related_case_ids=json.dumps(["AICTE/RB/2026/002", "AICTE/PGRC/2026/013"]),
            originating_bureau="PGRC",
            participating_bureaus=json.dumps(["PGRC", "RB"]),
            assigned_owner_id=users_map["rb_head"].id,
            created_by_id=users_map["pgrc_head"].id,
            priority="Critical",
            status="In Progress",
            due_date=today + timedelta(days=7),
            resolution_notes="Joint hearing scheduled for 2026-11-04 with Chairman of Apex Trust."
        )
        db.add(coord_task_1)
        db.commit()

        upd1 = CoordinationUpdate(
            task_id=coord_task_1.id,
            user_id=users_map["pgrc_head"].id,
            username=users_map["pgrc_head"].username,
            update_type="COMMENT",
            remarks="Task established following Cross-Bureau overlap detection. Assigned to RB Head for joint evidence alignment.",
            timestamp=datetime.now(timezone.utc) - timedelta(days=10)
        )
        upd2 = CoordinationUpdate(
            task_id=coord_task_1.id,
            user_id=users_map["rb_head"].id,
            username=users_map["rb_head"].username,
            update_type="STATUS_CHANGE",
            remarks="Accepted coordination responsibility. Merged Expert Committee inspection findings with student fee ledger.",
            timestamp=datetime.now(timezone.utc) - timedelta(days=5)
        )
        db.add(upd1)
        db.add(upd2)

        coord_task_2 = CoordinationTask(
            id="COORD-2026-002",
            title="Approval Bureau Hold on AI Division - Deccan Academy",
            description="Prevent automatic EOA seat sanction for Artificial Intelligence branch until Regulation Bureau clears pending ghost faculty charges.",
            institution_id=deccan_inst.id,
            primary_case_id="AICTE/APPROVAL_BUREAU/2026/006",
            related_case_ids=json.dumps(["AICTE/RB/2026/005"]),
            originating_bureau="RB",
            participating_bureaus=json.dumps(["RB", "APPROVAL_BUREAU"]),
            assigned_owner_id=users_map["approval_officer"].id,
            created_by_id=users_map["rb_head"].id,
            priority="High",
            status="Resolved",
            due_date=today - timedelta(days=2),
            resolution_notes="Seat expansion officially kept in abeyance via executive order dated 2026-10-22."
        )
        db.add(coord_task_2)
        db.commit()

        upd3 = CoordinationUpdate(
            task_id=coord_task_2.id,
            user_id=users_map["approval_officer"].id,
            username=users_map["approval_officer"].username,
            update_type="STATUS_CHANGE",
            remarks="Approval application marked on regulatory hold in national portal.",
            timestamp=datetime.now(timezone.utc) - timedelta(days=3)
        )
        db.add(upd3)
        db.commit()

        # -------------------------------------------------------------
        # 6. SEED NOTIFICATIONS
        # -------------------------------------------------------------
        notifs_data = [
            ("RB", "Critical Cross-Bureau Alert: Apex Institute", "Potential Action Conflict detected between Case AICTE/RB/2026/002 and Case AICTE/PGRC/2026/001. Coordination recommended.", "ACTION_CONFLICT", "/intelligence?rel_id=1"),
            ("PGRC", "Critical Cross-Bureau Alert: Apex Institute", "Potential Action Conflict detected between Case AICTE/PGRC/2026/001 and Regulation Bureau. Joint coordination required.", "ACTION_CONFLICT", "/intelligence?rel_id=1"),
            ("PGRC", "Duplicate Case Alert: Bharatiya College", "Case AICTE/PGRC/2026/004 has 96% match with existing Case 003. Review candidate.", "OVERLAP_DETECTED", "/intelligence?rel_id=2"),
            ("RB", "SLA Escalation Alert: Case AICTE/RB/2026/005", "Deccan Academy case has exceeded the statutory 30-day investigation SLA. Auto-escalated to Bureau Head.", "ESCALATION", "/cases/AICTE/RB/2026/005"),
            ("RB", "Approaching Deadline: Case AICTE/RB/2026/007", "Saraswati Institute lab compliance review is due in 3 days.", "DEADLINE_APPROACHING", "/cases/AICTE/RB/2026/007"),
            ("PGRC", "Approaching Deadline: Case AICTE/PGRC/2026/015", "Deccan Academy ICC inquiry due in 2 days.", "DEADLINE_APPROACHING", "/cases/AICTE/PGRC/2026/015"),
        ]

        for bureau, title, msg, n_type, link in notifs_data:
            notif = Notification(
                bureau=bureau,
                title=title,
                message=msg,
                notification_type=n_type,
                link=link,
                is_read=False,
                created_at=datetime.now(timezone.utc) - timedelta(hours=2)
            )
            db.add(notif)
        db.commit()

        # -------------------------------------------------------------
        # 7. SEED CRYPTOGRAPHIC HASH-LINKED AUDIT TRAIL
        # -------------------------------------------------------------
        # We build a sequential chain from GENESIS_HASH
        prev_hash = GENESIS_HASH
        audit_events_data = [
            ("SYSTEM", "SYSTEM", "SYSTEM_GENESIS_INITIALIZED", "System", "ROOT", {"info": "AICTE Sentinel Security Ledger initialized with SHA-256 genesis block"}, "Genesis Anchor"),
            ("superadmin", "SUPER_ADMIN", "INSTITUTIONS_INITIALIZED", "Institution", "8_RECORDS", {"count": 8, "regions": ["North", "South", "East", "West", "Central", "North-West"]}, "Seed configuration"),
            ("pgrc_officer", "BUREAU_OFFICER", "CASE_CREATED", "Case", "AICTE/PGRC/2026/001", {"title": "Arbitrary Tuition Hike and Building Fund", "bureau": "PGRC"}, "New student grievance"),
            ("rb_officer", "BUREAU_OFFICER", "CASE_CREATED", "Case", "AICTE/RB/2026/002", {"title": "Unapproved Intake Expansion", "bureau": "RB"}, "Confidential faculty whistleblow"),
            ("SYSTEM", "SYSTEM", "CROSS_BUREAU_MATCH_DETECTED", "CaseRelationship", "1", {"case_1": "AICTE/PGRC/2026/001", "case_2": "AICTE/RB/2026/002", "type": "ACTION_CONFLICT", "score": 0.88}, "Autonomous Sentinel Intelligence Engine"),
            ("pgrc_head", "BUREAU_HEAD", "COORDINATION_TASK_CREATED", "CoordinationTask", "COORD-2026-001", {"task_id": "COORD-2026-001", "assigned_owner": "rb_head"}, "Inter-bureau coordination initiated"),
            ("rb_head", "BUREAU_HEAD", "COORDINATION_TASK_UPDATED", "CoordinationTask", "COORD-2026-001", {"status": "In Progress", "notes": "Accepted coordination responsibility"}, "Joint hearing prep"),
            ("SYSTEM_SLA_ENGINE", "SYSTEM", "SLA_AUTO_ESCALATED", "Case", "AICTE/RB/2026/005", {"overdue_days": 12, "reason": "Investigation delayed beyond statutory limit"}, "SLA compliance breach")
        ]

        for i, (actor, role, action, entity_type, entity_id, details, reason) in enumerate(audit_events_data):
            ev_uuid = f"00000000-0000-0000-0000-{str(i+1).zfill(12)}"
            ev_time = datetime.now(timezone.utc) - timedelta(days=20 - (i * 2))
            payload = {
                "event_uuid": ev_uuid,
                "actor_username": actor,
                "actor_role": role,
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "timestamp": ev_time.isoformat(),
                "details": details,
                "reason": reason
            }
            canonical_str = canonical_serialize(payload)
            curr_hash = compute_event_hash(prev_hash, canonical_str)

            audit_ev = AuditEvent(
                event_uuid=ev_uuid,
                actor_username=actor,
                actor_role=role,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                timestamp=ev_time,
                details=canonical_str,
                reason=reason,
                previous_event_hash=prev_hash,
                event_hash=curr_hash
            )
            db.add(audit_ev)
            db.commit()
            prev_hash = curr_hash

        print("Demonstration data seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

def seed_database_if_empty():
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            seed_database(force_reset=False)
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    force = "--reset" in sys.argv
    seed_database(force_reset=force)
