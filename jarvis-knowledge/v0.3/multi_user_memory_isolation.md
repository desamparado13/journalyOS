# MULTI-USER MEMORY ISOLATION REQUIREMENTS

Jarvis must be multi-user safe.

## Required architecture

All persistent Jarvis data must be scoped by authenticated_user_id.

Example tables:

users
- id
- username
- preferred_name

jarvis_preferences
- user_id
- familiarity
- humor
- empathy
- directness
- verbosity

jarvis_memories
- id
- user_id
- category
- key
- value
- confidence
- source
- created_at
- updated_at
- active

strategy_rules
- id
- user_id
- strategy_version
- setup_type
- rule
- active

strategy_examples
- id
- user_id
- setup_type
- decision
- screenshot_id
- reasoning
- tags

## Query rule

Every read/write must filter by the authenticated user's ID.

Bad:
SELECT * FROM jarvis_memories WHERE key='preferred_name';

Good:
SELECT * FROM jarvis_memories
WHERE user_id = :authenticated_user_id
AND key='preferred_name';

## Current user bootstrap

For account:
username: christian.angelo.desamparado
preferred_name: Pot

Create/update only that user's profile.

Do not hard-code:
const name = "Pot";

Instead:
const name = currentUser.preferred_name || currentUser.username;

## Cross-user safety

Never:
- retrieve another user's trade history
- reuse another user's Jarvis memory
- leak another user's name/preferences
- share strategy examples across users unless they were intentionally marked public/shared

## New user behavior

For a new user with no stored preferred name:
- greet naturally without inventing one
- optionally ask what they want Jarvis to call them
- store it only after they provide it
