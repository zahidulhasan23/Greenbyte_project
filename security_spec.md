# Security Specification - Project Management System

## Data Invariants
1. **Identity & Role**: Every authenticated user must have a corresponding document in the `members` collection. The role in this document defines their permissions.
2. **Global Admin Immunity**: The user `zahidul@greenbyteai.com` is the immutable Global Admin.
3. **Hierarchical Access**:
   - `Global Admin` & `Admin`: Full access.
   - `Manager`: Full read access. Can add tasks and jobs (if project exists). Can update job status and assignments. Cannot create projects or members.
   - `Worker`: Can only see projects they are members of. Can see tasks within those projects. Can only see and update jobs assigned to them.
4. **Relational Integrity**:
   - Tasks must reference a valid `projectId`.
   - Jobs must reference valid `projectId` and `taskId`.
   - When creating a task/job, the parent project/task must exist.
5. **Temporal Integrity**: `createdAt` is immutable and must be `request.time`. `updatedAt` (if used) must be `request.time`.

## The "Dirty Dozen" Payloads

1. **Role Escalation**: A `Worker` tries to create a `Member` document with `role: "Global Admin"`.
2. **Project Hijack**: A `Worker` tries to create a `Project` with `ownerId` set to a `Global Admin`'s UID to spoof ownership.
3. **Ghost Field Injection**: An `Admin` tries to update a job but adds an `isVerified: true` field not in the schema.
4. **Member Role Self-Promotion**: A `Worker` tries to update their own `Member` document to change `role` to `Admin`.
5. **Orphaned Task**: A user tries to create a `Task` referencing a non-existent `projectId`.
6. **Shadow Job Assignment**: A `Worker` tries to update a `Job` to assign it to themselves when it was assigned to someone else.
7. **Terminal State Bypass**: A user tries to update a `Job` that is already `status: "Completed"` to change its title.
8. **PII Leak**: A `Worker` tries to `get` another user's `Member` document (PII like email).
9. **Global Admin Role Tamper**: An `Admin` tries to change `zahidul@greenbyteai.com`'s role to `Worker`.
10. **Resource Poisoning**: A user tries to create a project with a 2MB string as the `name`.
11. **ID Poisoning**: A user tries to create a document with a 2KB junk string as the document ID.
12. **Timestamp Fraud**: A user tries to create a task with a `createdAt` set to a date in 2020.

## Implementation Strategy
- Use `getRole()` helper to fetch role from `members` collection.
- Use `isValidId()` for all document IDs.
- Use `isValid[Entity]()` for all data validation.
- Split `update` actions using `affectedKeys().hasOnly()`.
- Use `exists()` for relational checks during creation.
