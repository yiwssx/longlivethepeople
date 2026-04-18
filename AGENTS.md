# AGENTS.md

## Backend & Server-Side Directives

- **Architecture:** Enforce strict MVC separation. Controllers (`src/controllers`) handle request parsing, Services (`src/services`) contain business logic and database interactions, and Models (`src/models`) define data schemas.
- **Database/Persistence:** Database interactions must be encapsulated in service modules. Never perform raw database queries inside controllers.
- **Routing:** All new routes must be registered in `src/routes/index.route.js` and follow the established modular route pattern.
- **Error Handling:** Centralize error handling. Ensure all server-side errors are caught, logged (without leaking sensitive data), and returned with appropriate HTTP status codes.
- **Testing:** Mandatory unit and integration tests for all new service/controller logic in the `__tests__` directory. Run `npm test` after every change.
- **Dependencies:** Use `npm` only. Confirm before adding new backend dependencies. 
- **Security:** Sanitize and validate all incoming request bodies/params/queries in the controllers. Never expose stack traces or environment secrets in API responses.