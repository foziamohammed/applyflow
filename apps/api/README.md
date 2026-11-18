# ApplyFlow API

## Database Setup

1. Set the `DATABASE_URL` environment variable in `.env`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/applyflow"
   ```
2. Run the initial migration:
   ```bash
   pnpm db:migrate
   ```
3. The Prisma client is automatically regenerated on `pnpm install` via the `postinstall` script.
