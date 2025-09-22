# 🤝 Contributing to Calendar

Thank you for your interest in contributing! This guide will help you get started.

## 🚀 Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
    ```bash
    git clone https://github.com/YOUR_USERNAME/calendar.git
    cd calendar
    ```
3. **Install** dependencies:
    ```bash
    npm install
    ```
4. **Set up** the database:
    ```bash
    npm run db:migrate:latest
    ```
5. **Start** development server:
    ```bash
    npm run dev
    ```

## 📋 Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

**Branch naming:**

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code improvements
- `test/` - Adding tests

### 2. Make Changes

- Follow existing code style and patterns
- Write tests for new functionality
- Update documentation if needed
- Test your changes thoroughly

### 3. Commit Changes

```bash
git add .
git commit -m "type: brief description

More detailed explanation if needed"
```

**Commit types:**

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation
- `style:` - Code formatting
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### 4. Push and Create PR

```bash
git push origin your-branch-name
```

Then create a Pull Request on GitHub.

## 🎯 Areas to Contribute

### 🐛 Bug Fixes

- Check [Issues](https://github.com/wajeht/calendar/issues) for bugs
- Reproduce the issue locally
- Fix and add regression tests

### ✨ New Features

- **Calendar integrations** - Support for more calendar providers
- **UI improvements** - Better mobile experience, accessibility
- **Export features** - Export to different formats
- **Notification system** - Email/push notifications for events
- **Advanced filtering** - Search, tags, categories

### 📚 Documentation

- API documentation
- User guides
- Code comments
- README improvements

### 🧪 Testing

- Unit tests for services and utilities
- Integration tests for API routes
- Frontend component tests
- E2E testing scenarios

## 📝 Code Style

### Frontend (Vue.js)

```javascript
// Use Composition API with <script setup>
<script setup>
    import {(ref, computed)} from 'vue' const count = ref(0) const doubled = computed(() =>
    count.value * 2)
</script>;

// Use kebab-case for component files
// MyComponent.vue, not myComponent.vue

// Use camelCase for variables and functions
const userName = ref("");
const fetchUserData = () => {};
```

### Backend (Node.js)

```javascript
// Use ES modules
import express from "express";

// Use async/await
async function fetchCalendar(url) {
    try {
        const response = await fetch(url);
        return await response.text();
    } catch (error) {
        throw new CalendarFetchError(error.message);
    }
}

// Use dependency injection
export function createService(dependencies = {}) {
    const { logger, models } = dependencies;
    // ...
}
```

### General Guidelines

- **2 spaces** for indentation
- **Semicolons** required
- **Single quotes** for strings
- **Trailing commas** in objects/arrays
- **Descriptive variable names**
- **JSDoc comments** for functions

## 🧪 Testing

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

### Writing Tests

```javascript
// API tests (using Vitest + Supertest)
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp } from "../utils/test-utils.js";

describe("Calendar API", () => {
    let app;

    beforeEach(async () => {
        app = await createTestApp();
    });

    it("should create calendar", async () => {
        const response = await request(app)
            .post("/api/calendars")
            .send({
                name: "Test Calendar",
                url: "https://example.com/calendar.ics",
            })
            .expect(201);

        expect(response.body.success).toBe(true);
    });
});
```

## 🚨 Pull Request Guidelines

### Before Submitting

- [ ] Code follows project style
- [ ] Tests pass: `npm test`
- [ ] Code is formatted: `npm run format`
- [ ] No console.log statements left
- [ ] Database migrations work properly
- [ ] Documentation updated if needed

### PR Description Template

```markdown
## What does this PR do?

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Performance improvement

## Testing

- [ ] Tests added/updated
- [ ] Manual testing completed
- [ ] Database migrations tested

## Screenshots (if applicable)

Add screenshots for UI changes

## Additional Notes

Any additional context or considerations
```

## 🎯 Issue Reporting

### Bug Reports

Include:

- **Description** of the issue
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Environment** (OS, browser, Node version)
- **Screenshots** if applicable

### Feature Requests

Include:

- **Use case** description
- **Proposed solution**
- **Alternative solutions** considered
- **Additional context**

## 🏷️ Labels

- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `question` - Further information requested

## ⚡ Quick Contributing Tips

1. **Start small** - Fix typos, improve docs, add tests
2. **Ask questions** - Use GitHub Discussions or Issues
3. **Be patient** - Reviews take time
4. **Follow up** - Respond to feedback promptly
5. **Stay updated** - Pull latest changes regularly

## 📞 Getting Help

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and general discussion
- **Email** - For security issues or private matters

## 🎉 Recognition

Contributors will be:

- Listed in README acknowledgments
- Credited in release notes
- Invited to join the contributors team

Thank you for contributing! 🙏
