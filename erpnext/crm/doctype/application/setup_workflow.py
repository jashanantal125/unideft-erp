import frappe

def execute():
    setup_roles()
    setup_teams()

def setup_roles():
    roles = ["Team Lead", "Team Executive"]
    for role in roles:
        if not frappe.db.exists("Role", role):
            new_role = frappe.new_doc("Role")
            new_role.role_name = role
            new_role.desk_access = 1
            new_role.insert(ignore_permissions=True)
            print(f"Created Role: {role}")
        else:
            print(f"Role already handles: {role}")

def setup_teams():
    # Team Name, Team Leader Email (dummy), Country Name
    teams = [
        ("Australia Team", "australia.lead@unideft.com", "Australia"),
        ("USA Team", "usa.lead@unideft.com", "United States"),
        ("Canada Team", "canada.lead@unideft.com", "Canada")
    ]
    
    for team_name, leader_email, country_name in teams:
        if not frappe.db.exists("Team", team_name):
            # Check if country exists
            country_exists = frappe.db.exists("Country", country_name)
            if not country_exists:
                print(f"Skipping Team {team_name}: Country {country_name} not found")
                continue
                
            # Create user if needed (so we can set team leader)
            # We won't create actual user to avoid password issues, 
            # just assuming admin or current user as placeholder if needed,
            # or leaving empty if validation allows.
            # Team Leader field is not mandatory in the JSON we saw earlier.
            
            team = frappe.new_doc("Team")
            team.team_name = team_name
            # team.team_leader = leader_email # Optional
            
            # Add territory (Country)
            row = team.append("territories", {})
            row.country = country_name
            
            team.insert(ignore_permissions=True)
            print(f"Created Team: {team_name} for country {country_name}")
        else:
            print(f"Team already exists: {team_name}")

if __name__ == "__main__":
    frappe.connect()
    execute()
    frappe.db.commit()
