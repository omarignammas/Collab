# Collab demo screenshot content

## Demo workspace

- Project: SalesFlow MVP
- Goal: Ship a usable sales-management pilot for five small businesses
- Team: Omar, Ayoub, Lina
- Deadline: Friday, 21 August

## Notes

### 1. Architecture decision

Topic: Product architecture

We need an MVP that is fast to ship but still clean enough to grow. Current direction: React with TypeScript for the frontend, Spring Boot for the API, and PostgreSQL for customer, pipeline, and activity data. Keep authentication and reporting behind clear service boundaries.

Decision needed: confirm the hosting combination before tomorrow's focus room.

### 2. Customer interview - Atlas Studio

Topic: Customer research

The sales manager currently tracks leads in spreadsheets and WhatsApp. Their biggest pain is not data entry; it is forgetting follow-ups after a conversation. The first dashboard should answer three questions immediately: Who needs a reply today? Which deals are blocked? What changed since yesterday?

Follow-up: Lina will validate the workflow with two more teams on Thursday.

### 3. Deployment issue

Topic: Engineering

Render started the Spring Boot application, but deployment failed because no public port was detected. The service must listen on `0.0.0.0` and use the `PORT` environment variable. Add an Actuator health endpoint and verify it before redeploying.

Owner: Omar

### 4. Focus-room recap

Topic: Sprint planning

We agreed to keep the first release intentionally small: lead pipeline, reminders, activity history, and a daily sales overview. Custom analytics and email automation move to the next release. Ayoub owns the responsive pipeline; Omar owns deployment; Lina owns pilot feedback.

Next review: Friday at 16:00.

### 5. Voice note

Topic: Product idea

The daily overview should feel like a briefing, not another dashboard. Show the three follow-ups that matter most, explain why each one is important, and let the user turn an insight into a task without changing pages.

Create tasks for the briefing card, priority explanation, and one-click follow-up action.

## Best benchmarking prompt

Hey Collab, use our SalesFlow project, architecture note, deployment issue, and latest focus-room recap. Compare three realistic deployment setups for our React, Spring Boot, and PostgreSQL MVP. Score them for setup speed, preview deployments, Java support, database fit, operational effort, and pilot cost. Recommend one option, explain the trade-offs, create the implementation tasks, and save the result as a report called "SalesFlow deployment decision". Include the sources you used.

## Suggested Collab response

I reviewed the SalesFlow workspace and compared three deployment paths.

| Option | Setup | Team workflow | Backend fit | Operations | Demo score |
| --- | --- | --- | --- | --- | --- |
| Netlify + Render | Fast | Strong previews | Strong for Spring Boot | Low | 8.7/10 |
| Vercel + Railway | Fast | Strong previews | Good | Low | 8.4/10 |
| Cloudflare Pages + Render | Moderate | Good | Strong for Spring Boot | Moderate | 8.1/10 |

Recommendation: use Netlify for the React frontend and Render for the Spring Boot API and PostgreSQL pilot. It matches the team's current setup and requires the least migration work. The main pilot risk is backend wake-up latency on free Render web services after inactivity, so test the first-request experience before inviting customers.

I created four tasks:

1. Omar - bind the API to `0.0.0.0:${PORT}` and verify `/actuator/health`.
2. Ayoub - configure the Netlify production build and deploy previews.
3. Lina - test login, pipeline updates, and reminders on mobile.
4. Omar - document environment variables and rollback steps.

Report saved: SalesFlow deployment decision

Sources: Architecture decision note, Deployment issue note, Focus-room recap, React documentation, Spring Boot documentation, Netlify React guide, Render web-service guide, GitHub Actions Maven guide.

## Follow-up conversation

User:

What are we behind on, and what should we finish today?

Collab:

You have two blockers before the pilot can move forward:

1. The backend health check is not yet verified on Render. Omar owns this and it blocks deployment validation.
2. The mobile pipeline review is still waiting for a production preview. Ayoub owns the preview; Lina owns validation after it is live.

Best next action: finish the Render port configuration, deploy the backend, then share the frontend preview with Lina. Estimated focused work: 70 minutes.

Sources: Deployment issue, Focus-room recap, SalesFlow deployment decision.

User:

Turn that into a 70-minute focus room and invite Ayoub and Lina.

Collab:

Focus room ready: "SalesFlow pilot unblock"

- 25 min - fix and verify backend deployment
- 5 min - break
- 25 min - connect and test the frontend preview
- 15 min - mobile acceptance check

Ayoub and Lina have been invited. I attached the deployment report and the four implementation tasks to the room.

## Resource links for the chat

- [React reference](https://react.dev/reference/react)
- [Spring Boot](https://spring.io/projects/spring-boot/)
- [Netlify React deployment guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/react/)
- [Render web services and port binding](https://render.com/docs/web-services#port-binding)
- [GitHub Actions with Maven](https://docs.github.com/en/actions/tutorials/build-and-test-code/java-with-maven)
- [PostgreSQL tutorial](https://www.postgresql.org/docs/current/tutorial.html)

## Screenshot sequence

1. Notes: show Architecture decision, Customer interview, and Deployment issue together.
2. Voice: capture the Product idea note and show the three extracted tasks.
3. Chat: show the full benchmarking prompt while Collab is researching.
4. Report: show the comparison table, recommendation, sources, and created tasks.
5. Follow-up: ask what the team is behind on and show the grounded answer.
6. Focus Room: show the generated 70-minute agenda with Ayoub and Lina invited.
7. Widget: show "2 blockers", "70 min plan", and the microphone input.
