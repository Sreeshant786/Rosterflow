from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from app.models.employee import Employee, Pod
from app.models.brand import Brand, Process
from app.models.assignment import EmployeeAssignment
from app.models.operating_rule import OperatingRule
from app.models.availability import EmployeeAvailability, LeaveRequest, PublicHoliday

def seed_database(db: Session, force: bool = False):
    """
    Populates the database with a rich, realistic workforce dataset:
    - 32 Employees with realistic Indian names and designations
    - 4 Operational Pods with assigned Pod Leads
    - 15 D2C Brands (80% single-resource dedicated, 20% multi-resource)
    - 5 Core Operational Processes
    - Comprehensive operating calendars and rules
    - Public Holidays, Planned Leaves, Comp-Offs, and Unavailability records
    """
    if not force and db.query(Employee).count() >= 30:
        return {"status": "already_seeded", "message": "Database already populated with seed data."}

    # 1. Clear existing reference data if forcing
    if force:
        db.query(EmployeeAssignment).delete()
        db.query(OperatingRule).delete()
        db.query(EmployeeAvailability).delete()
        db.query(LeaveRequest).delete()
        db.query(PublicHoliday).delete()
        db.query(Pod).delete()
        db.query(Employee).delete()
        db.query(Brand).delete()
        db.query(Process).delete()
        db.flush()

    # 2. Seed 4 Operational Pods
    pods_data = [
        {"pod_name": "Alpha Pod", "description": "High-velocity D2C brand operations & rapid escalation desk"},
        {"pod_name": "Beta Pod", "description": "Retention, loyalty, and customer lifetime value desk"},
        {"pod_name": "Gamma Pod", "description": "Conversion optimization, abandoned cart, and logistics desk"},
        {"pod_name": "Delta Pod", "description": "Specialized enterprise & multi-category operations"},
    ]
    pod_objs = {}
    for p in pods_data:
        obj = Pod(pod_name=p["pod_name"], description=p["description"])
        db.add(obj)
        db.flush()
        pod_objs[p["pod_name"]] = obj

    # 3. Seed 5 Core Operational Processes
    processes_data = [
        {"process_name": "Customer Support (CS)", "description": "Real-time query resolution across chat, email, and phone"},
        {"process_name": "Abandoned Cart Conversion (ACC)", "description": "Omnichannel cart recovery campaigns and proactive outreach"},
        {"process_name": "Retention", "description": "Repeat purchase engagement, VIP subscriptions, and NPS management"},
        {"process_name": "Non-Delivery Report (NDR)", "description": "RTO reduction, address verification, and delivery re-attempts"},
        {"process_name": "Other Operations", "description": "Catalog audits, marketplace sync, and inventory escalation"},
    ]
    proc_objs = {}
    for pr in processes_data:
        obj = Process(process_name=pr["process_name"], description=pr["description"])
        db.add(obj)
        db.flush()
        proc_objs[pr["process_name"]] = obj

    # 4. Seed 32 Realistic Indian Employees
    # We assign distinct preferred weekly offs and pods
    employees_data = [
        # Pod Leads
        ("EMP001", "Rahul Sharma", "rahul.sharma@datastraw.io", "Alpha Pod", "Operations Lead", 6, date(2023, 1, 15)),
        ("EMP002", "Priya Nair", "priya.nair@datastraw.io", "Beta Pod", "Operations Lead", 6, date(2023, 2, 1)),
        ("EMP003", "Vikram Malhotra", "vikram.malhotra@datastraw.io", "Gamma Pod", "Operations Lead", 6, date(2023, 3, 10)),
        ("EMP004", "Ananya Iyer", "ananya.iyer@datastraw.io", "Delta Pod", "Operations Lead", 6, date(2023, 1, 20)),

        # Alpha Pod Members
        ("EMP005", "Arjun Patel", "arjun.patel@datastraw.io", "Alpha Pod", "Senior Operations Associate", 6, date(2023, 4, 5)),
        ("EMP006", "Sneha Rao", "sneha.rao@datastraw.io", "Alpha Pod", "Operations Specialist", 0, date(2023, 5, 12)), # Monday off
        ("EMP007", "Rohan Gupta", "rohan.gupta@datastraw.io", "Alpha Pod", "Operations Associate", 6, date(2023, 6, 18)),
        ("EMP008", "Kavya Menon", "kavya.menon@datastraw.io", "Alpha Pod", "Customer Support Specialist", 5, date(2023, 7, 22)), # Saturday off
        ("EMP009", "Aditya Verma", "aditya.verma@datastraw.io", "Alpha Pod", "Operations Associate", 6, date(2023, 8, 1)),
        ("EMP010", "Meera Joshi", "meera.joshi@datastraw.io", "Alpha Pod", "Operations Associate", 6, date(2023, 8, 15)),
        ("EMP011", "Karan Singhania", "karan.singhania@datastraw.io", "Alpha Pod", "Support Executive", 0, date(2023, 9, 1)),

        # Beta Pod Members
        ("EMP012", "Divya Deshmukh", "divya.deshmukh@datastraw.io", "Beta Pod", "Senior Retention Specialist", 6, date(2023, 4, 15)),
        ("EMP013", "Siddharth Sen", "siddharth.sen@datastraw.io", "Beta Pod", "Retention Associate", 6, date(2023, 5, 20)),
        ("EMP014", "Pooja Hegde", "pooja.hegde@datastraw.io", "Beta Pod", "Customer Experience Executive", 5, date(2023, 6, 25)),
        ("EMP015", "Amitabh Roy", "amitabh.roy@datastraw.io", "Beta Pod", "Retention Specialist", 6, date(2023, 7, 10)),
        ("EMP016", "Ishita Banerjee", "ishita.banerjee@datastraw.io", "Beta Pod", "Retention Associate", 0, date(2023, 8, 12)),
        ("EMP017", "Gaurav Kulkarni", "gaurav.kulkarni@datastraw.io", "Beta Pod", "Operations Specialist", 6, date(2023, 9, 5)),
        ("EMP018", "Tanvi Bhat", "tanvi.bhat@datastraw.io", "Beta Pod", "Operations Associate", 6, date(2023, 9, 20)),

        # Gamma Pod Members
        ("EMP019", "Nikhil Chopra", "nikhil.chopra@datastraw.io", "Gamma Pod", "Senior NDR Specialist", 6, date(2023, 4, 10)),
        ("EMP020", "Ritu Saxena", "ritu.saxena@datastraw.io", "Gamma Pod", "Cart Recovery Specialist", 0, date(2023, 5, 14)),
        ("EMP021", "Varun Nambiar", "varun.nambiar@datastraw.io", "Gamma Pod", "Logistics Operations Associate", 6, date(2023, 6, 1)),
        ("EMP022", "Swati Reddy", "swati.reddy@datastraw.io", "Gamma Pod", "Conversion Associate", 5, date(2023, 7, 15)),
        ("EMP023", "Harsh Vardhan", "harsh.vardhan@datastraw.io", "Gamma Pod", "Operations Associate", 6, date(2023, 8, 20)),
        ("EMP024", "Deepika Pillai", "deepika.pillai@datastraw.io", "Gamma Pod", "Operations Associate", 6, date(2023, 9, 10)),
        ("EMP025", "Manish Tiwari", "manish.tiwari@datastraw.io", "Gamma Pod", "Support Executive", 0, date(2023, 10, 1)),

        # Delta Pod Members
        ("EMP026", "Neha Kapoor", "neha.kapoor@datastraw.io", "Delta Pod", "Senior Operations Associate", 6, date(2023, 3, 15)),
        ("EMP027", "Rajesh Pillai", "rajesh.pillai@datastraw.io", "Delta Pod", "Operations Associate", 6, date(2023, 4, 18)),
        ("EMP028", "Shreya Mukherjee", "shreya.mukherjee@datastraw.io", "Delta Pod", "Operations Specialist", 5, date(2023, 5, 22)),
        ("EMP029", "Abhishek Yadav", "abhishek.yadav@datastraw.io", "Delta Pod", "Operations Associate", 6, date(2023, 6, 30)),
        ("EMP030", "Bhavna Mishra", "bhavna.mishra@datastraw.io", "Delta Pod", "Customer Support Executive", 0, date(2023, 7, 12)),
        ("EMP031", "Tarun Khanna", "tarun.khanna@datastraw.io", "Delta Pod", "Operations Associate", 6, date(2023, 8, 25)),
        ("EMP032", "Zoya Farooqui", "zoya.farooqui@datastraw.io", "Delta Pod", "Operations Associate", 6, date(2023, 9, 15)),
    ]

    emp_objs = {}
    for code, name, email, pod_name, desig, pref_off, j_date in employees_data:
        emp = Employee(
            employee_code=code,
            full_name=name,
            email=email,
            pod_id=pod_objs[pod_name].id,
            designation=desig,
            active_status=True,
            joining_date=j_date,
            preferred_weekly_off=pref_off,
            max_consecutive_days=6
        )
        db.add(emp)
        db.flush()
        emp_objs[code] = emp

    # Set Pod Leads
    pod_objs["Alpha Pod"].pod_lead_id = emp_objs["EMP001"].id
    pod_objs["Beta Pod"].pod_lead_id = emp_objs["EMP002"].id
    pod_objs["Gamma Pod"].pod_lead_id = emp_objs["EMP003"].id
    pod_objs["Delta Pod"].pod_lead_id = emp_objs["EMP004"].id
    db.flush()

    # 5. Seed 15 D2C Brands
    # 12 Brands (80%) are SINGLE-RESOURCE brands (1 dedicated employee handling all brand processes)
    # 3 Brands (20%) are MULTI-RESOURCE brands (2-3 employees handling different processes)
    brands_data = [
        # Multi-resource brands (3 brands)
        ("Bombay Shaving Co.", "Premium grooming and personal care products", False),
        ("The Whole Truth", "Clean label protein bars and natural foods", False),
        ("Wakefit Home", "Ergonomic mattresses and contemporary furniture", False),

        # Single-resource brands (12 brands)
        ("Kalyan Organics", "Farm-fresh certified organic cold-pressed oils", True),
        ("Zouk Lifestyle", "Cruelty-free vegan bags and handcrafted footwear", True),
        ("Snackible India", "Healthy premium snacking and guilt-free munchies", True),
        ("Mocobara Gear", "Design-centric premium luggage and travel bags", True),
        ("Slurrp Farm", "Nutritious millet-based food for children and families", True),
        ("Foxtale Skincare", "Efficacious dermatological skincare essentials", True),
        ("Open Secret", "Zero-junk cookies and un-junked pantry favorites", True),
        ("Kapiva Ayurveda", "Modern Ayurvedic wellness juices and nutrition", True),
        ("True Elements", "100% whole grain breakfast cereals and roasted seeds", True),
        ("Beco Eco", "Eco-friendly, biodegradable bamboo home care essentials", True),
        ("Plum Goodness", "100% vegan beauty and toxin-free skincare", True),
        ("SkinKraft", "Customized personalized skin and hair care regimens", True),
    ]

    brand_objs = {}
    single_res_brands = []
    multi_res_brands = []

    for name, desc, is_single in brands_data:
        b = Brand(brand_name=name, description=desc, active_status=True)
        db.add(b)
        db.flush()
        brand_objs[name] = b
        if is_single:
            single_res_brands.append(name)
        else:
            multi_res_brands.append(name)

    # 6. Seed Operating Rules & Employee Assignments
    # Dedicated single-resource assignments (12 brands -> 1 dedicated employee each)
    single_res_emp_mapping = [
        ("Kalyan Organics", "EMP005"),     # Arjun Patel (Scenario 1 spotlight!)
        ("Zouk Lifestyle", "EMP006"),      # Sneha Rao
        ("Snackible India", "EMP007"),     # Rohan Gupta
        ("Mocobara Gear", "EMP009"),       # Aditya Verma
        ("Slurrp Farm", "EMP010"),         # Meera Joshi
        ("Foxtale Skincare", "EMP013"),    # Siddharth Sen
        ("Open Secret", "EMP015"),         # Amitabh Roy
        ("Kapiva Ayurveda", "EMP017"),     # Gaurav Kulkarni
        ("True Elements", "EMP021"),       # Varun Nambiar
        ("Beco Eco", "EMP023"),            # Harsh Vardhan
        ("Plum Goodness", "EMP027"),       # Rajesh Pillai
        ("SkinKraft", "EMP029"),           # Abhishek Yadav
    ]

    for brand_name, emp_code in single_res_emp_mapping:
        b = brand_objs[brand_name]
        e = emp_objs[emp_code]

        # Single dedicated employee handles the brand's primary process: Customer Support
        pr = proc_objs["Customer Support (CS)"]
        db.add(EmployeeAssignment(
            employee_id=e.id,
            brand_id=b.id,
            process_id=pr.id,
            assignment_status="active",
            is_primary=True
        ))

        # Operating rule for single-resource brand: EVERYDAY (requires 1 staff)
        db.add(OperatingRule(
            brand_id=b.id,
            process_id=pr.id,
            operating_type="EVERYDAY",
            sunday_off=False,
            public_holiday_off=False,
            minimum_staff_required=1,
            applicable_days="0,1,2,3,4,5,6",
            shift_start="09:00",
            shift_end="18:00"
        ))

    # Multi-Resource Brands (3 brands)
    # Scenario 2: Bombay Shaving Co. (Three distinct employees handle CS, ACC, and NDR respectively)
    bsc = brand_objs["Bombay Shaving Co."]
    db.add(EmployeeAssignment(employee_id=emp_objs["EMP008"].id, brand_id=bsc.id, process_id=proc_objs["Customer Support (CS)"].id, assignment_status="active", is_primary=True))
    db.add(EmployeeAssignment(employee_id=emp_objs["EMP020"].id, brand_id=bsc.id, process_id=proc_objs["Abandoned Cart Conversion (ACC)"].id, assignment_status="active", is_primary=True))
    db.add(EmployeeAssignment(employee_id=emp_objs["EMP019"].id, brand_id=bsc.id, process_id=proc_objs["Non-Delivery Report (NDR)"].id, assignment_status="active", is_primary=True))

    db.add(OperatingRule(brand_id=bsc.id, process_id=proc_objs["Customer Support (CS)"].id, operating_type="EVERYDAY", minimum_staff_required=1, applicable_days="0,1,2,3,4,5,6", shift_start="09:00", shift_end="18:00"))
    db.add(OperatingRule(brand_id=bsc.id, process_id=proc_objs["Abandoned Cart Conversion (ACC)"].id, operating_type="EVERYDAY_EXCEPT_HOLIDAYS", minimum_staff_required=1, applicable_days="0,1,2,3,4,5,6", shift_start="10:00", shift_end="19:00"))
    db.add(OperatingRule(brand_id=bsc.id, process_id=proc_objs["Non-Delivery Report (NDR)"].id, operating_type="SUNDAYS_AND_HOLIDAYS_OFF", minimum_staff_required=1, applicable_days="0,1,2,3,4,5", shift_start="09:30", shift_end="18:30"))

    # Scenario 3: The Whole Truth (Shared Process: 2 employees share Customer Support; plus 1 for Retention)
    twt = brand_objs["The Whole Truth"]
    # Shared CS: EMP011 & EMP014 share Customer Support
    db.add(EmployeeAssignment(employee_id=emp_objs["EMP011"].id, brand_id=twt.id, process_id=proc_objs["Customer Support (CS)"].id, assignment_status="active", is_primary=True))
    db.add(EmployeeAssignment(employee_id=emp_objs["EMP014"].id, brand_id=twt.id, process_id=proc_objs["Customer Support (CS)"].id, assignment_status="active", is_primary=True))
    # Retention handled by EMP012
    db.add(EmployeeAssignment(employee_id=emp_objs["EMP012"].id, brand_id=twt.id, process_id=proc_objs["Retention"].id, assignment_status="active", is_primary=True))

    db.add(OperatingRule(brand_id=twt.id, process_id=proc_objs["Customer Support (CS)"].id, operating_type="EVERYDAY", minimum_staff_required=1, applicable_days="0,1,2,3,4,5,6", shift_start="09:00", shift_end="18:00"))
    db.add(OperatingRule(brand_id=twt.id, process_id=proc_objs["Retention"].id, operating_type="SUNDAYS_AND_HOLIDAYS_OFF", minimum_staff_required=1, applicable_days="0,1,2,3,4,5", shift_start="10:00", shift_end="19:00"))

    # Wakefit Home: Multi-staffing (CS requires 2 staff members, Retention requires 1)
    wf = brand_objs["Wakefit Home"]
    db.add(EmployeeAssignment(employee_id=emp_objs["EMP026"].id, brand_id=wf.id, process_id=proc_objs["Customer Support (CS)"].id, assignment_status="active", is_primary=True))
    db.add(EmployeeAssignment(employee_id=emp_objs["EMP028"].id, brand_id=wf.id, process_id=proc_objs["Customer Support (CS)"].id, assignment_status="active", is_primary=True))
    db.add(EmployeeAssignment(employee_id=emp_objs["EMP030"].id, brand_id=wf.id, process_id=proc_objs["Retention"].id, assignment_status="active", is_primary=True))

    db.add(OperatingRule(brand_id=wf.id, process_id=proc_objs["Customer Support (CS)"].id, operating_type="EVERYDAY", minimum_staff_required=2, applicable_days="0,1,2,3,4,5,6", shift_start="09:00", shift_end="18:00"))
    db.add(OperatingRule(brand_id=wf.id, process_id=proc_objs["Retention"].id, operating_type="SUNDAYS_AND_HOLIDAYS_OFF", minimum_staff_required=1, applicable_days="0,1,2,3,4,5", shift_start="10:00", shift_end="19:00"))

    # Additional cross-brand mappings demonstrating multi-brand capabilities and backups
    ko_b = brand_objs["Kalyan Organics"]
    zk_b = brand_objs["Zouk Lifestyle"]
    twt_b = brand_objs["The Whole Truth"]

    # EMP031 handles Other Operations for Kalyan Organics
    db.add(EmployeeAssignment(employee_id=emp_objs["EMP031"].id, brand_id=ko_b.id, process_id=proc_objs["Other Operations"].id, assignment_status="active", is_primary=True))
    db.add(OperatingRule(brand_id=ko_b.id, process_id=proc_objs["Other Operations"].id, operating_type="SUNDAYS_AND_HOLIDAYS_OFF", minimum_staff_required=1, applicable_days="0,1,2,3,4,5", shift_start="09:00", shift_end="18:00"))

    # EMP032 handles Other Operations for Zouk Lifestyle
    db.add(EmployeeAssignment(employee_id=emp_objs["EMP032"].id, brand_id=zk_b.id, process_id=proc_objs["Other Operations"].id, assignment_status="active", is_primary=True))
    db.add(OperatingRule(brand_id=zk_b.id, process_id=proc_objs["Other Operations"].id, operating_type="SUNDAYS_AND_HOLIDAYS_OFF", minimum_staff_required=1, applicable_days="0,1,2,3,4,5", shift_start="09:00", shift_end="18:00"))

    # EMP025 handles Other Operations for The Whole Truth
    db.add(EmployeeAssignment(employee_id=emp_objs["EMP025"].id, brand_id=twt_b.id, process_id=proc_objs["Other Operations"].id, assignment_status="active", is_primary=True))
    db.add(OperatingRule(brand_id=twt_b.id, process_id=proc_objs["Other Operations"].id, operating_type="SUNDAYS_AND_HOLIDAYS_OFF", minimum_staff_required=1, applicable_days="0,1,2,3,4,5", shift_start="09:00", shift_end="18:00"))

    # Cross-assignments for backup demonstration (inactive/secondary)
    db.add(EmployeeAssignment(employee_id=emp_objs["EMP031"].id, brand_id=zk_b.id, process_id=proc_objs["Other Operations"].id, assignment_status="active", is_primary=False))
    db.add(EmployeeAssignment(employee_id=emp_objs["EMP032"].id, brand_id=ko_b.id, process_id=proc_objs["Other Operations"].id, assignment_status="active", is_primary=False))

    # 7. Seed Public Holidays (Current year / month coverage)
    today = date.today()
    y = today.year
    holidays_data = [
        (date(y, 1, 26), "Republic Day"),
        (date(y, 3, 25), "Holi Festival"),
        (date(y, 8, 15), "Independence Day"),
        (date(y, 10, 2), "Mahatma Gandhi Jayanti"),
        (date(y, 11, 1), "Diwali (Deepavali)"),
        (date(y, 11, 15), "Guru Nanak Jayanti"),
        (date(y, 12, 25), "Christmas Day"),
    ]
    for h_date, h_name in holidays_data:
        db.add(PublicHoliday(date=h_date, holiday_name=h_name))

    # 8. Seed Sample Planned Leaves and Comp-Offs
    # Sample approved leave for Kavya Menon (EMP008) mid-month
    db.add(LeaveRequest(
        employee_id=emp_objs["EMP008"].id,
        start_date=date(y, today.month, 10),
        end_date=date(y, today.month, 12),
        leave_type="PLANNED_LEAVE",
        approval_status="APPROVED",
        reason="Family function in Kerala",
        reviewed_by="Rahul Sharma"
    ))

    # Sample approved Comp-Off for Ritu Saxena (EMP020)
    db.add(LeaveRequest(
        employee_id=emp_objs["EMP020"].id,
        start_date=date(y, today.month, 18),
        end_date=date(y, today.month, 18),
        leave_type="COMP_OFF",
        approval_status="APPROVED",
        reason="Comp-off earned for weekend dispatch drive",
        reviewed_by="Vikram Malhotra"
    ))

    # Sample Pending leave for Harsh Vardhan (EMP023)
    db.add(LeaveRequest(
        employee_id=emp_objs["EMP023"].id,
        start_date=date(y, today.month, 22),
        end_date=date(y, today.month, 24),
        leave_type="CASUAL_LEAVE",
        approval_status="PENDING",
        reason="Personal travel",
        reviewed_by=None
    ))

    # Sample Rejected leave for Rajesh Pillai (EMP027)
    db.add(LeaveRequest(
        employee_id=emp_objs["EMP027"].id,
        start_date=date(y, today.month, 5),
        end_date=date(y, today.month, 6),
        leave_type="CASUAL_LEAVE",
        approval_status="REJECTED",
        reason="Requested during festival sale volume surge",
        reviewed_by="Ananya Iyer"
    ))

    # Sample explicit unavailability for Meera Joshi (EMP010)
    db.add(EmployeeAvailability(
        employee_id=emp_objs["EMP010"].id,
        date=date(y, today.month, 25),
        availability_status="UNAVAILABLE",
        note="Medical appointment scheduled"
    ))

    db.commit()
    return {"status": "success", "message": f"Successfully seeded {len(employees_data)} employees, 4 pods, 15 brands, 5 processes, holidays, and sample leaves."}
