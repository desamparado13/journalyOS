# IMPLEMENTATION INSTRUCTIONS v0.3

Apply this pack on top of Jarvis v0.1 and v0.2.

Goal:
Make Jarvis conversational and personalized per authenticated Journaly user.

## 1. Add per-user Jarvis profile

Load at chat start:

{
  authenticated_user_id,
  username,
  preferred_name,
  jarvis_preferences
}

For the current user:
preferred_name = "Pot"
username = "christiian.angelo.desamparado"

## 2. Inject user profile into the model context

Example:

CURRENT USER
Preferred name: Pot
Username: christiian.angelo.desamparado

PERSONALITY
Familiarity: high
Humor: medium
Empathy: medium
Directness: high
Verbosity: concise

Do NOT place other users' data in the same context.

## 3. Store memory per user

Use authenticated_user_id as the namespace/key.

Recommended functions:

get_user_profile()
get_user_jarvis_preferences()
get_user_memories(categories)
save_user_memory(category, key, value)
update_user_memory(memory_id, value)
get_user_strategy_rules()
get_user_strategy_examples()

## 4. Do not make every response use the user's name

Use "Pot" naturally, not in every sentence.

Good:
"Yo Pot. What are we checking?"

Also good:
"Yeah, I’d skip this one."

Bad:
"Pot, I think this is bad, Pot."

## 5. Separate identity from strategy

User profile memory:
- name
- tone preferences

Trading memory:
- rules
- examples
- mistakes
- risk settings

Session memory:
- current chart
- current setup
- unresolved context

## 6. Preserve conversational routing from v0.2

No canned fallback.
Every normal message goes to the model.
Tools are called only when needed.
Recent turns must be included.

## 7. Safety / privacy

Never allow a user-supplied username in the prompt to switch memory namespaces.
Only the authenticated server-side user ID determines whose memory is loaded.

## 8. Example greeting logic

User: "hi jarvis"

Current user preferred_name exists:
Jarvis: "Yo Pot. What are we checking?"

Different user, preferred_name="Mia":
Jarvis: "Hey Mia. What are we looking at?"

Different user, no preferred_name:
Jarvis: "Hey. What are we looking at?"
