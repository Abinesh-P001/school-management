from datetime import date

def test_admin_create_fee_invoice_success(client, admin_headers):
    # Setup student
    stu_resp = client.post("/api/students/", headers=admin_headers, json={
        "name": "Fee Test Student",
        "email": "fee.test@oakridge.edu",
        "gender": "Female",
        "guardian_name": "Guardian",
        "guardian_phone": "+1 555-888-9999"
    })
    student_id = stu_resp.json()["id"]

    invoice_payload = {
        "student_id": student_id,
        "fee_type": "Term 2 Tuition & Activity",
        "amount": 1450.00,
        "due_date": "2026-11-15",
        "notes": "Fall semester tuition"
    }
    response = client.post("/api/fees/", headers=admin_headers, json=invoice_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["amount"] == 1450.00
    assert data["status"] == "Pending"
    assert "invoice_number" in data
    assert data["invoice_number"].startswith("INV-")

def test_student_cannot_create_invoice_or_summary(client, student_headers):
    create_resp = client.post("/api/fees/", headers=student_headers, json={
        "student_id": 1,
        "fee_type": "Tuition",
        "amount": 500.0,
        "due_date": "2026-11-01"
    })
    assert create_resp.status_code == 403

    summary_resp = client.get("/api/fees/summary", headers=student_headers)
    assert summary_resp.status_code == 403

def test_pay_invoice_and_summary_totals(client, admin_headers):
    stu_resp = client.post("/api/students/", headers=admin_headers, json={
        "name": "Billing Student",
        "email": "billing.stu@oakridge.edu",
        "gender": "Male",
        "guardian_name": "Guardian",
        "guardian_phone": "+1 555-777-6666"
    })
    student_id = stu_resp.json()["id"]

    inv_resp = client.post("/api/fees/", headers=admin_headers, json={
        "student_id": student_id,
        "fee_type": "Annual Science Lab Fee",
        "amount": 800.00,
        "due_date": "2026-11-20"
    })
    invoice_id = inv_resp.json()["id"]

    # Record payment
    pay_payload = {
        "payment_method": "Credit Card",
        "paid_date": str(date.today()),
        "notes": "Transaction clearance auth code #TXN9928"
    }
    pay_resp = client.post(f"/api/fees/{invoice_id}/pay", headers=admin_headers, json=pay_payload)
    assert pay_resp.status_code == 200
    data = pay_resp.json()
    assert data["status"] == "Paid"
    assert data["payment_method"] == "Credit Card"
    assert data["paid_date"] == str(date.today())

    # Verify Financial Summary
    summary = client.get("/api/fees/summary", headers=admin_headers).json()
    assert summary["total_collected"] >= 800.00
    assert summary["paid_invoices_count"] >= 1
