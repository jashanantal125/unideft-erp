import frappe

def execute():
    # Check Workflows for Application
    workflows = frappe.get_all("Workflow", filters={"document_type": "Application"}, fields=["name", "is_active"])
    print(f"Workflows found: {workflows}")
    
    if workflows:
        for wf in workflows:
            doc = frappe.get_doc("Workflow", wf.name)
            transitions = doc.transitions
            print(f"Workflow {wf.name} Transitions:")
            for t in transitions:
                print(f"  {t.state} -> {t.next_state} (Allowed: {t.allowed})")

    # Check Email Account permissions for Agent
    perms = frappe.get_all("Custom DocPerm", filters={"parent": "Email Account", "role": "Agent"})
    print(f"Agent Permissions on Email Account (Custom): {perms}")
    
    # Check Standard permissions (from JSON files if imported, but easier to check via DocType)
    # implementation: accessing DocType permissions in memory
    email_account = frappe.get_doc("DocType", "Email Account")
    agent_perm = [p for p in email_account.permissions if p.role == "Agent"]
    print(f"Agent Permissions on Email Account (Standard): {agent_perm}")
