First, unlearn this mental model

Most tutorials teach:

```js
prompt
↓
LLM
↓
tool call
↓
LLM
↓
answer
```

Then they call that an "agent".

It's technically an agent loop, but thinking this way will limit you badly when building any agent related systems.

A better mental model is:

```js
                 PRODUCT
                    │
                    ▼
             Agent Runtime
                    │
       ┌────────────┼────────────┐
       │            │            │
     State      Orchestration   Events
       │            │            │
       │            ▼            │
       │      Agent / Workflow   │
       │            │            │
       │      ┌─────┴─────┐      │
       │      │           │      │
       │    Models      Tools    │
       │      │           │      │
       └──────┴───────────┴──────┘
                    │
                  Output
```
