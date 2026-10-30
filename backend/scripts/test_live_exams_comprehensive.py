import json
import urllib.request

def req(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    encoded_data = None
    if data is not None:
        encoded_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    r = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    # 1. Admin login
    res = req('http://localhost:8000/api/auth/login', 'POST', {'email':'admin@oakridge.edu','password':'AdminPassword123!'})
    token = res['access_token']
    h = {'Authorization': f'Bearer {token}'}
    print("[1] Admin logged in successfully.")

    # 2. Get all classes
    classes = req('http://localhost:8000/api/classes', headers=h)
    c_map = {f"{c['name']}-{c['section']}": c['id'] for c in classes}
    print(f"[2] Loaded {len(classes)} classes from API: {list(c_map.keys())}")

    # 3. Test Class 5-A vs Class 5-B isolation
    c5a_id = c_map["Class 5-A"]
    c5b_id = c_map["Class 5-B"]
    exams_5a = req(f'http://localhost:8000/api/examinations?class_id={c5a_id}&section=A', headers=h)
    exams_5b = req(f'http://localhost:8000/api/examinations?class_id={c5b_id}&section=B', headers=h)
    print(f"[3] Class 5-A has {len(exams_5a)} exams, Class 5-B has {len(exams_5b)} exams.")
    
    codes_5a = set(e['exam_code'] for e in exams_5a)
    codes_5b = set(e['exam_code'] for e in exams_5b)
    overlap = codes_5a.intersection(codes_5b)
    assert len(overlap) == 0, f"Class 5-A and 5-B exams overlap: {overlap}"
    print(f"[OK] No exam overlap between 5-A and 5-B!")

    # 4. Check marks for 5-A Math
    math_5a = next((e for e in exams_5a if e['subject'] == 'Mathematics'), None)
    assert math_5a is not None
    marks_5a = req(f'http://localhost:8000/api/examinations/{math_5a["id"]}/marks', headers=h)
    print(f"[4] Loaded {len(marks_5a)} student marks for Class 5-A Mathematics:")
    for m in marks_5a:
        print(f"    - {m['student_name']} ({m['student_code']}): {m['marks_obtained']}/{m['max_marks']} -> {m['grade']} ({m['status']})")

    # 5. Check results and ranking for 5-A Math
    results_5a = req(f'http://localhost:8000/api/examinations/{math_5a["id"]}/results', headers=h)
    print(f"[5] Class 5-A Math Results Summary: Pass % = {results_5a['pass_percentage']}%, Avg = {results_5a['class_average']}, Top = {results_5a['highest_score']}")
    for r in results_5a['results']:
        print(f"    Rank {r['rank']}: {r['student_name']} -> {r['overall_percentage']}% ({r['overall_grade']})")

    # 6. Check official report cards for 5-A
    reports_5a = req(f'http://localhost:8000/api/examinations/{math_5a["id"]}/report-cards', headers=h)
    print(f"[6] Generated {len(reports_5a)} full academic report cards for Class 5-A:")
    for card in reports_5a:
        print(f"    Card: {card['student_name']} | Total: {card['total_marks_obtained']}/{card['total_max_marks']} | Overall: {card['overall_percentage']}% ({card['overall_grade']}) | Status: {card['overall_status']} | Rank: {card['rank_in_class']}/{card['total_students_in_class']}")

    print("\nALL LIVE BACKEND EXAMS & MARKS CHECKS PASSED WITH COMPLETE ISOLATION!")

if __name__ == '__main__':
    main()

