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
    res = req('http://localhost:8000/api/auth/login', 'POST', {'email':'admin@oakridge.edu','password':'AdminPassword123!'})
    token = res['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    
    classes = req('http://localhost:8000/api/classes', headers=headers)
    c_map = {f"{c['name']}-{c['section']}": c['id'] for c in classes}
    
    expected = {
        'Class 1-A': ['English', 'Mathematics', 'Science', 'Hindi'],
        'Class 1-B': ['Mathematics', 'English', 'Hindi', 'Science'],
        'Class 2-A': ['Science', 'English', 'Mathematics', 'Computer'],
        'Class 3-A': ['Hindi', 'Mathematics', 'Computer', 'English'],
    }
    
    for cls_name, expected_subjects in expected.items():
        assert cls_name in c_map, f"{cls_name} not found in classes: {list(c_map.keys())}"
        cid = c_map[cls_name]
        tt_res = req(f'http://localhost:8000/api/timetable?academic_year=2026-2027&class_id={cid}', headers=headers)
        monday_periods = tt_res['grid']['Monday']
        subjects = [p['subject'] for p in monday_periods if not p.get('is_break')]
        print(f"[OK] {cls_name} Monday Periods: {subjects}")
        assert subjects == expected_subjects, f"Expected {expected_subjects}, got {subjects}"
        
    print("\nALL SAMPLE CLASSES TIMETABLES VERIFIED SUCCESSFULLY!")

if __name__ == '__main__':
    main()
