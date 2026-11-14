# Spark Script — مساحة البرمجة المتقدمة

Spark Script is an intentionally small, deterministic command language for advanced users who want repeatable scene edits. It is optional: ordinary visual editing and local assistant commands remain available without writing code.

## Supported commands

\`\`\`
# Change the first object of a kind or an exact object id
set("hero", "speed", 260)
set("enemy", "health", 75)
set("hero", "color", "#55aaff")
set("hero", "name", "Swift")

# Add or remove one scene object
spawn("coin", 420, 225)
remove("enemy")

# Leave a note in the execution result
note("Challenge configured")
\`\`\`

Targets may be a kind name (\`hero\`, \`enemy\`, \`crate\`, \`coin\`, \`platform\`) or an exact object id such as \`object-3\`. When a kind is used, the first matching object is modified or removed.

Supported properties are \`x\`, \`y\`, \`health\`, \`speed\`, \`damage\`, \`size\`, \`color\`, and \`name\`. Values are validated. Out-of-range values return a line-specific error and the entire script is rejected without applying partial edits.

## Safety and limits

- No JavaScript evaluation, \`eval\`, dynamic imports, network access, filesystem access, DOM access, or browser globals.
- Only four commands are accepted: \`set\`, \`spawn\`, \`remove\`, and \`note\`.
- Maximum 12,000 characters, 60 lines, and 50 executable commands.
- A script is parsed and validated before a single editor transaction is committed.
- Execution is a scene-edit operation, not a per-frame gameplay scripting runtime.

The language is not JavaScript or TypeScript. A future professional scripting tier may add a typed runtime API and opt-in behavior hooks after a separate sandbox and lifecycle design.
