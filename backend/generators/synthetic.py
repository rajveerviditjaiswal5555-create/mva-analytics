"""Deterministic synthetic student-record generator for DEMO mode.

IMPORTANT: Every record produced here is fictional. Names are assembled from
common name pools and are not associated with any real person. No student
personally identifiable information is used.
"""
from __future__ import annotations

import random
from datetime import date, timedelta
from typing import Any

# (state, weight, [(city, district, pincode_prefix), ...])
INDIA_STATES: list[tuple[str, float, list[tuple[str, str, str]]]] = [
    ("Madhya Pradesh", 0.395, [
        ("Burhanpur", "Burhanpur", "450331"), ("Indore", "Indore", "452001"),
        ("Bhopal", "Bhopal", "462001"), ("Jabalpur", "Jabalpur", "482001"),
        ("Ujjain", "Ujjain", "456001"), ("Gwalior", "Gwalior", "474001"),
        ("Khandwa", "Khandwa", "450001"), ("Dhar", "Dhar", "454001"),
        ("Dewas", "Dewas", "455001"), ("Sehore", "Sehore", "466001"),
        ("Ratlam", "Ratlam", "457001"), ("Sagar", "Sagar", "470001"),
    ]),
    ("Maharashtra", 0.140, [
        ("Mumbai", "Mumbai City", "400001"), ("Pune", "Pune", "411001"),
        ("Nagpur", "Nagpur", "440001"), ("Nashik", "Nashik", "422001"),
        ("Aurangabad", "Aurangabad", "431001"), ("Amravati", "Amravati", "444001"),
        ("Kolhapur", "Kolhapur", "416001"), ("Solapur", "Solapur", "413001"),
    ]),
    ("Rajasthan", 0.090, [
        ("Jaipur", "Jaipur", "302001"), ("Jodhpur", "Jodhpur", "342001"),
        ("Udaipur", "Udaipur", "313001"), ("Kota", "Kota", "324001"),
        ("Bikaner", "Bikaner", "334001"), ("Ajmer", "Ajmer", "305001"),
    ]),
    ("Gujarat", 0.075, [
        ("Ahmedabad", "Ahmedabad", "380001"), ("Surat", "Surat", "395001"),
        ("Vadodara", "Vadodara", "390001"), ("Rajkot", "Rajkot", "360001"),
        ("Bhavnagar", "Bhavnagar", "364001"), ("Junagadh", "Junagadh", "362001"),
    ]),
    ("Uttar Pradesh", 0.070, [
        ("Lucknow", "Lucknow", "226001"), ("Kanpur", "Kanpur Nagar", "208001"),
        ("Varanasi", "Varanasi", "221001"), ("Agra", "Agra", "282001"),
        ("Meerut", "Meerut", "250001"), ("Prayagraj", "Prayagraj", "211001"),
        ("Noida", "Gautam Buddha Nagar", "201301"),
    ]),
    ("Delhi", 0.052, [
        ("New Delhi", "New Delhi", "110001"), ("Dwarka", "South West Delhi", "110075"),
        ("Rohini", "North West Delhi", "110085"), ("Noida", "Gautam Buddha Nagar", "201301"),
        ("Gurugram", "Gurugram", "122001"),
    ]),
    ("Chhattisgarh", 0.040, [
        ("Raipur", "Raipur", "492001"), ("Bilaspur", "Bilaspur", "495001"),
        ("Durg", "Durg", "491001"), ("Bhilai", "Durg", "490001"),
        ("Korba", "Korba", "495677"),
    ]),
    ("Bihar", 0.034, [
        ("Patna", "Patna", "800001"), ("Gaya", "Gaya", "823001"),
        ("Bhagalpur", "Bhagalpur", "812001"), ("Muzaffarpur", "Muzaffarpur", "842001"),
    ]),
    ("Karnataka", 0.032, [
        ("Bengaluru", "Bengaluru Urban", "560001"), ("Mysuru", "Mysuru", "570001"),
        ("Hubballi", "Dharwad", "580001"), ("Mangaluru", "Dakshina Kannada", "575001"),
    ]),
    ("Telangana", 0.022, [
        ("Hyderabad", "Hyderabad", "500001"), ("Warangal", "Warangal", "506001"),
        ("Nizamabad", "Nizamabad", "503001"),
    ]),
    ("West Bengal", 0.018, [
        ("Kolkata", "Kolkata", "700001"), ("Howrah", "Howrah", "711101"),
        ("Siliguri", "Darjeeling", "734001"),
    ]),
    ("Punjab", 0.016, [
        ("Chandigarh", "Chandigarh", "160001"), ("Ludhiana", "Ludhiana", "141001"),
        ("Amritsar", "Amritsar", "143001"), ("Patiala", "Patiala", "147001"),
    ]),
    ("Haryana", 0.014, [
        ("Gurugram", "Gurugram", "122001"), ("Faridabad", "Faridabad", "121001"),
        ("Hisar", "Hisar", "125001"), ("Ambala", "Ambala", "133001"),
    ]),
    ("Odisha", 0.012, [
        ("Bhubaneswar", "Khordha", "751001"), ("Cuttack", "Cuttack", "753001"),
        ("Rourkela", "Sundargarh", "769001"),
    ]),
    ("Assam", 0.010, [
        ("Guwahati", "Kamrup Metropolitan", "781001"), ("Dibrugarh", "Dibrugarh", "786001"),
    ]),
    ("Other Indian states", 0.016, [
        ("Dehradun", "Dehradun", "248001"), ("Shimla", "Shimla", "171001"),
        ("Srinagar", "Srinagar", "190001"), ("Jammu", "Jammu", "180001"),
        ("Thiruvananthapuram", "Thiruvananthapuram", "695001"),
        ("Kochi", "Ernakulam", "682001"), ("Panaji", "North Goa", "403001"),
        ("Bhopal", "Bhopal", "462001"),
    ]),
]

