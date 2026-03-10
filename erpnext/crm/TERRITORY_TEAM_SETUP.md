# Territory-Based Lead Assignment Setup Guide

## Overview
This implementation automatically assigns leads to teams based on territory, which is auto-set from the lead's country field.

## How It Works

1. **Auto Territory Assignment**: When a Lead is created with a country, the system automatically sets the territory field by matching the country name to a territory.

2. **Team Assignment**: If a Territory Team Mapping exists for that territory, the lead is automatically assigned to a team member from that mapping.

## Setup Steps

### Step 1: Create Territories
1. Go to **Territory** (`/app/territory`)
2. Create territories matching your countries (e.g., "India", "USA", "UK")
3. You can also create parent territories for regions (e.g., "Asia" → "India", "China")

### Step 2: Create Territory Team Mappings
1. Go to **Territory Team Mapping** (`/app/territory-team-mapping`)
2. Click **+ New**
3. Select the **Territory** (e.g., "India")
4. Add **Team Members**:
   - Click **+ Add Row** in Team Members table
   - Select a **User** (team member)
   - Set **Priority** (lower number = higher priority, e.g., 1, 2, 3)
5. Save

### Step 3: Migrate DocTypes
After creating the new DocTypes, you need to migrate them:

**Option A: Via UI (Recommended)**
1. Go to **Territory Team Mapping** DocType: `/app/doctype/Territory Team Mapping`
2. Click **Reload** button
3. Go to **Territory Team Member** DocType: `/app/doctype/Territory Team Member`
4. Click **Reload** button

**Option B: Via Command Line**
```bash
cd /Users/pradeep/Documents/unideft/frappe-bench
bench --site unidef.com migrate
```

## Example Setup

### Territory Setup:
- Territory: "India"
- Territory: "USA"
- Territory: "UK"

### Team Mapping Example:
**Territory Team Mapping for "India":**
- Territory: India
- Team Members:
  - User: user1@example.com, Priority: 1
  - User: user2@example.com, Priority: 2
  - User: user3@example.com, Priority: 3

**Territory Team Mapping for "USA":**
- Territory: USA
- Team Members:
  - User: user4@example.com, Priority: 1
  - User: user5@example.com, Priority: 2

## How Assignment Works

1. **Lead Creation**: When a lead is created with country "India":
   - System automatically sets territory to "India" (if territory exists with that name)
   - System checks for Territory Team Mapping for "India"
   - If found, assigns lead to the first team member (lowest priority number)

2. **Priority System**: 
   - Lower priority number = assigned first
   - Currently uses simple assignment (first member)
   - Can be enhanced with round-robin or load balancing

3. **Agent Override**: 
   - If the user creating the lead has "agents" role, they are assigned as lead_owner (existing behavior)

## Notes

- If no territory matches the country, the default territory is used
- If no Territory Team Mapping exists for a territory, no auto-assignment occurs
- Manual assignment still works - this only auto-assigns when territory is set
- The assignment happens in `before_insert`, so it's set before the lead is saved

## Troubleshooting

1. **Territory not auto-setting**: 
   - Check if a Territory exists with the same name as the country
   - Check if country field is filled in the Lead

2. **Lead not assigned to team**:
   - Verify Territory Team Mapping exists for that territory
   - Check if team members are added in the mapping
   - Verify users in the mapping are active

3. **Assignment not working**:
   - Check logs: `/app/error-log`
   - Verify DocTypes are migrated
   - Clear cache: `bench clear-cache`






