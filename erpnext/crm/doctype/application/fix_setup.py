import frappe

def execute():
    fix_workflow()
    fix_email_permissions()

def fix_workflow():
    # Add Team Lead and Team Executive to 'app' workflow transitions
    workflow_name = "app"
    if frappe.db.exists("Workflow", workflow_name):
        doc = frappe.get_doc("Workflow", workflow_name)
        
        roles_to_add = ["Team Lead", "Team Executive", "Agent"]
        
        # Iterate through transitions and add roles if not present
        # Note: Workflow transitions usually allow one role per row. 
        # Adding multiple roles means adding multiple rows for the same state-action-next_state.
        
        # We need to know which transitions exist.
        # We will duplicate existing transitions for new roles.
        
        new_transitions = []
        existing_transitions = doc.transitions
        
        # Helper to check if transition exists
        def transition_exists(state, action, next_state, role):
            for t in existing_transitions:
                if t.state == state and t.action == action and t.next_state == next_state and t.allowed == role:
                    return True
            for t in new_transitions:
                if t.state == state and t.action == action and t.next_state == next_state and t.allowed == role:
                    return True
            return False

        # For each unique transition tuple (state, action, next_state), add our roles
        unique_transitions = set()
        for t in existing_transitions:
            unique_transitions.add((t.state, t.action, t.next_state))
            
        for state, action, next_state in unique_transitions:
            for role in roles_to_add:
                if not transition_exists(state, action, next_state, role):
                    doc.append("transitions", {
                        "state": state,
                        "action": action,
                        "next_state": next_state,
                        "allowed": role,
                        "allow_self_approval": 1
                    })
                    print(f"Added transition {state} -> {next_state} for {role}")
        
        doc.save(ignore_permissions=True)
        print("Updated Workflow 'app' with new roles.")
    else:
        print("Workflow 'app' not found.")

def fix_email_permissions():
    # Grant Read/Email access to Email Account for Agent, Team Lead, Team Executive
    # We'll use Custom DocPerm to avoid modifying core DocType if possible, 
    # but strictly speaking we should modify the DocType or use Property Setter? 
    # Permissions are best set via Custom DocPerm (User Permissions) or updating the DocType.
    # We will update the DocType "Email Account" permissions directly as we did for Student.
    
    doctype = "Email Account"
    doc = frappe.get_doc("DocType", doctype)
    
    roles = ["Agent", "Team Lead", "Team Executive"]
    permissions = {"read": 1, "email": 1, "print": 1}
    
    for role in roles:
        # Check if permission already exists
        found = False
        for p in doc.permissions:
            if p.role == role:
                found = True
                break
        
        if not found:
            row = doc.append("permissions", {})
            row.role = role
            row.read = 1
            row.email = 1
            row.print = 1
            # Write? Maybe not.
            print(f"Added {role} permission to Email Account")
    
    doc.save(ignore_permissions=True)
    print("Updated Email Account permissions.")

if __name__ == "__main__":
    frappe.connect()
    execute()
    frappe.db.commit()