# Small synthetic international presence so country analytics are demonstrable.
COUNTRIES: list[tuple[str, float, list[tuple[str, str, str]]]] = [
    ("Nepal", 0.38, [("Kathmandu", "Bagmati", "44600"), ("Biratnagar", "Koshi", "56600")]),
    ("Bangladesh", 0.20, [("Dhaka", "Dhaka", "1000"), ("Chattogram", "Chattogram", "4000")]),
    ("United Arab Emirates", 0.14, [("Dubai", "Dubai", "00000"), ("Abu Dhabi", "Abu Dhabi", "00000")]),
    ("Saudi Arabia", 0.09, [("Riyadh", "Riyadh", "00000"), ("Jeddah", "Makkah", "00000")]),
    ("United States", 0.07, [("New York", "New York", "10001"), ("Chicago", "Illinois", "60601")]),
    ("United Kingdom", 0.05, [("London", "Greater London", "E1"), ("Manchester", "Greater Manchester", "M1")]),
    ("Canada", 0.04, [("Toronto", "Ontario", "M5H"), ("Vancouver", "British Columbia", "V6B")]),
    ("Australia", 0.03, [("Sydney", "New South Wales", "2000"), ("Melbourne", "Victoria", "3000")]),
]

GIVEN = [
    "Aarav", "Aditya", "Ananya", "Aanya", "Aarushi", "Arjun", "Avni", "Ayush", "Bhavya", "Chaarms",
    "Charvi", "Devansh", "Dhruv", "Diya", "Esha", "Gaurav", "Ira", "Ishaan", "Jai", "Kavya",
    "Kian", "Kiara", "Krishna", "Meera", "Navya", "Neel", "Nisha", "Ojas", "Pranav", "Priya",
    "Raha", "Reyansh", "Riya", "Rohan", "Saanvi", "Samaira", "Shaurya", "Shreya", "Siddharth",
    "Tara", "Vanya", "Vihaan", "Zara", "Aadvik", "Bhairavi", "Chaitanya", "Daksh", "Elina", "Hriday",
]
SURNAME = [
    "Sharma", "Verma", "Gupta", "Patel", "Singh", "Jain", "Mehta", "Chauhan", "Yadav", "Khan",
    "Rao", "Iyer", "Nair", "Reddy", "Bose", "Dutta", "Kulkarni", "Deshmukh", "Pawar", "Jadhav",
    "Malviya", "Rathore", "Sisodia", "Parmar", "Thakur", "Bansal", "Agarwal", "Soni", "Khatri", "Basu",
]
SCHOOL_PREFIX = [
    "Saraswati", "Vidya", "St. Mary's", "Model", "Central", "Navodaya", "Kendriya", "Surya",
    "Bal Bharati", "Delhi Public", "St. Xavier's", "Adarsh", "Shree", "Sanchi", "Greenfield",
    "Little Flower", "Modern", "Siddhartha", "Vivekananda", "Anand",
]
SCHOOL_SUFFIX = ["Vidyalaya", "School", "Academy", "Higher Secondary School", "Public School", "Inter College"]
SCHOOL_TYPES = ["CBSE", "ICSE", "State Board", "CBSE", "State Board", "ICSE", "Other"]
CLASSES = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"]
GENDERS = [("Male", 0.51), ("Female", 0.47), ("Other", 0.02)]
STATUSES = [("Admitted", 0.62), ("Waitlisted", 0.13), ("Not Admitted", 0.13), ("Pending", 0.12)]
SOURCES = ["Website", "School Visit", "Social Media", "Friend / Family", "Newspaper", "Alumni Referral", "Walk-in", "Other"]
YEARS = [2022, 2023, 2024, 2025, 2026]
YEAR_WEIGHTS = [0.176, 0.186, 0.197, 0.211, 0.230]  # gently increasing intake


