# Heading 1 - The Main Title

This is a paragraph with **bold text**, *italic text*, and ***bold italic*** together. Here's some ~~strikethrough~~ text too.

## Heading 2 - Section Header

Regular body text with a [link to somewhere](https://example.com) and some `inline code` mixed in. You can also do **bold with** `code` **inside** it.

### Heading 3 - Subsection

Here's a blockquote for emphasis:

> "The best way to predict the future is to invent it." — Alan Kay
>
> Blockquotes can span multiple lines and contain **bold** or *italic* text.

#### Heading 4 - Detail Level

Unordered list:

- First item
- Second item with **bold**
- Third item with `inline code`
  - Nested item one
  - Nested item two
    - Deeply nested
- Back to top level

##### Heading 5 - Minor Heading

Ordered list:

1. First step
2. Second step with *emphasis*
3. Third step
   1. Sub-step A
   2. Sub-step B
4. Final step

###### Heading 6 - Smallest Heading

Task list:

- [x] Completed task

- [x] Another done item

- [ ] Pending task with **important** note

- [ ] Future task

---

## Code Blocks

JavaScript example:

```javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log(`Fibonacci(10) = ${result}`);
```

TypeScript example:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  roles: ('admin' | 'editor' | 'viewer')[];
}

async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

CSS example:

```css
.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}
```

---

## Tables

| Feature | Status | Priority |
| --- | --- | --- |
| Editor | Complete | High |
| Chat | In Progress | High |
| Board | Partial | Medium |
| Drag & Drop | Not Started | Low |

---

## Images

Inline image reference: ![Placeholder](https://picsum.photos/600/300)

Another image with different dimensions:

![Landscape](https://picsum.photos/800/400)

Small inline icon-sized image: ![icon](https://picsum.photos/32/32)

---

## Mixed Content

hhh Here's a paragraph that mixes **bold**, *italic*, `code`, and [links](https://example.com) all together. It also has a footnote-style reference to something important.

> **Note:** This blockquote contains a code block reference: `const x = 42;` and a [link](https://example.com).

Final paragraph with all **the *nested* formatting** you could want, including some `really long inline code that might wrap on smaller screens` to test overflow behavior.
