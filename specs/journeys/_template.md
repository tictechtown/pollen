---
journey: "<slug>"
title: "<Journey title>"
status: "draft" # draft | in-review | approved
owner: "<person/team>"
last_updated: "YYYY-MM-DD"
platforms: ["ios", "android"] # add/remove as needed
persona: "<who is this for?>"
---

# Journey: <Journey title>

## Summary
- **User goal:** <what the user is trying to achieve>
- **Primary success:** <what “done” looks like>
- **Key screens:** <screen A> → <screen B> → <screen C>
- **Time horizon:** <e.g. first 2 minutes / daily 30 seconds>

## Context
- **User state:** <new / recurring / signed in / anonymous>
- **Motivation:** <why now?>
- **Constraints:** <offline, low connectivity, small screen, one-handed, etc.>

## Preconditions
- <app installed / feeds exist / permissions granted / etc.>

## Entry Points (Triggers)
- <home icon>
- <notification>
- <deep link / universal link>
- <share sheet>

## Success Criteria
- <observable outcomes; include UX + data/state>

## Non-Goals
- <explicitly out of scope for this journey>

## Happy Path
| Step | User intent/action | System behavior | UI/screen | Data/state changes |
| --- | --- | --- | --- | --- |
| 1 | <does something> | <responds> | <screen> | <state> |
| 2 |  |  |  |  |  |

## Alternate Flows
### A1: <alternate scenario name>
| Step | User intent/action | System behavior | UI/screen | Notes |
| --- | --- | --- | --- | --- |
| 1 |  |  |  |  |

## Error Handling
- **No connectivity:** <what happens and how user recovers>
- **Empty state:** <no feeds / no articles / no results>
- **Timeout / bad feed:** <messaging + retry strategy>
- **Permission denied:** <messaging + path forward>

## UX Notes
- **Loading:** <skeletons/spinners, perceived performance>
- **Copy tone:** <short guidance, friendly, actionable>
- **Navigation:** <back behavior, deep link behavior>

## Accessibility
- **Dynamic type:** <how layout adapts>
- **Screen reader:** <labels, heading structure, focus order>
- **Contrast/tap targets:** <any special notes>

## Acceptance Criteria (Checklist)
- [ ] Happy path works end-to-end
- [ ] Alternate flows covered
- [ ] Error states are recoverable and understandable
- [ ] Accessibility basics validated

## Open Questions
- <unknowns to resolve>

## Related Links
- Designs: <Figma link>
- Product notes: <link>
- Tech spec: <link>
