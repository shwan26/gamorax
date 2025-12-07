## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

```
gamorax/
│
├── server.js
├── package.json
├── next.config.js
├── tsconfig.json
├── .env
│
├── prisma/
│   └── schema.prisma
│
├── public/
│   └── icons/
│       ├── lecturer.png
│       ├── student.png
│
└── src/
    ├── app/
    │   ├── layout.tsx              # Root layout for entire app
    │   ├── globals.css             # Global styles
    │   ├── page.tsx                # Home page
    │
    │   ├── (lecturer)/             # ROUTE GROUP (does NOT affect URL)
    │   │   ├── layout.tsx          # OPTIONAL: Lecturer-only layout
    │   │   ├── lecturer/           # Visible in the URL
    │   │   │   ├── login/
    │   │   │   │   └── page.tsx
    │   │   │   ├── register/
    │   │   │   │   └── page.tsx
    │   │   │   ├── dashboard/
    │   │   │   │   └── page.tsx
    │   │   │   ├── game/
    │   │   │   │   ├── create/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   └── [id]/
    │   │   │   │       └── page.tsx
    │   │   │   └── live/
    │   │   │       └── [pin]/
    │   │   │           └── page.tsx
    │
    │   ├── (student)/              # ROUTE GROUP (does NOT affect URL)
    │   │   ├── layout.tsx          # OPTIONAL: Student-only layout
    │   │   ├── student/            # Visible in URL
    │   │   │   ├── join/
    │   │   │   │   └── page.tsx
    │   │   │   ├── name/
    │   │   │   │   └── page.tsx
    │   │   │   ├── quiz/
    │   │   │   │   └── [pin]/
    │   │   │   │       └── page.tsx
    │   │   │   └── score/
    │   │   │       └── page.tsx
    │
    │   └── api/
    │       ├── auth/
    │       │   └── login/route.ts
    │       ├── game/
    │       │   ├── create/route.ts
    │       │   └── [id]/route.ts
    │       └── student/
    │           └── join/route.ts
    │
    ├── components/
    │   ├── Navbar.tsx
    │   ├── Button.tsx
    │   ├── Input.tsx
    │   └── Card.tsx
    │
    ├── lib/
    │   ├── db.ts
    │   ├── socket.ts
    │   ├── auth.ts
    │   └── utils.ts
    │
    ├── hooks/
    │   ├── useSocket.ts
    │   └── useQuizState.ts
    │
    └── styles/
        └── theme.css
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


