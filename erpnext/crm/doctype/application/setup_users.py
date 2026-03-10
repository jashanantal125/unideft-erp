import frappe

def execute():
    create_test_users()

def create_test_users():
    users = [
        {"email": "test.agent@unideft.com", "first_name": "Test", "last_name": "Agent", "role": "Agent"},
        {"email": "australia.lead@unideft.com", "first_name": "Australia", "last_name": "Lead", "role": "Team Lead"},
        {"email": "australia.exec@unideft.com", "first_name": "Australia", "last_name": "Executive", "role": "Team Executive"},
    ]

    for user_data in users:
        if not frappe.db.exists("User", user_data["email"]):
            user = frappe.new_doc("User")
            user.email = user_data["email"]
            user.first_name = user_data["first_name"]
            user.last_name = user_data["last_name"]
            user.enabled = 1
            user.send_welcome_email = 0
            user.insert(ignore_permissions=True)
            
            # Set password
            user.new_password = "Unideft@2025"
            user.save(ignore_permissions=True)
            
            # Add Role
            user.add_roles(user_data["role"])
            print(f"Created User: {user_data['email']} with Role: {user_data['role']}")
        else:
            print(f"User already exists: {user_data['email']}")
            # Ensure role is assigned
            user = frappe.get_doc("User", user_data["email"])
            user.add_roles(user_data["role"])

    # 2. Setup Agent Record for the Agent User
    if not frappe.db.exists("Agent", {"user": "test.agent@unideft.com"}):
        agent = frappe.new_doc("Agent")
        agent.naming_series = "AGT-.YYYY.-"
        agent.company_name = "Test Agency"
        agent.user = "test.agent@unideft.com"
        agent.no_of_employees = 5
        agent.country = "Australia" # Assuming Australia exists, else might fail. Using 'India' might be safer if Aus doesn't exist? 
        # But we know Australia exists from previous step success.
        agent.state = "Test State"
        agent.city = "Test City"
        agent.address = "Test Address"
        agent.contact_person = "Test Agent"
        agent.designation = "Manager"
        agent.email = "test.agent@unideft.com"
        agent.country_code = "+91"
        agent.mobile = "9876543210"
        agent.first_name = "Test"
        agent.last_name = "Agent"
        agent.status = "Signed Up"
        agent.insert(ignore_permissions=True)
        print("Created Agent Record for test.agent@unideft.com")
    else:
        print("Agent record already exists for test.agent@unideft.com")

    # 3. Add Team Executive to Australia Team
    team_name = "Australia Team"
    exec_email = "australia.exec@unideft.com"
    
    if frappe.db.exists("Team", team_name):
        team = frappe.get_doc("Team", team_name)
        
        # Check if already member
        member_exists = False
        for member in team.team_members:
            if member.user == exec_email:
                member_exists = True
                break
        
        if not member_exists:
            row = team.append("team_members", {})
            row.user = exec_email
            row.priority = 1
            team.save(ignore_permissions=True)
            print(f"Added {exec_email} to {team_name}")
        else:
            print(f"{exec_email} is already a member of {team_name}")
            
    # Also set Team Lead for the team if not set
    if frappe.db.exists("Team", team_name):
        team = frappe.get_doc("Team", team_name)
        if not team.team_leader:
            team.team_leader = "australia.lead@unideft.com"
            team.save(ignore_permissions=True)
            print(f"Set Team Leader for {team_name}")

if __name__ == "__main__":
    frappe.connect()
    execute()
    frappe.db.commit()
