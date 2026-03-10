import frappe

def execute():
    try:
        count = frappe.db.count("Application")
        print(f"Total Applications: {count}")
        apps = frappe.get_all("Application", fields=["name", "student", "status"], limit=5)
        print(f"Sample Apps: {apps}")
    except Exception as e:
        print(f"Error: {e}")
