# Local Ralfhton Test Users

Database:

```bash
DATABASE_URL=postgresql://nr@localhost:5432/ralfhton
```

All seeded passwords are encrypted in Postgres with:

```sql
crypt('Testpass1', gen_salt('bf'))
```

## Credentials

Password for every account:

```text
Testpass1
```

| Role | Email |
| --- | --- |
| Super admin | `super@ralfhton.test` |
| Admin | `admin.hardware@ralfhton.test` |
| Admin | `admin.software@ralfhton.test` |
| Admin | `admin.bugs@ralfhton.test` |
| Admin | `admin.ops@ralfhton.test` |
| Admin | `admin.qa@ralfhton.test` |
| User | `alice.user@ralfhton.test` |
| User | `bob.user@ralfhton.test` |
| User | `carol.user@ralfhton.test` |
| User | `dan.user@ralfhton.test` |
| User | `eve.user@ralfhton.test` |

## Local Commands

```bash
createdb ralfhton
psql postgresql://nr@localhost:5432/ralfhton -f backend/db/DDL.sql
pnpm run dev
```

The backend runs on `http://localhost:6001`. Vite may use `5174` if `5173` is busy.
