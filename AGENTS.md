# AGENTS Guidelines for This Repository

## Coding Conventions

- Use TypeScript (.tsx/.ts) for new components and utilities.
- Any new UI should try to use the `react-native-paper` library

## Testing instructions

- From the package root you can just call `npm test`. The commit should pass all tests before you merge.
- To focus on one step, add the Vitest pattern: `npm test run -t "<test name>"`.
- Fix any test or type errors until the whole suite is green.
- After moving files or changing imports, run `npm run lint` and `npm run typecheck` to be sure ESLint and TypeScript rules still pass.
- Add or update tests for the code you change, even if nobody asked.

## PR instructions

- Title format: [<JIRA_TICKET_ID>] <Title>
- Always run `npm run lint` and `npm test` before committing.
