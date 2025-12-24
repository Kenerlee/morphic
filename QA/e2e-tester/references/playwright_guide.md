# Playwright E2E Testing Reference

## Test Case JSON Format

Define test cases in JSON format for `run_test.py`:

```json
[
  {
    "name": "Login Form Test",
    "type": "fill",
    "selector": "#username",
    "value": "testuser"
  },
  {
    "name": "Submit Button",
    "type": "click",
    "selector": "button[type='submit']"
  },
  {
    "name": "Dashboard Visible",
    "type": "visible",
    "selector": ".dashboard"
  }
]
```

## Test Types

| Type | Required Fields | Description |
|------|----------------|-------------|
| `load` | none | Verify page loads with title |
| `click` | `selector` | Click an element |
| `fill` | `selector`, `value` | Fill input field |
| `visible` | `selector` | Check element is visible |
| `text` | `selector`, `expected` | Check text content |
| `url` | `expected` | Check URL contains string |
| `custom` | `code` | Execute custom Python code |

## Selectors Reference

### CSS Selectors
```python
page.click('button')                    # Tag name
page.click('#submit')                   # ID
page.click('.btn-primary')              # Class
page.click('[data-testid="login"]')     # Attribute
page.click('form button.submit')        # Nested
```

### XPath
```python
page.click('//button[@type="submit"]')
page.click('//div[contains(@class, "modal")]')
```

### Text-based
```python
page.click('text=Sign In')
page.click('button:has-text("Submit")')
```

## Common Actions

### Wait Strategies
```python
page.wait_for_selector('#element')
page.wait_for_load_state('networkidle')
page.wait_for_url('**/dashboard')
page.wait_for_timeout(1000)  # Use sparingly
```

### Form Interactions
```python
page.fill('#email', 'test@test.com')
page.select_option('select#country', 'US')
page.check('#agree')
page.uncheck('#newsletter')
```

### Assertions
```python
from playwright.sync_api import expect

expect(page.locator('#title')).to_be_visible()
expect(page.locator('#count')).to_have_text('5')
expect(page).to_have_url('**/success')
```

## PRD to Test Case Mapping

When converting PRD to test cases:

1. **User Story** → Test scenario
2. **Acceptance Criteria** → Assertions
3. **User Actions** → Playwright commands
4. **Expected Results** → Verify conditions

### Example PRD → Tests

**PRD**: "User can log in with valid credentials"

```json
[
  {"name": "Navigate to Login", "type": "load"},
  {"name": "Enter Username", "type": "fill", "selector": "#username", "value": "validuser"},
  {"name": "Enter Password", "type": "fill", "selector": "#password", "value": "validpass"},
  {"name": "Click Login", "type": "click", "selector": "#login-btn"},
  {"name": "Verify Dashboard", "type": "url", "expected": "/dashboard"}
]
```