def _weighted_choice(rng: random.Random, items: list[tuple[Any, float]]):
    total = sum(w for _, w in items)
    pick = rng.random() * total
    upto = 0.0
    for item, weight in items:
        upto += weight
        if pick <= upto:
            return item
    return items[-1][0]


def _region(rng: random.Random) -> tuple[str, str, str, str]:
    if rng.random() < 0.968:
        state = _weighted_choice(rng, [(s, w) for s, w, _ in INDIA_STATES])
        cities = next(c for s, _, c in INDIA_STATES if s == state)
        country = "India"
    else:
        country = _weighted_choice(rng, [(c, w) for c, w, _ in COUNTRIES])
        cities = next(city_list for name, _, city_list in COUNTRIES if name == country)
        state = f"{country} — Overseas"
    city, district, pincode = rng.choice(cities)
    return country, state, city, district, pincode


def generate_records(total: int, seed: int) -> list[dict[str, Any]]:
    """Return `total` fictional student records as flat dictionaries."""
    rng = random.Random(seed)
    records: list[dict[str, Any]] = []
    counter = 0

    for year, weight in zip(YEARS, YEAR_WEIGHTS):
        count = int(total * weight)
        if year == YEARS[-1]:
            count = total - len(records)
        for _ in range(count):
            counter += 1
            country, state, city, district, pincode = _region(rng)
            gender = _weighted_choice(rng, GENDERS)
            class_applied = rng.choice(CLASSES)
            status = _weighted_choice(rng, STATUSES)
            given = rng.choice(GIVEN)
            surname = rng.choice(SURNAME)
            full_name = f"{given} {surname}"

            # Entrance score roughly bell-shaped between 110 and 495.
            score = round(max(110, min(495, rng.gauss(330, 62))), 1)
            percentage = round(max(32, min(99.5, score / 4.85 + rng.uniform(-2.5, 2.5))), 1)
            prev_pct = round(max(42, min(99, rng.gauss(76, 10))), 1)

            birth_year = 2026 - (5 + ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"].index(class_applied))
            try:
                dob = date(birth_year, rng.randint(1, 12), rng.randint(1, 28))
            except ValueError:
                dob = date(birth_year, 6, 15)

            reg_date = date(year, rng.randint(1, 11), rng.randint(1, 28))
            try:
                reg_date = date(year, rng.randint(1, 11), rng.randint(1, 28))
            except ValueError:
                reg_date = date(year, 6, 15)

            # A small, realistic amount of missing data so quality checks are meaningful.
            roll = rng.random()
            if roll < 0.015:
                prev_pct = None
            if roll >= 0.015 and roll < 0.022:
                pincode = ""
            if roll >= 0.022 and roll < 0.027:
                score = None
                percentage = None
            if roll >= 0.027 and roll < 0.0295:
                dob = None

            school_name = f"{rng.choice(SCHOOL_PREFIX)} {rng.choice(SCHOOL_SUFFIX)}"

            records.append({
                "student_id": f"MVA{year}{counter:06d}",
                "application_id": f"APP-{year}-{counter:06d}-{rng.randrange(16 ** 4):04X}",
                "full_name": full_name,
                "gender": gender,
                "date_of_birth": dob,
                "class_applied": class_applied,
                "academic_year": f"{year}-{str(year + 1)[-2:]}",
                "exam_year": year,
                "exam_code": f"MVA-ENT-{year}",
                "country": country,
                "state": state,
                "district": district,
                "city": city,
                "pincode": pincode,
                "school_type": rng.choice(SCHOOL_TYPES),
                "previous_school": school_name,
                "entrance_score": score,
                "percentage": percentage,
                "previous_academic_percentage": prev_pct,
                "admission_status": status,
                "registration_date": reg_date,
                "source_referral": rng.choice(SOURCES),
                "is_synthetic": True,
            })

    rng.shuffle(records)
    return records
